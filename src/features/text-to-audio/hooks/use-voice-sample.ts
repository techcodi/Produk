"use client";

import { useCallback, useEffect, useState } from "react";
import { createVoiceSample, deleteVoiceSample, loadVoiceSample, saveVoiceSample } from "../core/voice-sample";
import { VoiceSampleError } from "../core/sample";
import type { VoiceSample } from "../types";

/** The user's voice sample, remembered on this device until they remove it. */
export function useVoiceSample() {
  const [sample, setSample] = useState<VoiceSample | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadVoiceSample().then((saved) => {
      if (!cancelled && saved) setSample((current) => current ?? saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Resolves true when the audio was usable. */
  const add = useCallback(async (blob: Blob, source: VoiceSample["source"]) => {
    setError(null);
    setProcessing(true);
    try {
      const next = await createVoiceSample(blob, source);
      setSample(next);
      void saveVoiceSample(next);
      return true;
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof VoiceSampleError ? cause.message : "This audio couldn’t be used. Try another recording or file.");
      return false;
    } finally {
      setProcessing(false);
    }
  }, []);

  const remove = useCallback(async () => {
    setSample(null);
    setError(null);
    await deleteVoiceSample();
  }, []);

  return { sample, processing, error, add, remove };
}
