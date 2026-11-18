// Original 5x5 bitmap letters (only the ones "CODECRACK" needs) and a tiny pixel-art renderer.
const GLYPHS: Record<string, string[]> = {
  C: [".####", "#....", "#....", "#....", ".####"],
  O: [".###.", "#...#", "#...#", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "####.", "#....", "#####"],
  R: ["####.", "#...#", "####.", "#..#.", "#...#"],
  A: [".###.", "#...#", "#####", "#...#", "#...#"],
  K: ["#...#", "#..#.", "###..", "#..#.", "#...#"],
};

export function glyph(ch: string): string[] {
  return GLYPHS[ch] ?? [".....", ".....", ".....", ".....", "....."];
}

/** Text as five lines of block characters, for <pre> ASCII banners. */
export function bannerLines(text: string, on = "█", off = " "): string[] {
  return [0, 1, 2, 3, 4].map((row) =>
    [...text]
      .map((ch) => [...(glyph(ch)[row] ?? "")].map((p) => (p === "#" ? on : off)).join(""))
      .join(" "),
  );
}

/** Rows of characters -> crisp SVG pixels. Characters missing from the palette are transparent. */
export function PixelArt({
  rows,
  palette,
  className,
}: {
  rows: readonly string[];
  palette: Record<string, string>;
  className?: string;
}) {
  const paths: Record<string, string> = {};
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = palette[ch];
      if (fill) paths[fill] = (paths[fill] ?? "") + `M${x} ${y}h1v1h-1z`;
    });
  });
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={`0 0 ${rows[0]?.length ?? 1} ${rows.length}`}
      shapeRendering="crispEdges"
    >
      {Object.entries(paths).map(([fill, d]) => (
        <path key={fill} d={d} fill={fill} />
      ))}
    </svg>
  );
}
