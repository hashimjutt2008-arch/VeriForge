"use client";
import { useEffect, useState } from "react";
import { historyService } from "./services/history-service";
import { errorMessage } from "./errors";
import { subscribe } from "./services/events";
import type { Job } from "./types";
export function useHistory() {
  const [data, setData] = useState<{ items: Job[]; total: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true,
      sequence = 0;
    const update = () => {
      const current = ++sequence;
      void historyService
        .list()
        .then((value) => {
          if (active && current === sequence) {
            setData(value);
            setError("");
          }
        })
        .catch((e) => {
          if (active && current === sequence) setError(errorMessage(e));
        });
    };
    const unsubscribe = subscribe(update);
    update();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [revision]);
  return { data, error, refresh: () => setRevision((x) => x + 1) };
}
