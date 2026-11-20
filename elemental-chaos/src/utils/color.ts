/** Converte 0xRRGGBB em `rgba(...)` para Canvas 2D. */
export function rgba(hex: number, alpha = 1): string {
  return `rgba(${(hex >> 16) & 255}, ${(hex >> 8) & 255}, ${hex & 255}, ${alpha})`;
}

/** Mistura linear entre duas cores 0xRRGGBB. */
export function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
