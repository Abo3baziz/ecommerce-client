"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs = 300,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: A) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
