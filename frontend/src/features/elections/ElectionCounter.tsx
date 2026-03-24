
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCount(initialData.survey_responses);
    }
  }, [initialData]);

  useEffect(() => {
    const eventSource = new EventSource(electionsApi.getCounterStreamUrl());

    eventSource.onmessage = (event) => {
      setCount(parseInt(event.data, 10));
    };

    eventSource.onerror = () => {
      setError("Error connecting to the server. Please try again later.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (error) {
    return <div className="text-5xl">--</div>;
  }

  if (count === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="text-5xl">
      {count}
    </div>
  );
}
