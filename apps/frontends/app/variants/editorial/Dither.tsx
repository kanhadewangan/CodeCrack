// Original illustration: a lit sphere with a crack down it, ordered-dithered (4x4 Bayer) to 1-bit pixels.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const N = 72;

function darkness(x: number, y: number): number {
  const nx = (x - 36) / 25;
  const ny = (y - 32) / 25;
  const r2 = nx * nx + ny * ny;
  if (r2 <= 1) {
    // the crack: a zigzag running top to bottom, left blank (paper)
    const zig = 36 + (((y >> 2) % 2 === 0 ? 1 : -1) * ((y % 4) - 1.5)) * 1.6 + (y - 32) * 0.12;
    if (Math.abs(x - zig) < 1.6) return 0;
    const nz = Math.sqrt(1 - r2);
    const light = Math.max(0, -0.5 * nx - 0.6 * ny + 0.62 * nz);
    return 0.95 - light * 0.62;
  }
  // cast shadow on the ground, then a faint sky-to-floor gradient
  const sx = (x - 42) / 26;
  const sy = (y - 60) / 5;
  const shadow = Math.max(0, 1 - (sx * sx + sy * sy)) * 0.7;
  return Math.max(shadow, 0.04 + (y / N) * 0.14);
}

export function Dither({ className }: { className?: string }) {
  let d = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const threshold = ((BAYER[y % 4]?.[x % 4] ?? 0) + 0.5) / 16;
      if (darkness(x, y) > threshold) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <svg aria-hidden="true" className={className} viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
