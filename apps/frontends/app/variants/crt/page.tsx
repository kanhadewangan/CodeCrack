import Link from "next/link";
import { VT323 } from "next/font/google";
import { Press, Reveal } from "../_components/motion";
import { bannerLines } from "../_components/glyphs";
import { code, features, leaders, problems } from "../_components/data";
import { TypeLines } from "./Boot";

const vt = VT323({ weight: "400", subsets: ["latin"] });

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300";
const h2 = `${vt.className} mb-4 text-2xl font-normal text-amber-300`;

const boot = [
  "[ OK ] mounting /problems ............ 1204 found",
  "[ OK ] starting judge workers ........ 8 online",
  "[ OK ] syncing leaderboard ........... live",
  "[ OK ] restoring streak .............. 12 days",
  "> system ready. awaiting input_",
];

const icons: Record<string, string> = {
  problems: ["+---+", "| ? |", "+---+"].join("\n"),
  contests: ["\\   /", " >-< ", "/   \\"].join("\n"),
  leaderboard: ["  #  ", " ##  ", " ### "].join("\n"),
  streaks: [" . : ", ".:|:.", " '-' "].join("\n"),
};

const logo = "block font-mono leading-none whitespace-pre text-green-400";

export default function CrtVariant() {
  return (
    <div
      className={`cc-v ${vt.className} relative flex-1 overflow-hidden bg-[#030a05] text-xl leading-snug text-green-400 [text-shadow:0_0_8px_rgba(74,222,128,0.5)]`}
    >
      {/* CRT glass: scanlines, a faint flicker and a slow refresh sweep. All decorative. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
        <div className="cc-scanlines absolute inset-0" />
        <div className="cc-flicker absolute inset-0 bg-green-400/[0.03]" />
        <div className="cc-sweep absolute inset-x-0 top-0 h-[30vh]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-green-900 py-4">
          <span>
            <span className="text-amber-300">guest@codecrack</span>:~$
          </span>
          <nav className="flex gap-5">
            <Link href="/problems" className={`hover:text-amber-300 ${focus}`}>
              ./problems
            </Link>
            <Link href="/leaderboard" className={`hover:text-amber-300 ${focus}`}>
              ./ranks
            </Link>
            <Link href="/login" className={`hover:text-amber-300 ${focus}`}>
              ./login
            </Link>
          </nav>
        </header>

        <section className="py-12 sm:py-20">
          <div aria-hidden="true" className="cc-glitch mb-8">
            <pre className={`${logo} hidden text-[13px] sm:block md:text-[17px]`}>
              {bannerLines("CODECRACK").join("\n")}
            </pre>
            <pre className={`${logo} text-[length:min(17px,calc((100vw_-_32px)/18))] sm:hidden`}>
              {[...bannerLines("CODE"), "", ...bannerLines("CRACK")].join("\n")}
            </pre>
          </div>

          <h1 className={`${vt.className} max-w-3xl text-4xl leading-none font-normal text-green-300 sm:text-6xl`}>
            Crack the problem. Ship the solution.
            <span aria-hidden="true" className="cc-blink ml-2 inline-block h-[0.8em] w-[0.5em] bg-green-300 align-baseline" />
          </h1>
          <p className="mt-4 max-w-2xl text-green-500">
            CodeCrack is a competitive-coding platform: solve problems, enter live contests, climb the
            leaderboard and keep your streak alive.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Press>
              <Link
                href="/register"
                className={`block bg-green-400 px-5 py-2 text-2xl text-black [text-shadow:none] hover:bg-amber-300 ${focus}`}
              >
                [ create account ]
              </Link>
            </Press>
            <Press>
              <Link
                href="/problems"
                className={`block border border-green-400 px-5 py-2 text-2xl hover:border-amber-300 hover:text-amber-300 ${focus}`}
              >
                [ browse problems ]
              </Link>
            </Press>
          </div>

          <TypeLines lines={boot} className="mt-10 border-l-2 border-green-800 pl-4 text-green-500" />
        </section>

        <section aria-labelledby="crt-features" className="py-10">
          <h2 id="crt-features" className={h2}>
            $ man codecrack
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={f.key}>
                <Reveal
                  delay={i * 0.08}
                  className="group flex h-full gap-4 border border-green-800 p-4 transition-colors duration-150 hover:bg-green-400 hover:text-black hover:[text-shadow:none]"
                >
                  <pre aria-hidden="true" className="shrink-0 text-sm leading-tight text-amber-300 group-hover:text-black">
                    {icons[f.key]}
                  </pre>
                  <div>
                    <h3 className={`${vt.className} text-2xl font-normal text-inherit uppercase`}>{f.title}</h3>
                    <p className="text-green-500 group-hover:text-black">{f.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-10 py-10 lg:grid-cols-2">
          <Reveal>
            <h2 className={h2}>$ ls -l problems/</h2>
            <ul>
              {problems.map((p) => (
                <li key={p.id} className="flex gap-3 border-b border-green-950 py-1">
                  <span className={p.solved ? "text-green-300" : "text-green-700"}>
                    <span aria-hidden="true">{p.solved ? "[x]" : "[ ]"}</span>
                    <span className="sr-only">{p.solved ? "solved" : "unsolved"}</span>
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {String(p.id).padStart(3, "0")} {p.title}
                  </span>
                  <span className={p.level === "Easy" ? "text-green-300" : p.level === "Medium" ? "text-amber-300" : "text-red-400"}>
                    {p.level.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className={h2}>$ cat two_sum.py</h2>
            <pre className="overflow-x-auto border border-green-800 p-4 text-sm leading-relaxed text-green-300">
              {code.join("\n")}
            </pre>
            <p className="mt-2 text-amber-300">{">> ACCEPTED  42 ms  14.1 MB"}</p>
          </Reveal>
        </section>

        <section aria-labelledby="crt-top" className="py-10">
          <h2 id="crt-top" className={h2}>
            $ top --leaderboard
          </h2>
          <ol>
            {leaders.map((l, i) => (
              <li key={l.name}>
                <Reveal delay={i * 0.06} y={10} className="flex flex-wrap items-baseline gap-x-4 py-1">
                  <span className="w-8 text-amber-300">#{l.rank}</span>
                  <span className="w-40">{l.name}</span>
                  <span aria-hidden="true" className="hidden font-mono text-sm text-green-500 sm:inline">
                    {"█".repeat(Math.round(l.score / 5000)) + "░".repeat(20 - Math.round(l.score / 5000))}
                  </span>
                  <span className="ml-auto">{l.score} pts</span>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <footer className="flex flex-wrap justify-between gap-3 border-t border-green-900 pt-6 text-green-500">
          <span>codecrack v1.0 -- connection closed by foreign host.</span>
          <Link href="/variants" className={`hover:text-amber-300 ${focus}`}>
            cd ../variants
          </Link>
        </footer>
      </div>
    </div>
  );
}
