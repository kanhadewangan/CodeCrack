import Link from "next/link";
import { Silkscreen } from "next/font/google";
import { Press, Reveal } from "../_components/motion";
import { PixelArt, glyph } from "../_components/glyphs";
import { code, features, leaders, problems } from "../_components/data";
import { Drop, Pop, Score, Walker } from "./parts";

const px = Silkscreen({ weight: ["400", "700"], subsets: ["latin"] });

const focus =
  "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-cyan-300";
const h2 = `${px.className} mb-6 text-center text-2xl font-bold text-yellow-300 sm:text-3xl [text-shadow:3px_3px_0_#be185d]`;
const panel = "border-4 border-white bg-[#1b0f3d] shadow-[6px_6px_0_#000]";

// Original sprites. One character per pixel, see `pal` for the colours.
const pal = { k: "#f472b6", d: "#0b0420", w: "#ffffff", y: "#fde047", o: "#fb923c", r: "#ef4444", c: "#67e8f9", g: "#4ade80" };
const bugA = [
  "..k......k..",
  "...k....k...",
  "..gggggggg..",
  ".gwdggggwdg.",
  ".gggggggggg.",
  "k.gggyyggg.k",
  ".kggggggggk.",
  "..k.gggg.k..",
  ".k..k..k..k.",
];
const bugB = [
  "...k....k...",
  "...k....k...",
  "..gggggggg..",
  ".gwdggggwdg.",
  ".gggggggggg.",
  ".kgggyygggk.",
  "k.gggggggg.k",
  "..k.gggg.k..",
  "..k.k..k.k..",
];
const sprites: Record<string, string[]> = {
  problems: [".ccc.....", "c...c....", "c...ccccc", "c...c.c.c", ".ccc....."],
  contests: ["....yy.", "...yy..", "..yy...", ".yyyyy.", "...yy..", "..yy...", ".yy....", "yy....."],
  leaderboard: [".yyyyyyy.", "y.yyyyy.y", "y.yywyy.y", ".yyyyyyy.", "..yyyyy..", "...yyy...", "....y....", "...yyy...", "..ooooo.."],
  streaks: ["...r...", "..rr...", "..rrr..", ".rror.r", ".rooorr", "rroyorr", "rroyyor", ".royyr.", "..rrr.."],
};
const letterFill = ["#fde047", "#f472b6", "#67e8f9"];

function Logo({ word, offset }: { word: string; offset: number }) {
  return (
    <span className="flex gap-1.5 lg:gap-2.5">
      {[...word].map((ch, i) => (
        <Drop key={i} index={offset + i}>
          <PixelArt
            rows={glyph(ch)}
            palette={{ "#": letterFill[(offset + i) % 3] ?? "#fff" }}
            className="block w-12 [filter:drop-shadow(4px_4px_0_#000)] lg:w-20"
          />
        </Drop>
      ))}
    </span>
  );
}

