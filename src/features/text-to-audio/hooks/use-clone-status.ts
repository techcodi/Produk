"use client";

import { useCallback, useEffect, useState } from "react";
import { detectCloneDevice, isCloneModelDownloaded, removeCloneModel, type CloneDevice } from "../core/clone-engine";

/** Which backend cloning will use here, and whether its model is already downloaded. */
export function useCloneStatus(active: boolean) {
  const [status, setStatus] = useState<{ device: CloneDevice; downloaded: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const device = await detectCloneDevice();
      const downloaded = await isCloneModelDownloaded(device);
      if (!cancelled) setStatus({ device, downloaded });
    })();
    return () => {
      cancelled = true;
    };
  }, [active, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const remove = useCallback(async () => {
    await removeCloneModel();
    refresh();
  }, [refresh]);

  return { status, refresh, remove };
}
