import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { ROUTE_TABLE, SERVICES } from "./constants.ts"
import { createHostRewrite, destinations, hostOf } from "./functions.ts"
import {
  checkOwnership,
  parseRouteTree,
  renderNginxInclude,
  renderNotFoundPage,
  withPreloads,
} from "./generate.ts"
import type { RouteTableRow } from "./types.ts"

const ROUTE_TREE = readFileSync(
  new URL("../../routeTree.gen.ts", import.meta.url),
  "utf8"
)

const root = (routes: string[], unmigrated: string[] = []): RouteTableRow => ({
  service: "root",
  mount: "",
  routes,
  unmigrated,
})
const events = (routes: string[]): RouteTableRow => ({
  service: "events",
  mount: "/events",
  routes,
})

describe("ownership check", () => {
  it("passes for the committed table and route tree", () => {
    assert.deepEqual(
      checkOwnership(ROUTE_TABLE, parseRouteTree(ROUTE_TREE).paths),
      []
    )
  })

  it("fails a route no host claims", () => {
    const errors = checkOwnership(
      [root(["/"]), events(["/"])],
      ["/", "/events", "/events/$eventId"]
    )
    assert.deepEqual(errors, ['route "/events/$eventId" is claimed by no host'])
  })

  it("counts a parameter segment as a claim, so two hosts on it fail", () => {
    const errors = checkOwnership(
      [root(["/"], ["/events/$eventId"]), events(["/", "/$eventId"])],
      ["/", "/events", "/events/$eventId"]
    )
    assert.ok(
      errors.includes(
        'route "/events/$eventId" is claimed by 2: root ("/events/$eventId"), events ("/$eventId")'
      )
    )
  })

  it("fails a row naming a path the router lacks", () => {
    const errors = checkOwnership(
      [root(["/"]), events(["/", "/$eventId", "/$eventId/edit"])],
      ["/", "/events", "/events/$eventId"]
    )
    assert.deepEqual(errors, [
      'events: "/$eventId/edit" names "/events/$eventId/edit", which the router lacks',
    ])
  })

  it("fails a root claim inside another host's mount", () => {
    const errors = checkOwnership(
      [root(["/", "/events/archive"]), events(["/"])],
      ["/", "/events", "/events/archive"]
    )
    assert.ok(
      errors.includes(
        `root: "/events/archive" lies under events's mount "/events"`
      )
    )
  })

  it("fails a parameter pattern that could span segments", () => {
    const errors = checkOwnership(
      [
        root(["/"]),
        { ...events(["/", "/$eventId"]), params: { eventId: ".+/.+" } },
      ],
      ["/", "/events", "/events/$eventId"]
    )
    assert.deepEqual(errors, [
      "events: params.eventId must match within one segment",
    ])
  })

  it("reads trailing-slash route paths as the same route", () => {
    assert.deepEqual(
      checkOwnership([root(["/", "/about/"])], ["/", "/about"]),
      []
    )
  })
})

describe("route tree", () => {
  it("lists the files that render a path, root first", () => {
    const tree = parseRouteTree(ROUTE_TREE)
    assert.deepEqual(tree.files("/events/$eventId"), [
      "routes/__root",
      "routes/_app/route",
      "routes/_app/events/$eventId/index",
    ])
    // The generator wraps long declarations onto a second line.
    assert.deepEqual(tree.files("/courses/statistics"), [
      "routes/__root",
      "routes/_app/route",
      "routes/_app/courses/route",
      "routes/_app/courses/statistics/index",
    ])
  })

  it("resolves every route it lists", () => {
    const tree = parseRouteTree(ROUTE_TREE)
    for (const path of tree.paths) assert.ok(tree.files(path).length > 1, path)
  })
})

