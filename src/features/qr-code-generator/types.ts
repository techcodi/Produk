import type { ErrorCorrection } from "@/lib/qr";

export type { ErrorCorrection };
export type ContentType = "text" | "wifi";
export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiDetails {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

export interface QrStyle {
  foreground: string;
  background: string;
  errorCorrection: ErrorCorrection;
  /** Quiet zone around the code, in modules. Scanners need about 4. */
  margin: number;
}
