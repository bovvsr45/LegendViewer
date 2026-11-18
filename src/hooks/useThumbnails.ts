import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { Connection } from "@/types";

/** Never hit more than this many remote hosts at once. */
const MAX_CONCURRENCY = 2;

/**
 * Periodically pulls a preview frame for every connection currently on screen.
 * Captures are queued so a folder with 50 machines doesn't open 50 sockets.
 */
export function useThumbnails(connections: Connection[], intervalSec: number) {
  const setThumbnail = useAppStore((s) => s.setThumbnail);
  const setThumbError = useAppStore((s) => s.setThumbError);

  const [capturingIds, setCapturingIds] = useState<Set<string>>(new Set());
  const inFlight = useRef<Set<string>>(new Set());
  const queue = useRef<string[]>([]);
  const draining = useRef(false);
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  const markCapturing = (id: string, on: boolean) =>
    setCapturingIds((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });

  const drain = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;

    while (queue.current.length > 0) {
      const batch = queue.current.splice(0, MAX_CONCURRENCY);
      await Promise.all(
        batch.map(async (id) => {
          if (inFlight.current.has(id)) return;
          inFlight.current.add(id);
          markCapturing(id, true);
          try {
            setThumbnail(id, await api.captureThumbnail(id));
          } catch (e) {
            setThumbError(id, String(e).replace(/^Error:\s*/, ""));
          } finally {
            inFlight.current.delete(id);
            markCapturing(id, false);
          }
        })
      );
    }

    draining.current = false;
  }, [setThumbnail, setThumbError]);

  const enqueue = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        if (!queue.current.includes(id) && !inFlight.current.has(id)) queue.current.push(id);
      }
      void drain();
    },
    [drain]
  );

  const refresh = useCallback((c: Connection) => enqueue([c.id]), [enqueue]);

  useEffect(() => {
    if (intervalSec <= 0) return;
    const tick = () => enqueue(connectionsRef.current.map((c) => c.id));
    tick();
    const timer = window.setInterval(tick, intervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [intervalSec, enqueue]);

  return { capturingIds, refresh };
}
