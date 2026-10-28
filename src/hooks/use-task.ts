"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TaskState<R> =
  | { status: "idle" }
  | { status: "processing"; completed: number; total: number }
  | { status: "success"; result: R }
  | { status: "error"; message: string };

export interface TaskContext {
  signal: AbortSignal;
  progress: (completed: number, total: number) => void;
}

interface TaskOptions<R> {
  /** Frees whatever the result holds (object URLs) once it is replaced or discarded. */
  release?: (result: R) => void;
  describeError: (error: unknown) => string;
}

export const isOutOfMemory = (error: unknown) =>
  error instanceof RangeError || (error instanceof Error && /memory/i.test(error.message));

/**
 * State machine for a cancellable, progress-reporting job. Starting a new run
 * aborts the previous one, and results from stale runs are ignored.
 */
export function useTask<R>(options: TaskOptions<R>) {
  const [state, setState] = useState<TaskState<R>>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const resultRef = useRef<R | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const releaseResult = useCallback(() => {
    if (resultRef.current !== null) optionsRef.current.release?.(resultRef.current);
    resultRef.current = null;
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      releaseResult();
    },
    [releaseResult],
  );

  /** Resolves with the result, or `undefined` if the run failed or was superseded. */
  const start = useCallback(
    async (total: number, run: (context: TaskContext) => Promise<R>): Promise<R | undefined> => {
      controllerRef.current?.abort();
      releaseResult();

      const controller = new AbortController();
      controllerRef.current = controller;
      const isCurrent = () => controllerRef.current === controller && !controller.signal.aborted;

      setState({ status: "processing", completed: 0, total });

      try {
        const result = await run({
          signal: controller.signal,
          progress: (completed, total) => {
            if (isCurrent()) setState({ status: "processing", completed, total });
          },
        });
        if (!isCurrent()) {
          optionsRef.current.release?.(result);
          return undefined;
        }
        resultRef.current = result;
        setState({ status: "success", result });
        return result;
      } catch (error) {
        if (!isCurrent()) return undefined;
        console.error(error);
        setState({ status: "error", message: optionsRef.current.describeError(error) });
        return undefined;
      }
    },
    [releaseResult],
  );

  /** Cancels any in-flight run and discards the previous result. */
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    releaseResult();
    setState((prev) => (prev.status === "idle" ? prev : { status: "idle" }));
  }, [releaseResult]);

  return { state, start, reset };
}
