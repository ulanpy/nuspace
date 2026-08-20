/**
 * Fixed-rate throughput test for one hot endpoint at a time.
 *
 * Usage (local stack with MOCK_KEYCLOAK=true):
 *   docker run --rm --network host -v "$PWD/infra/k6:/scripts" \
 *     -e BASE_URL=http://localhost -e TARGET=planner -e RATE=25 -e DURATION=60s \
 *     grafana/k6 run /scripts/throughput.js
 *
 * Persist a summary after an ephemeral k6 container exits:
 *   RESULT_DIR="$(mktemp -d /tmp/nuspace-k6.XXXXXX)"
 *   chmod 777 "$RESULT_DIR"  # k6 image runs as an unprivileged user
 *   docker run --rm --network host -v "$PWD/infra/k6:/scripts:ro" -v "$RESULT_DIR:/results" \
 *     -e BASE_URL=http://localhost -e TARGET=registered_courses -e RATE=180 -e DURATION=30s \
 *     -e PRE_ALLOCATED_VUS=45 -e MAX_VUS=100 \
 *     -e SUMMARY_FILE=/results/registered-courses.json \
 *     grafana/k6 run /scripts/throughput.js
 *   jq . "$RESULT_DIR/registered-courses.json"
 *
 * `SUMMARY_FILE` is optional. It must be a path inside a mounted directory;
 * otherwise the result disappears with `docker run --rm`.
 *
 * TARGET: planner | planner_semesters | search | events | profile | registered_courses | meilisearch
 *
 * Direct Meilisearch benchmark (runs in the Compose network):
 *   # Docker's --env-file requires KEY=value. This command also works when
 *   # the local Pydantic .env uses `KEY = value` spacing.
 *   env MEILISEARCH_MASTER_KEY="$(sed -nE 's#^[[:space:]]*MEILISEARCH_MASTER_KEY[[:space:]]*=[[:space:]]*##p' infra/.env | head -n 1)" \
 *     docker run --rm --network nuspace_nuros -e MEILISEARCH_MASTER_KEY \
 *     -v "$PWD/infra/k6:/scripts" -e BASE_URL=http://meilisearch:7700 \
 *     -e TARGET=meilisearch -e RATE=100 -e DURATION=60s \
 *     grafana/k6 run /scripts/throughput.js
 *
 * To bypass Nginx and target FastAPI directly, set
 * BASE_URL=http://127.0.0.1:8000 and API_PREFIX="". In this mode the
 * mock-auth callback is followed internally as well: the external callback
 * URL contains /api because FastAPI's root_path is /api, while direct Uvicorn
 * routing expects the unprefixed path.
 * RATE: requested iterations per second; raise it between runs until errors,
 *       latency growth, or dropped iterations reveal the capacity limit.
 * PRE_ALLOCATED_VUS / MAX_VUS: optional fixed concurrency bounds. Defaults
 *       deliberately cap the generator at 500 / 1000 VUs, which is enough
 *       for 1,000–2,000 RPS while latency is below roughly 500 ms. When the
 *       cap is reached, dropped iterations are the saturation signal instead
 *       of letting k6 consume the host CPU and distort the server benchmark.
 */
import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost";
const TARGET = __ENV.TARGET || "planner";
const RATE = Number(__ENV.RATE || 10);
const DURATION = __ENV.DURATION || "60s";
const DEFAULT_PRE_ALLOCATED_VUS = Math.min(50, Math.max(20, Math.ceil(RATE * 0.25)));
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || DEFAULT_PRE_ALLOCATED_VUS);
const MAX_VUS = Number(__ENV.MAX_VUS || 100);
const EVENTS_SIZE = Number(__ENV.EVENTS_SIZE || 20);
const AUTHENTICATE = __ENV.AUTHENTICATE !== "false";
const API_PREFIX = (__ENV.API_PREFIX ?? "/api").replace(/\/$/, "");
const DIRECT_FASTAPI = API_PREFIX === "";
const MEILISEARCH_INDEX = __ENV.MEILISEARCH_INDEX || "grade_reports";
const MEILISEARCH_QUERY = __ENV.MEILISEARCH_QUERY || "CSCI";

if (!["planner", "planner_semesters", "search", "events", "profile", "registered_courses", "meilisearch", "communities"].includes(TARGET)) {
  throw new Error(
    `TARGET must be "planner", "planner_semesters", "search", "events", "profile", "registered_courses", or "meilisearch", got "${TARGET}"`,
  );
}
if (!Number.isFinite(RATE) || RATE <= 0) {
  throw new Error(`RATE must be a positive number, got "${__ENV.RATE}"`);
}
if (!Number.isInteger(PRE_ALLOCATED_VUS) || PRE_ALLOCATED_VUS < 1) {
  throw new Error(`PRE_ALLOCATED_VUS must be a positive integer, got "${__ENV.PRE_ALLOCATED_VUS}"`);
}
if (!Number.isInteger(MAX_VUS) || MAX_VUS < PRE_ALLOCATED_VUS) {
  throw new Error(`MAX_VUS must be an integer not smaller than PRE_ALLOCATED_VUS, got "${__ENV.MAX_VUS}"`);
}
if (!Number.isInteger(EVENTS_SIZE) || EVENTS_SIZE < 1 || EVENTS_SIZE > 100) {
  throw new Error(`EVENTS_SIZE must be an integer from 1 to 100, got "${__ENV.EVENTS_SIZE}"`);
}

