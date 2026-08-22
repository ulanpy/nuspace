import asyncio
import logging
import re
from dataclasses import dataclass
from typing import Dict, Sequence

from backend.common.utils import meilisearch as meilisearch_utils
from backend.modules.courses.registrar.clients.registrar_client import RegistrarClient
from backend.modules.courses.registrar.parsers.registrar_parser import (
    parse_personal_schedule_pdf,
    parse_schedule,
)
from backend.modules.courses.registrar.schedule_gcs import (
    SCHEDULE_GCS_META_OBJECT,
    SCHEDULE_GCS_OBJECT,
    download_schedule_meta,
    load_local_schedule_meta_fixture,
)
from backend.modules.courses.registrar.schedule_sync import (
    SCHEDULE_INDEX_UID,
    sync_schedule_catalog,
)
from backend.modules.courses.registrar.schemas import (
    CatalogCourse,
    CourseScheduleEntry,
    CourseSearchRequest,
    CourseSearchResponse,
    ScheduleResponse,
    SemesterOption,
)
from fastapi import HTTPException
from google.cloud import storage
from httpx import AsyncClient
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_CATALOG_SYNC_LOCK_TTL_SECONDS = 120
_CATALOG_SYNC_PROCESSED_TTL_SECONDS = 86_400

# Planner search renders a course summary, never its sections. Asking Meilisearch
# for the complete document made each five-item response about 17 KB because of
# nested section data. Keep that payload out of the hot search path; callers
# that need sections use _schedule_sections_from_index without this projection.
_COURSE_SUMMARY_ATTRIBUTES = (
    "course_code",
    "title",
    "term",
    "term_id",
    "credits_us",
    "school",
    "level",
    "prerequisite",
    "corequisite",
    "antirequisite",
    "priority_1",
    "priority_2",
    "priority_3",
    "priority_4",
)


@dataclass
class CoursePriorityRecord:
    prerequisite: str | None = None
    corequisite: str | None = None
    antirequisite: str | None = None
    priority_1: str | None = None
    priority_2: str | None = None
    priority_3: str | None = None
    priority_4: str | None = None


@dataclass(frozen=True)
class ScheduleCatalogFinalizeResult:
    skipped: bool
    schedule_docs: int = 0
    reason: str | None = None


class ScheduleCatalogFinalizeError(Exception):
    """Sync failed after claim; caller should signal Pub/Sub retry (HTTP 5xx)."""


