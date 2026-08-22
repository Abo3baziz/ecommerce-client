"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useRateLimit(defaultSeconds = 60) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stop;
  }, [stop]);

  const start = useCallback(
    (seconds = defaultSeconds) => {
      stop();
      setSecondsLeft(seconds);
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [defaultSeconds, stop],
  );

  return { secondsLeft, start };
}
