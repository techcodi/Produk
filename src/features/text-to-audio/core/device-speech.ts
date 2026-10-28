import type { TextChunk } from "../types";

export const isDeviceSpeechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * The device voice that best fits `lang`: exact match, then same language in
 * any region. Prefers on-device voices, which work offline and keep text local.
 */
export function pickDeviceVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const normalized = (tag: string) => tag.toLowerCase().replace("_", "-");
  const target = normalized(lang);
  const base = target.split("-")[0];
  const rank = (voice: SpeechSynthesisVoice) => {
    const tag = normalized(voice.lang);
    const languageScore = tag === target ? 2 : tag.split("-")[0] === base ? 1 : 0;
    return languageScore * 4 + (voice.localService ? 2 : 0) + (voice.default ? 1 : 0);
  };
  const best = [...voices].sort((a, b) => rank(b) - rank(a))[0];
  return best && rank(best) >= 4 ? best : null;
}

/**
 * Reads chunks aloud with the device's own voice. One utterance per sentence
 * sidesteps Chrome cutting long utterances off after ~15 seconds.
 * Returns a function that stops playback.
 */
export function speakWithDevice(
  chunks: TextChunk[],
  options: { voice: SpeechSynthesisVoice | null; lang: string; rate: number; onEnd: () => void },
): () => void {
  const synth = window.speechSynthesis;
  synth.cancel();
  let stopped = false;
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = options.voice?.lang ?? options.lang;
    utterance.voice = options.voice;
    utterance.rate = options.rate;
    if (index === chunks.length - 1) utterance.onend = () => !stopped && options.onEnd();
    utterance.onerror = (event) => {
      // "interrupted"/"canceled" is what stopping looks like; anything else ends playback too.
      if (!stopped) {
        stopped = true;
        synth.cancel();
        options.onEnd();
      }
      if (event.error !== "interrupted" && event.error !== "canceled") console.warn("Speech error:", event.error);
    };
    synth.speak(utterance);
  });
  return () => {
    stopped = true;
    synth.cancel();
  };
}
