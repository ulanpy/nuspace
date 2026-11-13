import { useCallback, useEffect, useMemo, useState } from "react";

type LinkMap = Record<string, string>;

const NORMALIZE = (code: string) => code.trim().toUpperCase().replace(/\s+/g, " ");

const expandCodes = (code: string): string[] =>
  code
    .split("/")
    .map(NORMALIZE)
    .filter(Boolean);

function parseCsv(text: string): LinkMap {
  const lines = text.split(/\r?\n/);
  const map: LinkMap = {};
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    const code = parts[0]?.trim();
    const link = parts[2]?.trim();
    if (!code || !link) continue;
    for (const alias of expandCodes(code)) {
      if (!map[alias]) {
        map[alias] = link;
      }
    }
  }
  return map;
}

export function useSyllabusLinks(path: string = "/data/course_links.csv") {
  const [links, setLinks] = useState<LinkMap>({});

  useEffect(() => {
    let cancelled = false;
    fetch(path)
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => {
        if (cancelled || !text) return;
        setLinks(parseCsv(text));
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const getLinkForCode = useCallback(
    (code: string | undefined | null): string | undefined => {
      if (!code) return undefined;
      for (const alias of expandCodes(code)) {
        if (links[alias]) return links[alias];
      }
      return undefined;
    },
    [links]
  );

  return useMemo(
    () => ({
      getLinkForCode,
      ready: Object.keys(links).length > 0,
    }),
    [getLinkForCode, links]
  );
}