export default function ArcadeVariant() {
  return (
    <div className={`cc-v ${px.className} relative flex-1 overflow-hidden bg-[#12082b] text-white`}>
      <div aria-hidden="true" className="cc-stars cc-twinkle pointer-events-none absolute top-0 left-0" />

      <header className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-4 border-white px-4 py-3 text-sm sm:px-8">
        <span>
          P1 <span className="text-yellow-300">004200</span>
        </span>
        <span className="hidden sm:inline">
          HI <span className="text-pink-400">098420</span>
        </span>
        <nav className="flex gap-4">
          <Link href="/problems" className={`hover:text-yellow-300 ${focus}`}>
            Stages
          </Link>
          <Link href="/leaderboard" className={`hover:text-yellow-300 ${focus}`}>
            Scores
          </Link>
          <Link href="/login" className={`hover:text-yellow-300 ${focus}`}>
            Login
          </Link>
        </nav>
      </header>

      <section className="relative px-4 pt-14 pb-24 text-center sm:px-8 sm:pt-20">
        <div aria-hidden="true" className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:gap-6">
          <Logo word="CODE" offset={0} />
          <Logo word="CRACK" offset={4} />
        </div>

        <h1 className={`${px.className} mx-auto mt-10 max-w-2xl text-2xl leading-tight font-bold text-white sm:text-4xl`}>
          <span className="sr-only">CodeCrack. </span>Squash the bug. Take the high score.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-indigo-200 sm:text-base">
          Problems are stages. Contests are boss fights. Your streak is your extra life.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <Press>
            <Link
              href="/register"
              className={`block border-4 border-black bg-yellow-300 px-6 py-3 text-lg font-bold text-black shadow-[6px_6px_0_#be185d] ${focus}`}
            >
              <span aria-hidden="true" className="cc-blink">
                {"> "}
              </span>
              Press Start
            </Link>
          </Press>
          <Press>
            <Link
              href="/problems"
              className={`block border-4 border-white px-6 py-3 text-lg font-bold text-white shadow-[6px_6px_0_#000] hover:bg-white hover:text-black ${focus}`}
            >
              Select Stage
            </Link>
          </Press>
        </div>

        {/* a bug marches along the floor, two-frame walk cycle */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 border-b-4 border-dashed border-pink-500">
          <Walker>
            <span className="relative block">
              <PixelArt rows={bugA} palette={pal} className="cc-frame-a block w-full" />
              <PixelArt rows={bugB} palette={pal} className="cc-frame-b absolute inset-0 block w-full" />
            </span>
          </Walker>
        </div>
      </section>

      <section aria-labelledby="arc-features" className="relative mx-auto max-w-5xl px-4 py-14 sm:px-8">
        <h2 id="arc-features" className={h2}>
          Power-ups
        </h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <li key={f.key}>
              <Pop delay={i * 0.08} className={`${panel} h-full p-5 text-center`}>
                <PixelArt rows={sprites[f.key] ?? []} palette={pal} className="mx-auto mb-4 block h-16 w-16" />
                <h3 className={`${px.className} mb-2 text-lg font-bold text-cyan-300`}>{f.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-indigo-100">{f.text}</p>
              </Pop>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:px-8 lg:grid-cols-2">
        <Reveal className={`${panel} p-5`}>
          <h2 className={h2}>Stage select</h2>
          <ul className="text-sm">
            {problems.map((p) => {
              const hp = p.level === "Easy" ? 1 : p.level === "Medium" ? 2 : 3;
              return (
                <li key={p.id} className="flex items-center gap-3 border-b-2 border-dashed border-indigo-700 py-2.5">
                  <span className="text-pink-400">{String(p.id).padStart(3, "0")}</span>
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="sr-only">{p.level}</span>
                  <span aria-hidden="true" className="flex gap-1">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`block h-3 w-3 ${n <= hp ? "bg-red-500" : "bg-indigo-900"}`} />
                    ))}
                  </span>
                  <span className={p.solved ? "text-green-400" : "text-indigo-300"}>{p.solved ? "CLEAR" : "NEW"}</span>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className={`${panel} p-5`}>
          <h2 className={h2}>High scores</h2>
          <ol className="text-sm sm:text-base">
            {leaders.map((l) => (
              <li key={l.name} className="flex items-center gap-3 py-2">
                <span className={l.rank === 1 ? "text-yellow-300" : "text-indigo-300"}>{l.rank}.</span>
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="text-cyan-300">
                  <Score value={l.score} />
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <Reveal className={`${panel} p-5`}>
          <h2 className={h2}>Cheat code</h2>
          <pre className="overflow-x-auto bg-black p-4 text-xs leading-relaxed text-green-400 sm:text-sm">{code.join("\n")}</pre>
          <p className="mt-4 text-center text-yellow-300">Stage clear! +100</p>
        </Reveal>
      </section>

      <footer className="relative flex flex-wrap justify-between gap-3 border-t-4 border-white px-4 py-6 text-xs text-indigo-200 sm:px-8">
        <span>Credits 01 - CodeCrack</span>
        <Link href="/variants" className={`hover:text-yellow-300 ${focus}`}>
          Back to variants
        </Link>
      </footer>
    </div>
  );
}
