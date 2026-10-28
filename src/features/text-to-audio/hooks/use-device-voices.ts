"use client";

import { useSyncExternalStore } from "react";
import { isDeviceSpeechSupported } from "../core/device-speech";

const EMPTY: SpeechSynthesisVoice[] = [];
let snapshot: SpeechSynthesisVoice[] = EMPTY;

function subscribe(onChange: () => void) {
  if (!isDeviceSpeechSupported()) return () => {};
  const update = () => {
    snapshot = window.speechSynthesis.getVoices();
    onChange();
  };
  window.speechSynthesis.addEventListener("voiceschanged", update);
  update();
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
}

/** The device's built-in voices. Most browsers load them asynchronously, so this starts empty. */
export const useDeviceVoices = () =>
  useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
