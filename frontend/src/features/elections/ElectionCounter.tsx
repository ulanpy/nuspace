"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { electionsApi } from "./api";

export function ElectionCounter() {
  const { data: initialData } = useQuery({
    queryKey: ["electionData"],
    queryFn: electionsApi.getElectionData,
    staleTime: 0,
  });

  const [count, setCount] = useState<number | null>(initialData?.survey_responses ?? null);

  useEffect(() => {
    if (initialData) {
      setCount(initialData.survey_responses);
    }
  }, [initialData]);

  useEffect(() => {
    const eventSource = new EventSource(electionsApi.getCounterStreamUrl());

    eventSource.onmessage = (event) => {
      const raw = (event.data ?? "").trim();
      if (raw === "") return;
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n)) return;
      setCount(n);
    };

    // Leave `onerror` unset so the browser keeps retrying the SSE (closing in onerror
    // used to kill the stream and forced the UI to “--” after short blips).

    return () => {
      eventSource.close();
    };
  }, []);

  if (count === null) {
    return <div>Loading...</div>;
  }

  return <div className="text-5xl tabular-nums">{count}</div>;
}
