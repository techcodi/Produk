"use client";

import { useCallback, useEffect, useState } from "react";
import { isVoiceDownloaded, removeVoice } from "../core/voice-cache";
import type { Voice } from "../types";

/** Whether `voice` is already on this device. Call `refresh()` after a run downloads it. */
export function useVoiceStatus(voice: Voice) {
  const [status, setStatus] = useState<{ id: string; downloaded: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    isVoiceDownloaded(voice).then((downloaded) => {
      if (!cancelled) setStatus({ id: voice.id, downloaded });
    });
    return () => {
      cancelled = true;
    };
  }, [voice, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const remove = useCallback(async () => {
    await removeVoice(voice);
    refresh();
  }, [voice, refresh]);

  // Unknown until the check for this voice finishes.
  const downloaded = status?.id === voice.id ? status.downloaded : null;
  return { downloaded, refresh, remove };
}