const latency = new Trend("target_latency", true);
const errors = new Rate("target_errors");

const endpoints = {
  planner: `${API_PREFIX}/planner/courses/search?term_value=Fall%202026&course_code=CSCI&page=1&size=5`,
  planner_semesters: `${API_PREFIX}/planner/semesters`,
  search: `${API_PREFIX}/search/?keyword=CSCI&storage_name=grade_reports&page=1&size=10`,
  events: `${API_PREFIX}/events?size=${EVENTS_SIZE}&event_status=approved`,
  profile: `${API_PREFIX}/profile`,
  registered_courses: `${API_PREFIX}/registered_courses`,
  meilisearch: `/indexes/${MEILISEARCH_INDEX}/search`,
  communities: `${API_PREFIX}/communities`
};
const endpoint = endpoints[TARGET];

function meilisearchParams() {
  const key = __ENV.MEILISEARCH_MASTER_KEY;
  if (!key) {
    throw new Error("MEILISEARCH_MASTER_KEY is required for TARGET=meilisearch");
  }
  return {
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    tags: { name: TARGET },
  };
}

function requestTarget(cookieHeader) {
  if (TARGET === "meilisearch") {
    return http.post(
      `${BASE}${endpoint}`,
      JSON.stringify({ q: MEILISEARCH_QUERY, limit: 5 }),
      meilisearchParams(),
    );
  }
  return http.get(`${BASE}${endpoint}`, {
    headers: { Cookie: cookieHeader },
    tags: { name: TARGET },
  });
}

export const options = {
  scenarios: {
    throughput: {
      executor: "constant-arrival-rate",
      rate: RATE,
      timeUnit: "1s",
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
    },
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export function setup() {
  if (!AUTHENTICATE) {
    const smoke = requestTarget("");
    if (smoke.status !== 200) {
      throw new Error(`guest smoke failed: ${smoke.status} ${smoke.body?.slice(0, 200)}`);
    }
    return { cookieHeader: "" };
  }

  if (TARGET === "meilisearch") {
    const smoke = requestTarget("");
    if (smoke.status !== 200) {
      throw new Error(`Meilisearch smoke failed: ${smoke.status} ${smoke.body?.slice(0, 200)}`);
    }
    return { cookieHeader: "" };
  }

  const jar = http.cookieJar();
  const login = http.get(`${BASE}${API_PREFIX}/login?mock_user=alice`, {
    redirects: DIRECT_FASTAPI ? 0 : 5,
    jar,
    tags: { name: "login" },
  });
  if (!DIRECT_FASTAPI && login.status !== 200) {
    throw new Error(`login failed: ${login.status} ${login.body?.slice(0, 200)}`);
  }

  if (DIRECT_FASTAPI) {
    if (login.status !== 303 || !login.headers.Location) {
      throw new Error(`direct login failed: ${login.status} ${login.body?.slice(0, 200)}`);
    }
    const callbackUrl = login.headers.Location.replace(`${BASE}/api/`, `${BASE}/`);
    const callback = http.get(callbackUrl, {
      redirects: 0,
      jar,
      tags: { name: "login_callback" },
    });
    if (callback.status !== 303) {
      throw new Error(`direct login callback failed: ${callback.status} ${callback.body?.slice(0, 200)}`);
    }
  }

  const cookies = jar.cookiesForURL(BASE);
  const cookieHeader = Object.entries(cookies)
    .filter(([, values]) => values?.length)
    .map(([name, values]) => `${name}=${values[0]}`)
    .join("; ");
  const smoke = http.get(`${BASE}${endpoint}`, {
    headers: { Cookie: cookieHeader },
    tags: { name: `${TARGET}_smoke` },
  });
  if (smoke.status !== 200) {
    throw new Error(`smoke failed: ${smoke.status} ${smoke.body?.slice(0, 200)}`);
  }
  return { cookieHeader };
}

export default function (data) {
  const response = requestTarget(data.cookieHeader);
  latency.add(response.timings.duration);
  const ok = check(response, { [`${TARGET} 200`]: (r) => r.status === 200 });
  errors.add(!ok);
}

export function handleSummary(data) {
  const summary = {
    target: TARGET,
    requested_rps: RATE,
    pre_allocated_vus: PRE_ALLOCATED_VUS,
    max_vus: MAX_VUS,
    http_reqs_per_second: data.metrics.http_reqs?.values?.rate || 0,
    dropped_iterations: data.metrics.dropped_iterations?.values?.count || 0,
    target_latency_ms: data.metrics.target_latency?.values || {},
    error_rate: data.metrics.target_errors?.values?.rate || 0,
  };
  const serializedSummary = JSON.stringify(summary, null, 2);
  const outputs = {
    stdout: `\n=== throughput summary ===\n${serializedSummary}\n`,
  };

  if (__ENV.SUMMARY_FILE) {
    outputs[__ENV.SUMMARY_FILE] = `${serializedSummary}\n`;
    outputs.stdout += `Persistent summary: ${__ENV.SUMMARY_FILE}\n`;
  }

  return outputs;
}
