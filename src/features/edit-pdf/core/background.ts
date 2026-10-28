export type Rgb = [number, number, number];

const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * Picks the background colour around a piece of text from pixels sampled just
 * outside it: the most common colour (bucketed so anti-aliasing noise doesn't
 * matter), preferring the lighter one on a tie since text is usually darker
 * than what it sits on.
 */
export function pickBackground(samples: Rgb[]): string {
  if (samples.length === 0) return "#ffffff";
  const buckets = new Map<string, { count: number; sum: Rgb }>();

  for (const sample of samples) {
    const key = sample.map((v) => Math.round(v / 16)).join(",");
    const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
    bucket.count += 1;
    bucket.sum = [bucket.sum[0] + sample[0], bucket.sum[1] + sample[1], bucket.sum[2] + sample[2]];
    buckets.set(key, bucket);
  }

  const lightness = ({ sum, count }: { sum: Rgb; count: number }) => (sum[0] + sum[1] + sum[2]) / count;
  const best = [...buckets.values()].sort((a, b) => b.count - a.count || lightness(b) - lightness(a))[0];
  return toHex([best.sum[0] / best.count, best.sum[1] / best.count, best.sum[2] / best.count]);
}