class RegistrarService:
    """
    Service for synchronizing student schedules from NU registrar system.

    Provides high-level interface for fetching and processing schedule data.
    Uses dependency injection for client factory to enable testing and
    different client implementations.

    Args:
        client_factory: Factory function for creating registrar clients (default: RegistrarClient)
    """

    def __init__(
        self,
        client_factory=RegistrarClient,
        *,
        meilisearch_client: AsyncClient | None = None,
        redis: Redis | None = None,
        storage_client: storage.Client | None = None,
        bucket_name: str | None = None,
        schedule_gcs_object: str = SCHEDULE_GCS_OBJECT,
        active_semester: SemesterOption | None = None,
    ) -> None:
        self.client_factory = client_factory
        self.meilisearch_client = meilisearch_client
        self.redis = redis
        self.storage_client = storage_client
        self.bucket_name = bucket_name
        self.schedule_gcs_object = schedule_gcs_object
        self.schedule_index_uid = SCHEDULE_INDEX_UID
        self.active_semester = active_semester

    async def sync_schedule(self, username: str, password: str) -> ScheduleResponse:
        async with self.client_factory() as client:
            raw = await client.fetch_schedule(username=username, password=password)
        schedule: ScheduleResponse = parse_schedule(raw)
        return schedule

    def parse_schedule_pdf(self, pdf_file: bytes) -> ScheduleResponse:
        return parse_personal_schedule_pdf(pdf_file)

    async def get_active_semester(self) -> SemesterOption:
        """Return the semester read from the schedule catalog's GCS metadata."""
        if self.active_semester is None:
            raise HTTPException(status_code=503, detail="Active registrar semester is unavailable")
        return self.active_semester

    async def load_active_semester(
        self,
        *,
        prefer_local_fixture: bool = False,
    ) -> SemesterOption | None:
        """Load the active semester from the catalog's ``meta.json`` sidecar."""
        if prefer_local_fixture:
            meta = load_local_schedule_meta_fixture()
        elif not self.storage_client or not self.bucket_name:
            logger.error("Cannot load active semester: GCS client or bucket is unavailable")
            return None
        else:
            meta = await asyncio.to_thread(
                download_schedule_meta,
                self.storage_client,
                self.bucket_name,
                object_name=SCHEDULE_GCS_META_OBJECT,
            )
        if not meta:
            return None

        term_id = meta.get("term_id")
        term_label = meta.get("term_label")
        if not term_id or not term_label:
            logger.error("Schedule meta.json has no term_id or term_label")
            return None
        return SemesterOption(label=str(term_label), value=str(term_id))

    async def search_courses(self, request: CourseSearchRequest) -> CourseSearchResponse:
        keyword = request.course_code or ""
        active_term = await self.get_active_semester()
        items, has_next = await self._search_schedule_catalog(
            keyword=keyword,
            term=request.term,
            page=request.page,
            size=request.size,
            strict_code_match=False,
            term_label_fallback=active_term.label,
        )

        if not items:
            return CourseSearchResponse(items=[], cursor=None)

        cursor = request.page + 1 if has_next else None
        return CourseSearchResponse(items=items, cursor=cursor)

    async def find_catalog_course(
        self, *, course_code: str, term_value: str
    ) -> CatalogCourse | None:
        """Return the exact offering for one code in the active schedule catalog."""
        if not course_code or not self.meilisearch_client:
            return None

        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=self.schedule_index_uid,
            keyword=course_code,
            page=1,
            size=20,
        )
        for hit in result.get("hits", []):
            if not self._matches_term(hit, term_value):
                continue
            if not self.course_codes_match(hit.get("course_code"), course_code):
                continue
            catalog_id = hit.get("id")
            if not catalog_id:
                continue
            credits_ects = hit.get("credits_ects")
            try:
                parsed_credits_ects = (
                    float(credits_ects) if credits_ects not in (None, "") else None
                )
            except (TypeError, ValueError):
                parsed_credits_ects = None
            return CatalogCourse(
                catalog_id=str(catalog_id),
                course_code=hit.get("course_code") or course_code,
                term=hit.get("term") or "",
                term_id=str(hit.get("term_id") or term_value),
                title=hit.get("title"),
                school=hit.get("school"),
                level=hit.get("level"),
                credits_ects=parsed_credits_ects,
                prerequisite=hit.get("prerequisite"),
                corequisite=hit.get("corequisite"),
                antirequisite=hit.get("antirequisite"),
            )
        return None

    async def get_course_schedule(
        self,
        *,
        course_code: str,
        term: str,
    ) -> list[CourseScheduleEntry]:
        sections = await self._schedule_sections_from_index(
            course_code=course_code,
            term=term,
        )
        if sections:
            return sections
        raise HTTPException(status_code=502, detail="schedule_unavailable")

    async def _search_schedule_catalog(
        self,
        *,
        keyword: str,
        term: str | None,
        page: int,
        size: int,
        strict_code_match: bool,
        term_label_fallback: str | None = None,
    ) -> tuple[list[dict], bool]:
        page = max(page, 1)
        size = max(size, 1)
        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=self.schedule_index_uid,
            keyword=keyword or "",
            page=page,
            size=size,
            attributes_to_retrieve=_COURSE_SUMMARY_ATTRIBUTES,
        )

        hits = result.get("hits", [])
        summaries: list[dict] = []
        for hit in hits:
            if not self._matches_term(hit, term):
                continue
            code = hit.get("course_code") or ""
            if not code:
                continue
            if strict_code_match and keyword and not self.course_codes_match(code, keyword):
                continue
            summaries.append(
                self._build_course_summary_from_hit(hit, term_label_fallback=term_label_fallback)
            )

        total_hits = result.get("estimatedTotalHits")
        has_next = False
        if isinstance(total_hits, int):
            has_next = total_hits > page * size
        elif len(hits) == size:
            has_next = True

        return summaries, has_next

    async def fetch_course_priorities(
        self,
        course_codes: Sequence[str],
    ) -> Dict[str, CoursePriorityRecord]:
        """Fetch priority metadata from the merged schedule index."""
        if not course_codes or not self.meilisearch_client:
            return {}

        results: Dict[str, CoursePriorityRecord] = {}
        sem = asyncio.Semaphore(5)

        async def _fetch_one(raw_code: str, normalized: str):
            async with sem:
                record = await self._fetch_priority_record(raw_code, normalized)
                return normalized, record

        fetch_results = await asyncio.gather(
            *(_fetch_one(code, self.normalize_course_code(code)) for code in course_codes)
        )
        for normalized, record in fetch_results:
            if normalized and record:
                results[normalized] = record

        return results

    async def _fetch_priority_record(
        self,
        course_code: str | None,
        normalized: str,
    ) -> CoursePriorityRecord | None:
        if not course_code or not self.meilisearch_client:
            return None

        keyword = course_code.strip()
        try:
            result = await meilisearch_utils.get(
                client=self.meilisearch_client,
                storage_name=self.schedule_index_uid,
                keyword=keyword or course_code,
                page=1,
                size=3,
            )
        except Exception:
            return None

        hits = result.get("hits", [])
        match = next(
            (
                hit
                for hit in hits
                if self.course_codes_match(hit.get("course_code"), course_code)
                or self.course_codes_match(hit.get("course_code"), normalized)
                or self.course_codes_match(hit.get("abbr"), course_code)
            ),
            None,
        )

        if not match:
            return None

        return CoursePriorityRecord(
            prerequisite=match.get("prerequisite"),
            corequisite=match.get("corequisite"),
            antirequisite=match.get("antirequisite"),
            priority_1=match.get("priority_1"),
            priority_2=match.get("priority_2"),
            priority_3=match.get("priority_3"),
            priority_4=match.get("priority_4"),
        )

    async def _schedule_sections_from_index(
        self,
        *,
        course_code: str,
        term: str | None,
    ) -> list[CourseScheduleEntry]:
        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=self.schedule_index_uid,
            keyword=course_code or "",
            page=1,
            size=5,
        )
        hits = result.get("hits", [])
        if not hits:
            result = await meilisearch_utils.get(
                client=self.meilisearch_client,
                storage_name=self.schedule_index_uid,
                keyword=course_code or "",
                page=1,
                size=5,
            )
            hits = result.get("hits", [])

        for hit in hits:
            if not self._matches_term(hit, term):
                continue
            code = hit.get("course_code") or ""
            if course_code and not self.course_codes_match(code, course_code):
                continue
            return self._map_sections_from_hit(hit)
        return []

    def _map_sections_from_hit(self, hit: dict) -> list[CourseScheduleEntry]:
        sections = hit.get("sections", []) or []
        parsed: list[CourseScheduleEntry] = []
        for sec in sections:
            parsed.append(
                CourseScheduleEntry(
                    section_code=sec.get("section_code", ""),
                    days=sec.get("days", ""),
                    times=sec.get("time", ""),
                    room=sec.get("room"),
                    faculty=sec.get("faculty"),
                    capacity=_coerce_int(sec.get("capacity")),
                    enrollment=_coerce_int(sec.get("enrollment")),
                    instance_id=None,
                )
            )
        return parsed

    def _build_course_summary_from_hit(
        self,
        hit: dict,
        *,
        term_label_fallback: str | None = None,
    ) -> dict:
        course_code = hit.get("course_code", "") or ""
        credits = hit.get("credits_us")
        credits_str = ""
        if credits not in (None, ""):
            credits_str = str(credits)
        term_label = (hit.get("term") or "").strip()
        if not term_label or term_label.lower() == "unknown term":
            term_label = term_label_fallback or ""
        return {
            "catalog_id": str(hit.get("id") or ""),
            "course_code": course_code,
            "level": hit.get("level") or None,
            "school": hit.get("school") or None,
            "title": hit.get("title") or "",
            "credits": credits_str,
            "term": term_label or "",
            "priority_1": hit.get("priority_1"),
            "priority_2": hit.get("priority_2"),
            "priority_3": hit.get("priority_3"),
            "priority_4": hit.get("priority_4"),
            "pre_req": (hit.get("prerequisite") or "").strip(),
            "co_req": (hit.get("corequisite") or "").strip(),
            "anti_req": (hit.get("antirequisite") or "").strip(),
        }

    @staticmethod
    def _matches_term(hit: dict, term: str | None) -> bool:
        if not term:
            return True
        term_str = str(term).strip()
        hit_term_id = str(hit.get("term_id") or "").strip()
        hit_term_label = str(hit.get("term") or "").strip()
        return term_str == hit_term_id or term_str == hit_term_label

    @staticmethod
    def normalize_course_code(value: str | None) -> str:
        if not value:
            return ""
        normalized = re.sub(r"\s+", " ", value).strip().upper()
        normalized = re.sub(r"\s*/\s*", "/", normalized)
        normalized = normalized.replace("-", "").replace(" ", "")
        return normalized

    @classmethod
    def course_codes_match(cls, left: str | None, right: str | None) -> bool:
        """
        Match course codes including registrar cross-lists.

        Examples:
        - WCS 210 == WCS 210
        - WCS 210 ~= WCS 210/ASC 200
        - ASC 200 ~= WCS 210/ASC 200
        - WCS 210/ASC 200 ~= ASC 200/WCS 210
        """
        a = cls.normalize_course_code(left)
        b = cls.normalize_course_code(right)
        if not a or not b:
            return False
        if a == b:
            return True
        a_parts = {part for part in a.split("/") if part}
        b_parts = {part for part in b.split("/") if part}
        return bool(a_parts & b_parts)

    async def on_catalog_object_finalize(
        self,
        *,
        generation: str | None,
        md5_hash: str | None = None,
        etag: str | None = None,
    ) -> ScheduleCatalogFinalizeResult:
        """GCS catalog finalize: Redis dedupe/claim, then reindex Meilisearch."""
        token = self._catalog_sync_token(
            generation=generation,
            md5_hash=md5_hash,
            etag=etag,
        )
        if not await self._try_acquire_catalog_sync(token):
            return ScheduleCatalogFinalizeResult(
                skipped=True,
                reason="duplicate_or_in_flight",
            )

        try:
            if (
                self.meilisearch_client is None
                or self.storage_client is None
                or not self.bucket_name
            ):
                raise ScheduleCatalogFinalizeError(
                    "registrar service missing meilisearch/storage for catalog sync"
                )
            count = await sync_schedule_catalog(
                self.meilisearch_client,
                storage_client=self.storage_client,
                bucket_name=self.bucket_name,
                gcs_object=self.schedule_gcs_object,
                prefer_local_fixture=False,
            )
            await self._mark_catalog_sync_done(token)
            logger.info(
                "Schedule catalog reindexed from GCS finalize (%s docs, gen=%s)",
                count,
                token,
            )
            return ScheduleCatalogFinalizeResult(skipped=False, schedule_docs=count)
        except ScheduleCatalogFinalizeError:
            await self._release_catalog_sync_lock(token)
            raise
        except Exception as exc:
            await self._release_catalog_sync_lock(token)
            logger.exception("Failed to sync schedule catalog from GCS finalize")
            raise ScheduleCatalogFinalizeError("schedule_catalog_sync_failed") from exc

    @staticmethod
    def _catalog_sync_token(
        *,
        generation: str | None,
        md5_hash: str | None = None,
        etag: str | None = None,
    ) -> str:
        for candidate in (generation, md5_hash, etag):
            if candidate:
                return candidate
        return "unknown"

    @staticmethod
    def _catalog_processed_key(token: str) -> str:
        return f"schedule_catalog:processed:{token}"

    @staticmethod
    def _catalog_lock_key(token: str) -> str:
        return f"schedule_catalog:lock:{token}"

    async def _try_acquire_catalog_sync(self, token: str) -> bool:
        if self.redis is None:
            raise ScheduleCatalogFinalizeError("registrar service missing redis")

        processed_key = self._catalog_processed_key(token)
        lock_key = self._catalog_lock_key(token)

        if await self.redis.exists(processed_key):
            logger.info("Schedule catalog sync skip: already processed (%s)", token)
            return False

        acquired = await self.redis.set(lock_key, "1", nx=True, ex=_CATALOG_SYNC_LOCK_TTL_SECONDS)
        if not acquired:
            logger.info("Schedule catalog sync skip: lock held (%s)", token)
            return False

        if await self.redis.exists(processed_key):
            await self.redis.delete(lock_key)
            logger.info("Schedule catalog sync skip: processed during claim (%s)", token)
            return False

        return True

    async def _mark_catalog_sync_done(self, token: str) -> None:
        if self.redis is None:
            return
        processed_key = self._catalog_processed_key(token)
        lock_key = self._catalog_lock_key(token)
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.set(processed_key, "1", ex=_CATALOG_SYNC_PROCESSED_TTL_SECONDS)
            pipe.delete(lock_key)
            await pipe.execute()

    async def _release_catalog_sync_lock(self, token: str) -> None:
        if self.redis is None:
            return
        await self.redis.delete(self._catalog_lock_key(token))


def _coerce_int(val):
    try:
        if val in (None, ""):
            return None
        return int(val)
    except (TypeError, ValueError):
        return None
