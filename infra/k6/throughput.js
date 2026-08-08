/**
 * Fixed-rate throughput test for one hot endpoint at a time.
 *
 * Usage (local stack with MOCK_KEYCLOAK=true):
 *   docker run --rm --network host -v "$PWD/infra/k6:/scripts" \
 *     -e BASE_URL=http://localhost -e TARGET=planner -e RATE=25 -e DURATION=60s \
 *     grafana/k6 run /scripts/throughput.js
 *
 * TARGET: planner | search | events
 * RATE: requested iterations per second; raise it between runs until errors,
 *       latency growth, or dropped iterations reveal the capacity limit.
 */
import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost";
const TARGET = __ENV.TARGET || "planner";
const RATE = Number(__ENV.RATE || 10);
const DURATION = __ENV.DURATION || "60s";

if (!["planner", "search", "events"].includes(TARGET)) {
  throw new Error(`TARGET must be "planner", "search", or "events", got "${TARGET}"`);
}
if (!Number.isFinite(RATE) || RATE <= 0) {
  throw new Error(`RATE must be a positive number, got "${__ENV.RATE}"`);
}

const latency = new Trend("target_latency", true);
const errors = new Rate("target_errors");

const endpoints = {
  planner: "/api/planner/courses/search?term_value=Fall%202026&course_code=CSCI&page=1&size=5",
  search: "/api/search/?keyword=CSCI&storage_name=grade_reports&page=1&size=10",
  events: "/api/events?size=20&event_status=approved",
};
const endpoint = endpoints[TARGET];

export const options = {
  scenarios: {
    throughput: {
      executor: "constant-arrival-rate",
      rate: RATE,
      timeUnit: "1s",
      duration: DURATION,
      preAllocatedVUs: Math.max(20, Math.ceil(RATE * 2)),
      maxVUs: Math.max(100, Math.ceil(RATE * 10)),
    },
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export function setup() {
  const jar = http.cookieJar();
  const login = http.get(`${BASE}/api/login?mock_user=alice`, {
    redirects: 5,
    jar,
    tags: { name: "login" },
  });
  if (login.status !== 200) {
    throw new Error(`login failed: ${login.status} ${login.body?.slice(0, 200)}`);
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
  const response = http.get(`${BASE}${endpoint}`, {
    headers: { Cookie: data.cookieHeader },
    tags: { name: TARGET },
  });
  latency.add(response.timings.duration);
  const ok = check(response, { [`${TARGET} 200`]: (r) => r.status === 200 });
  errors.add(!ok);
}

export function handleSummary(data) {
  const summary = {
    target: TARGET,
    requested_rps: RATE,
    http_reqs_per_second: data.metrics.http_reqs?.values?.rate || 0,
    dropped_iterations: data.metrics.dropped_iterations?.values?.count || 0,
    target_latency_ms: data.metrics.target_latency?.values || {},
    error_rate: data.metrics.target_errors?.values?.rate || 0,
  };
  return { stdout: `\n=== throughput summary ===\n${JSON.stringify(summary, null, 2)}\n` };
}
