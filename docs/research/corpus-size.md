# How many documents will actually be indexed?

Research for [ulanpy/nuspace#401](https://github.com/ulanpy/nuspace/issues/401) — *What retrieval architecture stands behind the root search bar*.

Date of research: 2026-10-14. All Telegram counts in this document were produced by fetching the public preview on that date.

---

> ## ⚠️ SUPERSEDED — the TL;DR below is wrong, and understates the corpus by roughly 50×
>
> The three channels measured here are **not the 100k-message channels**. The figure that matters came later, from a channel walk nobody had run: **one channel holds ~100,000 messages and is roughly five years old.** Its last-year export is 27 MB, which at ~547 bytes per message is **~49,000 messages per channel per year**.
>
> **Corrected planning figures** (see the resolution on #401):
>
> | | messages | vectors @768 |
> |---|---|---|
> | 7 channels, **unbounded** | ~700,000 | 2.16 GB — does not fit this box |
> | 7 channels, **12-month window** | **~343,000** | **1.06 GB** |
> | HNSW build memory available on a 4 GB box | ~300,000 | ~1.0 GB |
>
> **Every *measurement* below remains correct.** The three channel walks, the registrar catalogue, the 4,217 grade-report rows, the `users` enrolment ceiling — all verified, all still true. What is wrong is the conclusion drawn from them: they describe a Telegram corpus three orders of magnitude smaller than the real one. The `pages` / `events` / `opportunities` counts were never the residual risk; **the Telegram corpus was, and it was never measured in the first place.**
>
> The lesson for the next sizing exercise: **measure the largest source first.** Three known channels were assumed to be representative of the set.

---

## TL;DR (superseded — retained for the record)

> ## The corpus is **~6,700 documents today**, and the ceiling with every current source is **well under 50,000**.
> ### Confidence: **high** on the 6,700 figure (measured, traceable to exact fetches). **Low** on the residual, because three Postgres tables were never counted.

The map's "10k–100k documents" figure is **wrong at the top end by roughly an order of magnitude today**, and the low end is only reached if you count rows that are not documents.

| | documents |
|---|---|
| **MEASURED** — see [§1](#1-measured-telegram), [§2](#2-measured-registrar-and-grade-data) | **6,656** |
| **UNKNOWN** — `pages`, `events`, `opportunities` (see [§3](#3-unknown-needs-a-human-with-prod-sql)) | 0 – ~10,000 |
| **Headline, today** | **7,000 – 15,000** |
| **Ceiling, current sources, 10 years out** | **~50,000** |

Every channel walk in this document **reached the true beginning of its channel**. No number below stopped at a cap. Where a number is a floor rather than an exact count, it is marked as such.

**This document does not recommend a retrieval architecture.** It establishes the number. The decision is yours.

---

## 1. MEASURED: Telegram

### 1.1 Method

`https://t.me/s/<username>` serves the most recent ~20 posts as HTML. `?before=<oldest_id>` walks backwards. The repo already depends on this endpoint — `backend/modules/announcements/service.py:13-14` scrapes the same URL for the latest post id — so the pattern is proven in-house.

Every fetch parses `data-post="<chat>/<id>"` and `<time datetime="...">`, then re-fetches with `?before=` the oldest id seen, until either:

- **`BEGINNING`** — a `?before=` fetch returns no post older than the cursor (the cursor was already the oldest). This is the true start of the channel.
- **`CAP`** — the walk hit the page guard rail. The number would be a floor.

`verdict` in the results below is that termination flag. All three reads `BEGINNING`.

### 1.2 Results

| Username | Display name | Type | **Posts** | Oldest id | Newest id | Id span | Gaps | Earliest post | Newest post | Pages fetched | Terminated |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `@nuspacechannel` | Nuspace channel | broadcast channel | **193** | 1 | 254 | 254 | 61 | 2025-08-10 | 2026-09-22 | 13 | **BEGINNING** |
| `@nu_edu_kz` | nuedukz | broadcast channel | **913** | 1 | 1158 | 1158 | 245 | 2024-06-26 | 2026-05-12 | 55 | **BEGINNING** |
| `@nustudentevents` | Department of Student Services (DSS) | broadcast channel | **534** | 1 | 629 | 629 | 95 | 2020-01-16 | 2024-11-26 | 31 | **BEGINNING** |
| | | | **1,640** | | | | 401 | | | | |

Notes on the table, none of which are speculation:

- **`@nuspacechannel` reproduces the known 193 exactly**, ids 1–254, same as the figure already on the map. That is the control: the walker was validated against a known number before being pointed at anything new.
- **`Gaps` are id values with no post** (e.g. `nuspacechannel` occupies 193 of ids 1–254). Telegram deletes are silent and the public preview never showed these, so **gaps are permanently uncountable from the outside**. They are deleted posts and/or service messages. Do not read the gap count as recoverable volume.
- **All three are broadcast channels**, not groups. Each page rendered the `tgme_channel_history` container with posts only — no participant messages. Under the [resolution on #400](https://github.com/ulanpy/nuspace/issues/400) ("Forward indexing via the existing bot as channel admin"), **all three are forward-indexable via the Bot API**, because the Bot FAQ requires only membership, not admin.
- **`@nu_edu_kz` looks dormant.** Its newest post is 2026-05-12, five months before this research. `@nustudentevents` looks more dormant still — newest post 2024-11-26, ~22 months cold. `@nuspacechannel` is the only one currently posting. Verified by re-fetching the live previews and comparing the top-of-page id and date to the walk's result; they agree exactly in all three cases.

### 1.3 Where these three came from — cited vs inferred

This distinction matters, because two of the three are channels nobody in the project has ever named.

| Channel | How it was found | Cited? |
|---|---|---|
| `@nuspacechannel` | Linked from the deployed `nuspace.kz` frontend bundle (`https://nuspace.kz/assets/index-en5pyttt.js`). It is the **only** channel in that bundle — the other 16 `t.me/` strings there are personal profiles (`@kamikadze24`, `@pcs_nu`, …). | **Cited.** The repo already scrapes it. |
| `@nu_edu_kz` | Linked from the official university site. It is the **only** `t.me/` link on NU's own student-clubs page (`https://nu.edu.kz/students/student-organization-clubs/student-clubs/`). | **Cited** via `nu.edu.kz` and NU's official announcement of the channel's launch ([Facebook, nuedukz](https://www.facebook.com/nuedukz/posts/en-we-are-delighted-to-announce-the-launch-of-the-official-telegram-channel-of-n/1076741567445368)). |
| `@nustudentevents` | Found only in the bio of NU's official student-clubs Instagram account, `@nustudentclubs` ([instagram.com/nustudentclubs](https://www.instagram.com/nustudentclubs/)): *"Admins - MMC team https://t.me/nustudentevents"*. | **Cited**, but indirectly — no `nu.edu.kz` page links it. |
| 156 registered student clubs | NU's own Instagram bio for `@nustudentclubs` states *"156 registered student clubs. More than 800 events every year."* | **Cited** (Instagram, official account). |

**What I could not find, stated plainly: not one of NU's 156 registered student clubs has a discoverable Telegram channel.** The official student-clubs page on `nu.edu.kz` carries 119 distinct `@nu.edu.kz` club email addresses and exactly one Telegram link — `@nu_edu_kz`, the university's own channel, not any club's. This is consistent with clubs living on Instagram and email instead.

**Inference, not fact:** if clubs ever *do* open channels, the corpus could grow by up to ~156 more sources. Nothing in the cited sources suggests they have. Treat the 1,640 as the real Telegram volume and 1,640 + up-to-156-channels as the theoretical ceiling.

---

## 2. MEASURED: registrar and grade data

### 2.1 `courses` — 799, one term

From `backend/fixtures/registrar/meta.json`:

```json
{ "term_id": "825", "term_label": "Fall 2026", "doc_count": 799, "synced_at": "2026-07-25T03:01:18Z" }
```

Counting the section and faculty fan-out out of `backend/fixtures/registrar/course_schedule_catalog.json`:

| | count |
|---|---|
| courses | **799** |
| course × section rows | 1,596 |
| distinct faculty names | 477 |
| distinct (course_code, faculty) pairs | 1,006 |
| schools | SSH 233, SoE 192, SoM 123, SCAI 110, GSB 64, GSPP 41, GSE 33, CPS 3 |
| levels | UG 393, GrM 272, PhD 131, CPS NUFYP 3 |

**Important structural fact, read from the code, not inferred:** the Meilisearch schedule index is **deleted and recreated with only the current term's documents on every sync** — `_recreate_schedule_index()` in `backend/modules/courses/registrar/schedule_sync.py:34-60` issues `DELETE /indexes/course_schedule_catalog`, `POST /indexes`, then uploads `documents`. So the search-side catalogue is **799 and stays 799**, no matter how many terms have passed. Historical terms may accumulate in the Postgres `courses` table (`Course.catalog_id` is `<term_id>-<code>` and unique, e.g. `825-ANT-101`), but they do not accumulate in the index that search actually reads.

### 2.2 `grade_reports` — 4,217 rows, 3,963 distinct, 6 terms

This is the table the brief flagged as possibly large. It is populated by CSV ingestion (`backend/modules/courses/csv_parsers/grade_reports.py`), and **four CSVs are committed to the repo**. Counting them directly:

| File | Rows | Term |
|---|---|---|
| `FA2025.csv` | 677 | FA2025 |
| `SP2025.csv` | 631 | SP2025 |
| `SP2026.csv` | 696 | SP2026 |
| `grades.csv` | 2,213 | FA2024 (829), SP2024 (730), FA2023 (654) |
| **Total** | **4,217** | 6 terms, FA2023 → SP2026 |

| | count |
|---|---|
| total rows | **4,217** |
| distinct (course_code, section, faculty, term) | **3,963** |
| distinct course codes | 879 |
| distinct faculty | 647 |
| distinct section codes | 108 |

**4,217 rows is an upper bound on what is in the database, not a claim about what is.** Those CSVs are the ingest *inputs*; whether all four have been loaded is a prod question. If loaded, the table holds ≤4,217 rows. The 254-row gap between rows and distinct keys means **there is no unique constraint** on (course, section, faculty, term) — re-running an import would duplicate rows, so the live count could be anything from 3,963 to 4,217 or higher.

**The multiplicative structure, which is what actually bounds this.** The row key is `course × section × faculty × term` (`backend/modules/courses/models/grade_report.py:25-46`). Per term that is bounded by the registrar catalogue: **at most 1,596 rows/term**, and at most **1,006** if keyed by course×faculty rather than section. Observed reality is **~700/term** (677, 631, 696) — about 44% of the 1,596 ceiling, because not every section has grade data.

Growth is therefore **~700 rows/term × 2 terms/year ≈ 1,400 rows/year**:

| Horizon | `grade_reports` |
|---|---|
| today (6 terms loaded) | ~4,200 |
| +5 years | ~11,200 |
| +10 years | ~18,200 |
| +25 years | ~39,200 |

`grade_reports` genuinely is the largest table and the only one with real compounding growth. But it grows at **~1,400/year**, so it does not reach 100k inside any planning horizon.

---

## 3. UNKNOWN: needs a human with prod SQL

Three tables are indexed into Meilisearch by `backend/bootstrap/meilisearch.py` and were **never counted**. I did not attempt to reach production; SSH is VPN-only per [`docs/adr/0002-ssh-access-vpn-only.md`](../../docs/adr/0002-ssh-access-vpn-only.md) and there is no dump in the repo.

| Table | State |
|---|---|
| `pages` | **UNKNOWN** |
| `events` | **UNKNOWN** |
| `opportunities` | **UNKNOWN** |
| `users` (profiles, planned for 2.0) | **UNKNOWN, but hard-bounded** — see below |

**`users` is the one unknown with a ceiling.** A Keycloak-backed profile row exists only for a signed-in person at NU, and NU has ~6,400–7,100 students in total:

- [THE World University Rankings 2027](https://www.timeshighereducation.com/world-university-rankings/nazarbayev-university) — student total **6,396**
- [nu.edu.kz news](https://nu.edu.kz/news-en/heading-central-asia-s-leading-university) — *"Current students number over 7,000, some two-thirds of whom pursue undergraduate studies."*
- [IIE Quick Facts, 2024](https://www.iie.org/wp-content/uploads/2024/05/Nazarbayev-University.pdf) — UG 4,803 / PG 1,699
- [Wikipedia](https://en.wikipedia.org/wiki/Nazarbayev_University) — 7,089 total

So `users` can never exceed roughly **7,100 rows, ever**. If profiles are ever indexed as documents, they are a ~7k fixed block, not a growth source.

### 3.1 Run this against production to close the unknowns

Column and table names verified against the ORM models in the repo. Paste-able as one block:

```sql
-- 1. Row counts for every Meilisearch-indexed source.
SELECT 'pages'        AS source, count(*) FROM pages
UNION ALL SELECT 'events',            count(*) FROM events
UNION ALL SELECT 'opportunities',     count(*) FROM opportunities
UNION ALL SELECT 'courses',           count(*) FROM courses
UNION ALL SELECT 'grade_reports',     count(*) FROM grade_reports
UNION ALL SELECT 'users',             count(*) FROM users
ORDER BY 2 DESC;

-- 2. Telegram messages actually stored (may not exist yet — returns 0 if not).
--    Adjust the table name to wherever posts land.
-- SELECT count(*) AS telegram_posts FROM telegram_messages;

-- 3. courses: is it cumulative across terms, or one term like the Meilisearch index?
SELECT term, count(*) FROM courses GROUP BY term ORDER BY term;

-- 4. grade_reports: real cardinality, deduped, and terms actually loaded.
SELECT count(*) AS rows,
       count(DISTINCT (course_code, section, faculty, term)) AS distinct_keys,
       count(DISTINCT term) AS terms
FROM grade_reports;
SELECT term, count(*) FROM grade_reports GROUP BY term ORDER BY term;

-- 5. pages: distinct owners, and the 100-per-owner cap in action.
--    MAX_PAGES_PER_OWNER = 100, backend/modules/pages/constants.py:5
SELECT count(DISTINCT owner) AS owners, count(*) AS pages FROM pages;
SELECT owner, count(*) FROM pages GROUP BY owner ORDER BY 2 DESC LIMIT 10;

-- 6. events / opportunities: growth rate, to project the 5- and 10-year ceiling.
SELECT date_trunc('year', created_at) AS yr, count(*) FROM events GROUP BY 1 ORDER BY 1;
SELECT date_trunc('year', created_at) AS yr, count(*) FROM opportunities GROUP BY 1 ORDER BY 1;

-- 7. Sanity check on the storage math in §4.5, if you build the vector column.
--    Before index: 4 * dimensions + 8 bytes/vector (pgvector README, "Vector Type").
-- SELECT pg_size_pretty(pg_relation_size('pages')) FROM pages LIMIT 1;
```

Query 6 is the one that matters most for planning: `events` per year is the growth rate of the only genuinely unbounded user-generated source, and it is the one number that would justify revisiting the corpus estimate in a year.

---

## 4. INFERRED: rough scale of what is left

Explicit estimates, reasoned from the cited sources above. **None of these are measurements.**

| Source | Estimate | Reasoning |
|---|---|---|
| `pages` | **10² – 10³** | Capped at 100 per owner (`backend/modules/pages/constants.py:5`) × up to ~7,100 users = a 710k *hard ceiling*, but the cap is a ceiling, not a forecast. Realistic usage is Puck pages for the ~156 registered clubs plus individual student notes. Expect hundreds, not thousands. **Most likely the smallest table here.** |
| `events` | **10³** | NU states *"More than 800 events every year"* (via @nustudentclubs). Over ~4 years since 2022 that is ~3,200 campus events total. But `events.creator_sub` means the table only holds events *created in the app*, a subset. Call it 10²–10³. |
| `opportunities` | **10² – 10³** | Internships, scholarships, conferences — a low-churn, staff-curated list. Order of magnitude of a career centre's annual output. |
| `users` (if indexed) | **~7,100 max** | Bounded by NU's total enrolment, cited in §3. |
| Telegram | **1,640 now**, ~1,800 in 10 yrs | Only `@nuspacechannel` is actively posting: 193 posts over ~13 months ≈ 180/yr. The other two are dormant. |

**Projection, assuming `events` grows at 800/yr, `grade_reports` at 1,400/yr, `courses` accumulates 799/term in Postgres, and `pages`/`opportunities` stay flat:**

| Horizon | Corpus |
|---|---|
| **Today** | **~6,700 measured + residual** |
| +5 years | ~25,000 |
| +10 years | ~48,000 |
| 25 years, with the 710k `pages` cap fully exercised | ~250,000 |

The "100k" end of the map's range is reachable only by user-generated `pages` saturating their per-owner cap at scale. It is **not** reachable from any current source within a planning horizon.

---

## 5. Does an approximate vector index earn its place?

The question put to me: at 10k, 100k, and 1M documents, does an approximate index earn its place on a 2 vCPU box? Facts only.

### 5.1 pgvector's own position (primary source)

From the [pgvector README](https://github.com/pgvector/pgvector):

> "By default, pgvector performs exact nearest neighbor search, which provides perfect recall. You can add an index to use approximate nearest neighbor search, which trades some recall for speed."
> — [Indexing](https://github.com/pgvector/pgvector#indexing)

> "Also, if the table is small, a table scan may be faster."
> — [Troubleshooting: Why isn't a query using an index?](https://github.com/pgvector/pgvector#why-isnt-a-query-using-an-index)

> "A good place to start is `rows / 1000` for up to 1M rows and `sqrt(rows)` for over 1M rows"
> — [IVFFlat](https://github.com/pgvector/pgvector#ivfflat) (lists)

> "Monitor recall by comparing results from approximate search with exact search."
> — [Monitoring](https://github.com/pgvector/pgvector#monitoring)

**The honest reading: pgvector publishes no numeric corpus size at which an approximate index starts paying for itself.** It states the principle ("if the table is small, a table scan may be faster") and gives a tuning heuristic for `lists`, but no crossover threshold. Anyone quoting pgvector for a specific number is quoting something the project does not say.

pgvector's own prescribed way to find out is the last quote above — build both, compare. That is a measurement to run, not a number to look up.

### 5.2 The memory arithmetic, from pgvector's documented formula

Exact search must read every vector. pgvector documents the storage cost exactly:

> "Each vector takes `4 * dimensions + 8` bytes of storage."
> — [Vector Type](https://github.com/pgvector/pgvector#vector-type)

At `d = 768` float32 (a typical sentence-embedding width):

| N | Vector heap | % of a 4 GB box | Single-pass read at 5–10 GB/s (1 core) |
|---|---|---|---|
| 10,000 | **29 MB** | 0.7% | **3–6 ms** |
| 100,000 | **294 MB** | 7% | **31–62 ms** |
| 1,000,000 | **2,937 MB** | **73%** | **308–616 ms** |

Same table at `halfvec` (`2 * dimensions + 8` bytes/vector, per the [Halfvec Type](https://github.com/pgvector/pgvector#halfvec-type) section) — 15 MB / 147 MB / 1,473 MB respectively.

Two things fall out of this, and I want to be clear that they are **derived from pgvector's byte formula and the box size in #401 (2 vCPU, 4 GB), not benchmarked here.** I did not run a latency benchmark; `numpy` is not available in this environment and installing it to produce a synthetic number would have been decoration.

1. **At 10k, the working set is 29 MB.** It fits in RAM many times over alongside 17 containers. Exact search is a sequential scan of a page-cache-resident array. On the byte math alone this is a single-digit-to-low-double-digit millisecond operation, and the index would be optimizing something that is not slow.
2. **At 1M, the working set is 73% of the box's entire RAM** — before Postgres, Meilisearch, Redis, Grafana, Loki, the API, and WAL-G have taken any. Exact search stops being affordable there. This is the scale at which the trade is forced, and it is roughly **two orders of magnitude above the measured corpus.**

The crossover question is genuinely decided by hardware the numbers above describe, and pgvector declines to give a threshold. What the arithmetic does establish is that the threshold, wherever it falls, is **far above 6,700**.

### 5.3 Meilisearch / arroy scaling claims

From [arroy's README](https://github.com/meilisearch/arroy):

> "Our users have many millions of them in a high-dimensional space (i.e., 768 on average and 1536 for OpenAI), so memory usage is a prime concern."

> "Works better if you don't have too many dimensions (like <100) but seems to perform surprisingly well even up to 1,000 dimensions"

**On published scaling numbers: there are none available.** arroy's [Benchmarks section](https://github.com/meilisearch/arroy#benchmarks) points to [meilisearch/vector-store-relevancy-benchmark](https://github.com/meilisearch/vector-store-relevancy-benchmark), and that repository's README opens with:

> "**Currently the arroy dependencies point to a local directory and the benchmarks cannot be run.**"

So the benchmark Meilisearch points to is currently unrunnable and contains no committed results. **Meilisearch publishes no reproducible throughput-versus-N figures.** I am reporting the absence rather than substituting a third-party blog number, which would not be a primary source.

### 5.4 The closest thing to a rigorous external treatment

[ANN-Benchmarks: A Benchmarking Tool for Approximate Nearest Neighbor Algorithms](https://arxiv.org/abs/1807.05614) — Aumüller, Bernhardsson & Faithfull, *Information Systems* 2019, [doi:10.1016/j.is.2019.02.006](https://doi.org/10.1016/j.is.2019.02.006). Its published finding:

> "Interestingly, very different approaches to k-NN search yield comparable quality-performance trade-offs."

Its algorithm list on [ann-benchmarks.com](https://ann-benchmarks.com) includes **`bruteforce-blas` as a baseline alongside the ANN indexes**, which is the exact comparison at issue. I could not extract per-N latency figures from the site's interactive result plots in this pass, so **I am not quoting a crossover number from it**. The repository is also archived and points to [VIBE](https://github.com/vibedata/ann-benchmarks) as its successor.

The useful takeaway is structural, not numeric: brute force is a maintained baseline in the standard benchmark, which is itself evidence that exact search is a defensible choice rather than a naive default.

### 5.5 Summary of §5

| Corpus | Vector heap @ d=768 | Fits a 4 GB box? | What can be sourced |
|---|---|---|---|
| **10,000** | 29 MB | Yes, 0.7% of RAM | pgvector: exact search is the default and has perfect recall. |
| **100,000** | 294 MB | Yes, 7% | Same. No primary source gives a crossover. |
| **1,000,000** | 2,937 MB | **73% of all RAM** | Same. At this scale exact search stops being affordable regardless of guidance. |

**The one defensible statement:** at the measured corpus of ~6,700 documents, the entire vector heap is **under 20 MB**, and neither pgvector nor Meilisearch publishes guidance saying an approximate index is warranted at that size. Everything above 10k is projection. Everything about a dedicated vector service would be decided at 2–3 orders of magnitude of distance from where the corpus actually is.

---

## 6. What was not established

Stated plainly, so nothing here is mistaken for more than it is:

1. **The three Postgres counts.** `pages`, `events`, `opportunities`. Requires prod SQL — [§3.1](#31-run-this-against-production-to-close-the-unknowns). Their plausible range is wide (hundreds to low thousands each), which is why the headline is a range and not a point estimate.
2. **Whether the grade-report CSVs are all loaded.** 4,217 is an upper bound on the input, not the table.
3. **Whether any of the 156 student clubs has a Telegram channel** that is simply not linked from anywhere public. I found none; I cannot prove none exist.
4. **Whether any other NU-affiliated channel exists** beyond the three with cited links. Discovery was bounded to links published on `nuspace.kz` and `nu.edu.kz`.
5. **A latency benchmark.** The §5.2 table is byte arithmetic from pgvector's documented formula, not a measured benchmark, and says so.
6. **A crossover threshold from any vendor.** Neither pgvector nor Meilisearch publishes one. pgvector's own prescribed method for finding out is to build both and compare recall.

---

## Reproducing the Telegram counts

```sh
git clone https://github.com/pgvector/pgvector   # not needed for §1
# §1 walker: fetch https://t.me/s/<username>, parse data-post="<chat>/<id>",
# re-fetch with ?before=<oldest_id>, stop when no older post comes back.
# Control: @nuspacechannel must return 193 posts, ids 1-254.
```

Every Telegram number in §1.2 comes from that walk on 2026-10-14, with the `@nuspacechannel` control reproducing the already-known 193 before any new channel was measured. The registrar and grade-report counts come from `backend/fixtures/registrar/meta.json`, `backend/fixtures/registrar/course_schedule_catalog.json`, and the four CSVs in `backend/modules/courses/csv_parsers/csvs/`.