describe("nginx include", () => {
  const include = renderNginxInclude(ROUTE_TABLE, SERVICES)

  it("maps production, staging and development hosts of every row", () => {
    for (const host of [
      "nuspace.kz",
      "stage.nuspace.kz",
      "localhost",
      "events.nuspace.kz",
      "events_staging.nuspace.kz",
      "events.localhost",
    ]) {
      assert.match(
        include,
        new RegExp(`\\n {4}${host.replace(/\./g, "\\.")} +\\w+;`)
      )
    }
  })

  it("leaves a host with no row unmapped, so nginx 404s all of it", () => {
    assert.doesNotMatch(include, /courses\.nuspace\.kz +courses;/)
  })

  it("matches a static path exactly and a root-level parameter by regex", () => {
    assert.match(include, /"root:\/about" +1;/)
    assert.match(include, /"root:\/about\/" +1;/)
    assert.match(include, /"~\^events:\/\[0-9\]\+\/\?\$" +1;/)
    assert.match(include, /"~\^root:\/p\/\[\^\/\]\+\/editor\/\?\$" +1;/)
  })

  it("serves the legal pages at their short paths, and 404s the old ones", () => {
    for (const path of ["/about", "/privacy", "/terms"]) {
      assert.match(include, new RegExp(`"root:${path}" +1;`))
    }
    assert.doesNotMatch(include, /privacy-policy|terms-of-service/)
  })

  it("reads the staging environment off a staging host", () => {
    assert.match(include, /courses_staging\.nuspace\.kz +staging;/)
  })
})

describe("404 page", () => {
  it("names the six hosts of its environment and loads no script", () => {
    const page = renderNotFoundPage(SERVICES, "staging")
    for (const service of SERVICES) {
      assert.ok(page.includes(`https://${service.hosts.staging}/`))
    }
    assert.doesNotMatch(page, /<script/)
  })
})

describe("host rewrite", () => {
  const rewrite = createHostRewrite()
  const input = (href: string) =>
    (rewrite.input({ url: new URL(href) }) ?? new URL(href)).href
  const output = (href: string) =>
    (rewrite.output({ url: new URL(href) }) ?? new URL(href)).href

  it("puts the host's mount in front of the browser path", () => {
    assert.equal(
      input("https://events.nuspace.kz/42?from=share"),
      "https://events.nuspace.kz/events/42?from=share"
    )
    assert.equal(
      input("https://events.nuspace.kz/"),
      "https://events.nuspace.kz/events"
    )
    assert.equal(input("https://nuspace.kz/about"), "https://nuspace.kz/about")
  })

  it("strips the mount from a link on its own host", () => {
    assert.equal(
      output("https://events.nuspace.kz/events/42"),
      "https://events.nuspace.kz/42"
    )
    assert.equal(
      output("https://events.nuspace.kz/events"),
      "https://events.nuspace.kz/"
    )
  })

  it("sends a link to the host that owns it, in the same environment", () => {
    assert.equal(
      output("https://nuspace.kz/events/42"),
      "https://events.nuspace.kz/42"
    )
    assert.equal(
      output("https://events_staging.nuspace.kz/courses"),
      "https://stage.nuspace.kz/courses"
    )
    assert.equal(
      output("http://localhost:5173/events"),
      "http://events.localhost:5173/"
    )
  })

  it("leaves a hostname outside the table alone", () => {
    assert.equal(
      rewrite.input({ url: new URL("http://127.0.0.1/42") }),
      undefined
    )
    assert.equal(
      rewrite.output({ url: new URL("http://127.0.0.1/events/42") }),
      undefined
    )
  })
})

describe("destinations", () => {
  it("lists the visitor's own environment, production when unknown", () => {
    assert.equal(hostOf("my_staging.nuspace.kz")?.environment, "staging")
    assert.deepEqual(
      destinations("events.localhost").map((d) => d.href),
      SERVICES.map((s) => `http://${s.hosts.development}/`)
    )
    assert.equal(destinations("example.com")[0].href, "https://nuspace.kz/")
  })
})

describe("per-host index.html", () => {
  it("adds the host's preloads before </head>", () => {
    assert.equal(
      withPreloads("<head>\n  </head>", ["/assets/a.js"]),
      '<head>\n    <link rel="modulepreload" crossorigin href="/assets/a.js">\n  </head>'
    )
  })
})
