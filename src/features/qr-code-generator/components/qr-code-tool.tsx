"use client";

import { useId, useMemo, useState } from "react";
import { AlertTriangle, Download, FileCode2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { canvasToBlob } from "@/lib/images";
import { triggerDownload } from "@/lib/download";
import { pluralize } from "@/lib/format";
import { DEFAULT_STYLE, DEFAULT_WIFI, DENSE_TEXT_CHARS, ERROR_CORRECTION_HINTS, MIN_CONTRAST, PNG_SIZES } from "../constants";
import { drawQr, encodeQr, matrixToSvg, QrTooLongError } from "@/lib/qr";
import { contrastRatio, isInverted, wifiPayload } from "../core/qr";
import type { ContentType, ErrorCorrection, QrStyle, WifiDetails, WifiSecurity } from "../types";

const FILE_BASE = "produk-qr-code";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function QrCodeTool() {
  const textId = useId();
  const [type, setType] = useState<ContentType>("text");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState<WifiDetails>(DEFAULT_WIFI);
  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE);
  const [pngSize, setPngSize] = useState<(typeof PNG_SIZES)[number]>(1024);

  const payload = type === "text" ? text : wifi.ssid.trim() ? wifiPayload(wifi) : "";

  const result = useMemo(() => {
    if (!payload) return { matrix: null, error: null };
    try {
      return { matrix: encodeQr(payload, style.errorCorrection), error: null };
    } catch (error) {
      return { matrix: null, error: error instanceof QrTooLongError ? error.message : "This text can’t be turned into a QR code." };
    }
  }, [payload, style.errorCorrection]);

  const svg = useMemo(() => (result.matrix ? matrixToSvg(result.matrix, style) : null), [result.matrix, style]);
  const contrast = contrastRatio(style.foreground, style.background);
  const inverted = isInverted(style.foreground, style.background);
  const updateStyle = (patch: Partial<QrStyle>) => setStyle((prev) => ({ ...prev, ...patch }));
  const updateWifi = (patch: Partial<WifiDetails>) => setWifi((prev) => ({ ...prev, ...patch }));

  const downloadPng = async () => {
    if (!result.matrix) return;
    const canvas = drawQr(result.matrix, pngSize, style);
    downloadBlob(await canvasToBlob(canvas, "image/png"), `${FILE_BASE}.png`);
  };

  const downloadSvg = () => svg && downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${FILE_BASE}.svg`);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section aria-label="QR code content" className="min-w-0 space-y-5 rounded-2xl border border-border bg-surface p-5">
        <SegmentedControl
          label="What should the code open?"
          value={type}
          options={[
            { value: "text", label: "Text or link" },
            { value: "wifi", label: "Wi-Fi network" },
          ]}
          onChange={setType}
        />

        {type === "text" ? (
          <div>
            <label htmlFor={textId} className="mb-2 block text-sm font-medium">
              Text, link, phone number… anything
            </label>
            <textarea
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              placeholder="https://example.com"
              className="w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand"
            />
            <p className="mt-1.5 text-xs text-muted">
              Whoever scans the code sees exactly this. Links open in their browser.
              {text.length > 0 && ` · ${pluralize(text.length, "character")}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <TextField label="Network name (SSID)" value={wifi.ssid} onChange={(ssid) => updateWifi({ ssid })} placeholder="MyHomeWiFi" />
            <SegmentedControl
              label="Security"
              value={wifi.security}
              options={[
                { value: "WPA", label: "WPA/WPA2/WPA3" },
                { value: "WEP", label: "WEP" },
                { value: "nopass", label: "None" },
              ]}
              onChange={(security: WifiSecurity) => updateWifi({ security })}
            />
            {wifi.security !== "nopass" && (
              <TextField label="Password" value={wifi.password} onChange={(password) => updateWifi({ password })} autoComplete="off" />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={wifi.hidden} onChange={(event) => updateWifi({ hidden: event.target.checked })} className="size-4 accent-brand" />
              Hidden network
            </label>
            <p className="text-xs text-muted">Scanning joins the network — no typing the password.</p>
          </div>
        )}

        <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
          <ColorField label="Code colour" value={style.foreground} onChange={(foreground) => updateStyle({ foreground })} />
          <ColorField label="Background" value={style.background} onChange={(background) => updateStyle({ background })} />
          <SegmentedControl
            label="Error correction"
            value={style.errorCorrection}
            options={(["L", "M", "Q", "H"] as ErrorCorrection[]).map((level) => ({ value: level, label: level }))}
            onChange={(errorCorrection) => updateStyle({ errorCorrection })}
            hint={ERROR_CORRECTION_HINTS[style.errorCorrection]}
          />
          <SegmentedControl
            label="Border"
            value={`${style.margin}`}
            options={[
              { value: "1", label: "Thin" },
              { value: "4", label: "Standard" },
              { value: "8", label: "Wide" },
            ]}
            onChange={(margin) => updateStyle({ margin: Number(margin) })}
            hint={style.margin < 4 ? "Some scanners need a wider border to find the code." : undefined}
          />
        </div>
      </section>

      <aside aria-label="Preview and download" className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <div className="mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
          {svg ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL, next/image adds nothing here
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="Your QR code" className="size-full" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted">
              <QrCode className="size-10" />
              {type === "text" ? "Type something to create your code" : "Enter the network name"}
            </div>
          )}
        </div>

        {result.error && (
          <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {result.error}
          </p>
        )}
        {svg && (contrast < MIN_CONTRAST || inverted) && (
          <p className="flex gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {inverted ? "Light codes on dark backgrounds don’t scan on some phones." : "These colours are too similar to scan reliably."}
          </p>
        )}
        {svg && type === "text" && text.length > DENSE_TEXT_CHARS && (
          <p className="text-xs text-muted">Long text makes a dense code. Print it larger, or use a link to a page instead.</p>
        )}

        <SegmentedControl
          label="PNG size"
          value={`${pngSize}`}
          options={PNG_SIZES.map((size) => ({ value: `${size}`, label: `${size}px` }))}
          onChange={(size) => setPngSize(Number(size) as (typeof PNG_SIZES)[number])}
          disabled={!svg}
        />
        <Button size="lg" className="w-full" onClick={downloadPng} disabled={!svg}>
          <Download /> Download PNG
        </Button>
        <Button variant="secondary" className="w-full" onClick={downloadSvg} disabled={!svg}>
          <FileCode2 /> Download SVG (for print)
        </Button>
        <p className="text-center text-xs text-muted">Codes never expire — they contain your text directly, not a tracking link.</p>
      </aside>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5 pr-3 focus-within:outline-2 focus-within:outline-brand">
        <input id={id} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="font-mono text-sm uppercase text-muted">{value}</span>
      </div>
    </div>
  );
}
