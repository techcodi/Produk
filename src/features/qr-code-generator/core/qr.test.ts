import { describe, expect, it } from "vitest";
import { contrastRatio, isInverted, wifiPayload } from "./qr";

describe("wifiPayload", () => {
  it("builds the standard Wi-Fi format with escaping", () => {
    expect(wifiPayload({ ssid: "Café;Home", password: 'p"a:ss\\', security: "WPA", hidden: false })).toBe(
      'WIFI:T:WPA;S:Café\\;Home;P:p\\"a\\:ss\\\\;;',
    );
  });

  it("omits the password for open networks and flags hidden ones", () => {
    expect(wifiPayload({ ssid: "Guest", password: "ignored", security: "nopass", hidden: true })).toBe("WIFI:T:nopass;S:Guest;H:true;;");
  });
});

describe("contrast", () => {
  it("computes WCAG contrast and spots inverted codes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#777777", "#888888")).toBeLessThan(1.5);
    expect(isInverted("#ffffff", "#000000")).toBe(true);
    expect(isInverted("#111111", "#ffffff")).toBe(false);
  });
});
