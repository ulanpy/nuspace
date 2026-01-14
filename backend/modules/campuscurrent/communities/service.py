from typing import List
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.schemas import Infra, MediaResponse, ShortUserResponse
from backend.common.utils import response_builder
from backend.core.database.models.community import (
    Community,
    CommunityAchievements,
    CommunityCategory,
    CommunityPhotoAlbum,
    CommunityPhotoAlbumType,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.core.database.models.media import Media, MediaFormat
from backend.modules.campuscurrent.communities import schemas
from backend.modules.campuscurrent.communities.repository import CommunityRepository
from backend.modules.campuscurrent.communities.utils import get_community_permissions
from backend.modules.campuscurrent.communities.google_photos_utils import fetch_google_photos_metadata
from backend.modules.google_bucket.utils import batch_delete_blobs


class CommunityService:
    def __init__(
        self,
        db_session: AsyncSession,
        repo: CommunityRepository | None = None,
    ):
        self.db_session = db_session
        self.repo = repo or CommunityRepository(db_session)

    async def create_community(
        self, infra: Infra, community_data: schemas.CommunityCreateRequest, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        community_data.head = (
            user[0].get("sub") if community_data.head == "me" else community_data.head
        )

        community: Community = await self.repo.add_community(community_data)
        await self.repo.upsert_search(infra.meilisearch_client, community)

        media_objs: List[Media] = await self.repo.list_media(
            community_ids=[community.id],
            media_formats=[MediaFormat.profile, MediaFormat.banner],
        )
        media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
            infra=infra, media_objects=media_objs, resources=[community]
        )

        return response_builder.build_schema(
            schemas.CommunityResponse,
            schemas.CommunityResponse.model_validate(community),
            head_user=ShortUserResponse.model_validate(community.head_user),
            media=media_results[0] if media_results else [],
            permissions=get_community_permissions(community, user),
        )

    async def update_community(
        self,
        infra: Infra,
        community: Community,
        new_data: schemas.CommunityUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.CommunityResponse:
        community = await self.repo.update_community(community=community, new_data=new_data)
        await self.repo.upsert_search(infra.meilisearch_client, community)

        return await self._build_community_response(community, infra, user)

    async def delete_community(
        self, infra: Infra, community: Community, community_id: int, user: tuple[dict, dict]
    ) -> bool:
        media_objects: List[Media] = await self.repo.list_media(community_ids=[community.id])
        await batch_delete_blobs(infra.storage_client, infra.config, media_objects)

        deleted_media = await self.repo.delete_media(media_objects)
        deleted_community = await self.repo.delete_community(community)

        if not deleted_media or not deleted_community:
            return False

        await self.repo.delete_from_search(infra.meilisearch_client, community_id)
        return True

    async def list_communities(
        self,
        infra: Infra,
        user: tuple[dict, dict],
        *,
        page: int,
        size: int,
        community_type: CommunityType | None,
        community_category: CommunityCategory | None,
        recruitment_status: CommunityRecruitmentStatus | None,
        head_sub: str | None,
        keyword: str | None,
    ) -> schemas.ListCommunity:
        head_sub = user[0].get("sub") if head_sub == "me" else head_sub

        communities, count, keyword_no_results = await self.repo.list_communities(
            page=page,
            size=size,
            community_type=community_type,
            community_category=community_category,
            recruitment_status=recruitment_status,
            head_sub=head_sub,
            keyword=keyword,
            meilisearch_client=infra.meilisearch_client,
        )

        if keyword_no_results:
            return schemas.ListCommunity(
                items=[],
                total_pages=1,
                total=0,
                page=page,
                size=size,
                has_next=False,
            )

        media_objs: List[Media] = await self.repo.list_media(
            community_ids=[community.id for community in communities],
            media_formats=[MediaFormat.profile, MediaFormat.banner],
        )
        media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
            infra=infra, media_objects=media_objs, resources=communities
        )

        community_responses: List[schemas.CommunityResponse] = [
            response_builder.build_schema(
                schemas.CommunityResponse,
                schemas.CommunityResponse.model_validate(community),
                media=media,
                permissions=get_community_permissions(community, user),
            )
            for community, media in zip(communities, media_results)
        ]

        total_pages: int = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListCommunity(
            items=community_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=page < total_pages,
        )

    async def get_community_response(
        self, infra: Infra, community: Community, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        return await self._build_community_response(community, infra, user)

    async def _build_community_response(
        self, community: Community, infra: Infra, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        # Ensure needed relations are loaded to avoid lazy-load in response building
        await self.repo.load_relations(community, ["head_user", "achievements"])

        media_objs: List[Media] = await self.repo.list_media(
            community_ids=[community.id],
            media_formats=[MediaFormat.profile, MediaFormat.banner],
        )
        media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
            infra=infra, media_objects=media_objs, resources=[community]
        )

        return response_builder.build_schema(
            schemas.CommunityResponse,
            schemas.CommunityResponse.model_validate(community),
            head_user=ShortUserResponse.model_validate(community.head_user),
            media=media_results[0] if media_results else [],
            permissions=get_community_permissions(community, user),
        )

    # Achievement operations
    async def create_achievement(
        self,
        community_id: int,
        achievement_data: schemas.AchievementCreateRequest,
        user: tuple[dict, dict],
    ) -> schemas.AchievementResponse:
        achievement_data.community_id = community_id
        achievement = await self.repo.create_achievement(achievement_data)
        return schemas.AchievementResponse.model_validate(achievement)

    async def list_achievements(
        self,
        community_id: int,
        size: int,
        page: int,
        user: tuple[dict, dict],
    ) -> schemas.ListAchievements:
        achievements, count = await self.repo.get_achievements(
            community_id=community_id, size=size, page=page
        )
        total_pages = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListAchievements(
            achievements=[
                schemas.AchievementResponse.model_validate(achievement)
                for achievement in achievements
            ],
            total_pages=total_pages,
        )

    async def update_achievement(
        self,
        community_id: int,
        achievement_id: int,
        achievement_data: schemas.AchievementUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.AchievementResponse:
        achievement = await self.repo.get_achievement(community_id, achievement_id)
        if achievement is None:
            return None
        achievement = await self.repo.update_achievement(
            achievement=achievement, achievement_data=achievement_data
        )
        return schemas.AchievementResponse.model_validate(achievement)

    async def delete_achievement(
        self,
        community_id: int,
        achievement_id: int,
        user: tuple[dict, dict],
    ) -> bool:
        achievement = await self.repo.get_achievement(community_id, achievement_id)
        if achievement is None:
            return False
        return await self.repo.delete_achievement(achievement)

    # Photo Album operations
    async def create_photo_album(
        self,
        community_id: int,
        album_data: schemas.PhotoAlbumCreateRequest,
        user: tuple[dict, dict],
    ) -> schemas.PhotoAlbumResponse:
        album_data.community_id = community_id
        
        # Create album first without metadata
        album_data_dict = album_data.model_dump()
        album = await self.repo.create_photo_album(album_data_dict)
        
        # Try to fetch metadata, but don't block on failure
        try:
            metadata = await fetch_google_photos_metadata(album_data.album_url)
            
            # Parse date from scraped metadata
            album_date = None
            if metadata.get("date_str"):
                try:
                    # Try YYYY-MM-DD format first (from Google Photos title parsing)
                    album_date = datetime.strptime(metadata["date_str"], "%Y-%m-%d").date()
                except:
                    try:
                        # Try ISO format (from og:release_date, article:published_time)
                        album_date = datetime.fromisoformat(metadata["date_str"].replace("Z", "+00:00")).date()
                    except:
                        try:
                            # Fallback to "Jan 5, 2026" or "December 5, 2026" format
                            album_date = datetime.strptime(metadata["date_str"], "%b %d, %Y").date()
                        except:
                            try:
                                album_date = datetime.strptime(metadata["date_str"], "%B %d, %Y").date()
                            except:
                                pass
            
            # Update album with metadata if fetched successfully
            update_data = {
                "album_title": metadata.get("title"),
                "album_thumbnail_url": metadata.get("thumbnail_url"),
                "album_date": album_date,
            }
            album = await self.repo.update_photo_album(album=album, album_data=update_data)
        except Exception as e:
            # Log the error but return the album anyway
            print(f"Warning: Could not fetch metadata for album {album.id}: {e}")
        
        return schemas.PhotoAlbumResponse.model_validate(album)

    async def list_photo_albums(
        self,
        community_id: int,
        size: int,
        page: int,
        album_type: CommunityPhotoAlbumType | None,
        user: tuple[dict, dict],
    ) -> schemas.ListPhotoAlbums:
        albums, count = await self.repo.get_photo_albums(
            community_id=community_id, size=size, page=page, album_type=album_type
        )
        total_pages = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListPhotoAlbums(
            albums=[
                schemas.PhotoAlbumResponse.model_validate(album)
                for album in albums
            ],
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=page < total_pages,
        )

    async def update_photo_album(
        self,
        community_id: int,
        album_id: int,
        album_data: schemas.PhotoAlbumUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.PhotoAlbumResponse | None:
        album = await self.repo.get_photo_album(community_id, album_id)
        if album is None:
            return None
        
        album_data_dict = album_data.model_dump(exclude_unset=True)
        
        # If URL changed, fetch new metadata (always update date from metadata)
        if album_data.album_url and album_data.album_url != album.album_url:
            metadata = await fetch_google_photos_metadata(album_data.album_url)
            
            album_data_dict["album_title"] = metadata.get("title")
            album_data_dict["album_thumbnail_url"] = metadata.get("thumbnail_url")
            
            # Always update date from scraped metadata
            if metadata.get("date_str"):
                try:
                    album_data_dict["album_date"] = datetime.strptime(metadata["date_str"], "%b %d, %Y").date()
                except:
                    album_data_dict["album_date"] = None
            else:
                album_data_dict["album_date"] = None
        
        album = await self.repo.update_photo_album(album=album, album_data=album_data_dict)
        return schemas.PhotoAlbumResponse.model_validate(album)

    async def delete_photo_album(
        self,
        community_id: int,
        album_id: int,
        user: tuple[dict, dict],
    ) -> bool:
        album = await self.repo.get_photo_album(community_id, album_id)
        if album is None:
            return False
        return await self.repo.delete_photo_album(album)

    async def list_all_photo_albums(
        self,
        size: int,
        page: int,
        album_type: CommunityPhotoAlbumType | None,
    ) -> schemas.ListPhotoAlbums:
        """List photo albums from all communities."""
        albums, count = await self.repo.get_all_photo_albums(
            size=size, page=page, album_type=album_type
        )
        total_pages = response_builder.calculate_pages(count=count, size=size)
        
        album_responses = []
        for album in albums:
            album_response = schemas.PhotoAlbumResponse.model_validate(album)
            album_response.community_name = album.community.name if album.community else None
            album_responses.append(album_response)
        
        return schemas.ListPhotoAlbums(
            albums=album_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=page < total_pages,
        )

    async def refresh_photo_album_metadata(
        self,
        community_id: int,
        album_id: int,
        user: tuple[dict, dict],
    ) -> schemas.PhotoAlbumResponse | None:
        """Refresh album metadata from Google Photos."""
        album = await self.repo.get_photo_album(community_id, album_id)
        if album is None:
            return None
        
        # Fetch fresh metadata
        metadata = await fetch_google_photos_metadata(album.album_url)
        
        album_date = None
        if metadata.get("date_str"):
            try:
                # Try YYYY-MM-DD format first (from Google Photos title parsing)
                album_date = datetime.strptime(metadata["date_str"], "%Y-%m-%d").date()
            except:
                try:
                    # Try ISO format (from og:release_date, article:published_time)
                    album_date = datetime.fromisoformat(metadata["date_str"].replace("Z", "+00:00")).date()
                except:
                    try:
                        # Fallback to "Jan 5, 2026" or "December 5, 2026" format
                        album_date = datetime.strptime(metadata["date_str"], "%b %d, %Y").date()
                    except:
                        try:
                            album_date = datetime.strptime(metadata["date_str"], "%B %d, %Y").date()
                        except:
                            pass
        
        # Update metadata fields
        update_data = {
            "album_title": metadata.get("title"),
            "album_thumbnail_url": metadata.get("thumbnail_url"),
            "album_date": album_date,
        }
        
        album = await self.repo.update_photo_album(album=album, album_data=update_data)
        return schemas.PhotoAlbumResponse.model_validate(album)

