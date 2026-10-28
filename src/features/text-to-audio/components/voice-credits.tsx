import { CLONE_LICENSE_URL, ESPEAK_SOURCE_URL, PHONEMIZER_SOURCE_URL, VOICES } from "../constants";

const link = "underline underline-offset-2 hover:text-foreground";

/** Licence notices: CC BY voices require attribution, and espeak-ng (GPL-3.0) requires pointing to its source. */
export function VoiceCredits() {
  const credited = VOICES.filter((voice) => voice.credit);
  return (
    <details className="rounded-xl bg-surface-muted p-4 text-xs text-muted">
      <summary className="cursor-pointer font-medium text-foreground">Voice credits & licences</summary>
      <div className="mt-3 space-y-2">
        <p>
          Speech is generated on your device with{" "}
          <a className={link} href="https://github.com/rhasspy/piper" target="_blank" rel="noreferrer">
            Piper
          </a>{" "}
          voices (MIT) and{" "}
          <a className={link} href="https://onnxruntime.ai" target="_blank" rel="noreferrer">
            ONNX Runtime
          </a>{" "}
          (MIT).
        </p>
        <p>
          Text is converted to phonemes by{" "}
          <a className={link} href={ESPEAK_SOURCE_URL} target="_blank" rel="noreferrer">
            eSpeak NG
          </a>
          , licensed under the GNU GPL v3.0 or later and shipped unmodified as a separate WebAssembly module. Its source
          code, including the WebAssembly build, is available at{" "}
          <a className={link} href={PHONEMIZER_SOURCE_URL} target="_blank" rel="noreferrer">
            piper-wasm
          </a>{" "}
          and{" "}
          <a className={link} href={ESPEAK_SOURCE_URL} target="_blank" rel="noreferrer">
            espeak-ng
          </a>
          .
        </p>
        <p>
          “Your own voice” uses{" "}
          <a className={link} href={CLONE_LICENSE_URL} target="_blank" rel="noreferrer">
            Chatterbox
          </a>{" "}
          by Resemble AI (MIT) through{" "}
          <a className={link} href="https://github.com/huggingface/transformers.js" target="_blank" rel="noreferrer">
            Transformers.js
          </a>{" "}
          (Apache-2.0). Your voice sample is processed and stored only on this device.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          {VOICES.map((voice) => (
            <li key={voice.id}>
              {voice.name} ({voice.language}): {voice.credit ?? voice.license}
            </li>
          ))}
        </ul>
        {credited.length > 0 && <p>Voices marked CC BY 4.0 are used under the Creative Commons Attribution 4.0 licence.</p>}
      </div>
    </details>
  );
}
