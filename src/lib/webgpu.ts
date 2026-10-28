interface GpuAdapter {
  features: { has(feature: string): boolean };
}

type NavigatorWithGpu = Navigator & { gpu?: { requestAdapter(): Promise<GpuAdapter | null> } };

let fp16Support: Promise<boolean> | null = null;

/**
 * True when WebGPU can run fp16 models well: the adapter must support
 * `shader-f16`. A bare "has WebGPU" check isn't enough. GPUs without it (common
 * on older integrated graphics) run fp16 weights far slower than plain
 * WebAssembly, so callers should fall back to WASM when this is false.
 * Works in workers as well as on the main thread.
 */
export function hasFp16WebGpu(): Promise<boolean> {
  fp16Support ??= (async () => {
    const gpu = (navigator as NavigatorWithGpu).gpu;
    if (!gpu) return false;
    try {
      const adapter = await gpu.requestAdapter();
      return Boolean(adapter?.features.has("shader-f16"));
    } catch {
      return false;
    }
  })();
  return fp16Support;
}
