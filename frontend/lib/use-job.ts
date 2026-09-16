"use client";
import { useEffect, useState } from "react";
import { processingService } from "./services/processing-service";
import { subscribe } from "./services/events";
import { errorMessage } from "./errors";
import type { Job } from "./types";
export function useJob(id: string) {
  const [job, setJob] = useState<Job | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true,
      sequence = 0;
    const update = () => {
      const current = ++sequence;
      void processingService
        .get(id)
        .then((value) => {
          if (active && current === sequence) {
            setJob(value);
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
  }, [id, revision]);
  return { job, error, retry: () => setRevision((x) => x + 1) };
}
