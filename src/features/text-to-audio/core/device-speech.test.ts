import { describe, expect, it } from "vitest";
import { pickDeviceVoice } from "./device-speech";

const voice = (lang: string, extra: Partial<SpeechSynthesisVoice> = {}) =>
  ({ lang, name: lang, localService: false, default: false, voiceURI: lang, ...extra }) as SpeechSynthesisVoice;

describe("pickDeviceVoice", () => {
  it("prefers an exact language and region match", () => {
    expect(pickDeviceVoice([voice("en-US"), voice("en-GB")], "en-GB")?.lang).toBe("en-GB");
  });

  it("falls back to the same language in another region", () => {
    expect(pickDeviceVoice([voice("fr-CA"), voice("de-DE")], "fr-FR")?.lang).toBe("fr-CA");
  });

  it("prefers on-device voices among equal matches, and tolerates underscores", () => {
    const local = voice("es_MX", { name: "local", localService: true });
    expect(pickDeviceVoice([voice("es-MX", { name: "remote" }), local], "es-MX")?.name).toBe("local");
  });

  it("returns null when no voice speaks the language", () => {
    expect(pickDeviceVoice([voice("en-US")], "nl-NL")).toBeNull();
    expect(pickDeviceVoice([], "en-US")).toBeNull();
  });
});
