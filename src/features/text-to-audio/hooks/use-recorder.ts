"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_MAX_SECONDS } from "../constants";

type RecorderState = { status: "idle" } | { status: "recording"; seconds: number } | { status: "error"; message: string };

/** Records from the microphone, stopping on its own at the longest useful sample length. */
export function useRecorder(onRecorded: (audio: Blob) => void) {
  const [state, setState] = useState<RecorderState>({ status: "idle" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRecordedRef = useRef(onRecorded);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
  });

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState({ status: "error", message: "Recording isn’t supported in this browser. Upload a file instead." });
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      setState({ status: "error", message: "Microphone access was blocked. Allow it in your browser settings, or upload a file." });
      return;
    }

    const recorder = new MediaRecorder(stream);
    const parts: Blob[] = [];
    recorder.ondataavailable = (event) => event.data.size > 0 && parts.push(event.data);
    recorder.onstop = () => {
      cleanup();
      setState({ status: "idle" });
      onRecordedRef.current(new Blob(parts, { type: recorder.mimeType }));
    };
    recorderRef.current = recorder;
    recorder.start();

    const startedAt = Date.now();
    setState({ status: "recording", seconds: 0 });
    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setState({ status: "recording", seconds });
      if (seconds >= SAMPLE_MAX_SECONDS) stop();
    }, 200);
  }, [cleanup, stop]);

  return { state, start, stop };
}
