"use client";
import { useEffect, useState } from "react";
import { errorMessage } from "./errors";
import { resultService } from "./services/result-service";
import type { ResultPage } from "./types";
export function useResults(id: string, query: string) {
  const [page, setPage] = useState<ResultPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await resultService.page(id, query, controller.signal);
        if (!controller.signal.aborted) {
          setPage(result);
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [id, query]);
  return { page, error, loading };
}
