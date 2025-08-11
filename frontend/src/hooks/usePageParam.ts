"use client";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type UsePageParamOptions = {
  param?: string;
  defaultValue?: number;
  replace?: boolean;
  scrollToTop?: boolean;
  scrollBehavior?: ScrollBehavior;
};

export function usePageParam(options: UsePageParamOptions = {}) {
  const {
    param = "page",
    defaultValue = 1,
    replace = true,
    scrollToTop = true,
    scrollBehavior = "smooth",
  } = options;

  const location = useLocation();
  const navigate = useNavigate();

  const extractPageFromSearch = (): number => {
    const params = new URLSearchParams(location.search);
    const raw = params.get(param);
    const parsed = Number(raw ?? defaultValue);
    if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
    return parsed;
  };

  const [page, setPageState] = useState<number>(extractPageFromSearch());

  // Sync local state when URL changes (back/forward or external nav)
  useEffect(() => {
    const urlPage = extractPageFromSearch();
    if (urlPage !== page) {
      setPageState(urlPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const setPage = (nextPage: number) => {
    let safePage = Number(nextPage);
    if (!Number.isFinite(safePage) || safePage < 1) safePage = defaultValue;
    if (safePage === page) return;

    const params = new URLSearchParams(location.search);
    params.set(param, String(safePage));
    navigate(`${location.pathname}?${params.toString()}`, { replace });
    setPageState(safePage);
    if (scrollToTop && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: scrollBehavior });
    }
  };

  return [page, setPage] as const;
}


