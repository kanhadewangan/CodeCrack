import Link from "next/link";
import type { ReactNode } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import { Press, Reveal, Words } from "../_components/motion";
import { code, features, leaders, problems } from "../_components/data";
import { Dither } from "./Dither";
import { ProgressRule } from "./parts";

const display = Bricolage_Grotesque({ subsets: ["latin"] });

const focus = "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#d7331a]";
const h2 = `${display.className} text-4xl leading-none font-extrabold tracking-tight text-[#111] uppercase sm:text-6xl`;
const label = "font-mono text-xs tracking-widest text-neutral-700 uppercase";
const edge = "pointer-events-none absolute overflow-hidden font-mono text-sm leading-none whitespace-pre text-[#111] select-none";

/** A horizontal rule made of characters; overflow is clipped so it fits any width. */
function Rule({ ch = "=" }: { ch?: string }) {
  return (
    <div aria-hidden="true" className="overflow-hidden font-mono text-sm leading-none whitespace-nowrap text-[#111] select-none">
      {ch.repeat(400)}
    </div>
  );
}

/** A box whose border is drawn with box-drawing characters instead of CSS borders. */
function AsciiBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative p-6 sm:p-8 ${className}`}>
      <div aria-hidden="true">
        <span className={`${edge} inset-x-[0.6em] top-0`}>{"─".repeat(400)}</span>
        <span className={`${edge} inset-x-[0.6em] bottom-0`}>{"─".repeat(400)}</span>
        <span className={`${edge} inset-y-[0.9em] left-0`}>{"│\n".repeat(200)}</span>
        <span className={`${edge} inset-y-[0.9em] right-0`}>{"│\n".repeat(200)}</span>
        <span className={`${edge} top-0 left-0`}>┌</span>
        <span className={`${edge} top-0 right-0`}>┐</span>
        <span className={`${edge} bottom-0 left-0`}>└</span>
        <span className={`${edge} right-0 bottom-0`}>┘</span>
      </div>
      {children}
    </div>
  );
}

const ticker = "CONTEST 88 IS LIVE /// 412 CODERS IN THE ROOM /// 1,204 PROBLEMS /// NEW SET EVERY SUNDAY /// ";

export default function EditorialVariant() {
  return (
    <div className="cc-v relative flex-1 bg-[#f3efe6] font-sans text-[#111]">
      <ProgressRule />

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-5">
          <span className={`${display.className} text-2xl font-extrabold tracking-tight`}>CodeCrack</span>
          <span className={`${label} hidden md:inline`}>Vol. 01 / Issue 204 / The daily problem</span>
          <nav className="flex gap-5 text-sm font-semibold">
            <Link href="/problems" className={`underline-offset-4 hover:underline ${focus}`}>
              Problems
            </Link>
            <Link href="/leaderboard" className={`underline-offset-4 hover:underline ${focus}`}>
              Standings
            </Link>
            <Link href="/login" className={`underline-offset-4 hover:underline ${focus}`}>
              Sign in
            </Link>
          </nav>
        </header>
        <Rule />

        <section className="grid items-end gap-8 py-10 sm:py-16 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className={label}>Competitive coding, without the noise</p>
            <h1
              className={`${display.className} mt-4 text-[clamp(3rem,11vw,8.5rem)] leading-[0.86] font-extrabold tracking-tighter text-[#111] uppercase`}
            >
              <Words text="Think hard. Type less. Rank up." />
            </h1>
            <Reveal delay={0.5}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-800">
                A plain, fast place to solve problems, sit timed contests and keep an honest record
                of how you are doing.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Press>
                  <Link
                    href="/register"
                    className={`block border-2 border-[#111] bg-[#111] px-6 py-3 font-bold text-[#f3efe6] uppercase shadow-[5px_5px_0_#d7331a] ${focus}`}
                  >
                    Create account
                  </Link>
                </Press>
                <Press>
                  <Link
                    href="/problems"
                    className={`block border-2 border-[#111] px-6 py-3 font-bold text-[#111] uppercase transition-colors hover:bg-[#111] hover:text-[#f3efe6] ${focus}`}
                  >
                    Read the problems
                  </Link>
                </Press>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.2} className="mx-auto w-full max-w-sm lg:max-w-none">
            <AsciiBox className="!p-3">
              <Dither className="block w-full text-[#111]" />
            </AsciiBox>
            <p className={`${label} mt-2`}>Fig. 1: a hard problem, shortly before it cracks.</p>
          </Reveal>
        </section>
      </div>

      {/* ticker: the visible strip is decorative, the same text is available once to screen readers */}
      <div className="overflow-hidden border-y-2 border-[#111] bg-[#111] py-2 font-mono text-sm text-[#f3efe6]">
        <p className="sr-only">{ticker}</p>
        <div aria-hidden="true" className="cc-marquee flex w-max whitespace-nowrap">
          <span>{ticker.repeat(3)}</span>
          <span>{ticker.repeat(3)}</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <section aria-labelledby="ed-features" className="py-14 sm:py-20">
          <h2 id="ed-features" className={h2}>
            The four parts
          </h2>
          <ol className="mt-10">
            {features.map((f, i) => (
              <li key={f.key}>
                <Rule ch="-" />
                <Reveal
                  delay={i * 0.05}
                  className="group grid gap-x-8 gap-y-2 py-6 sm:grid-cols-[6rem_1fr_1.4fr] sm:items-baseline"
                >
                  <span className="font-mono text-sm text-[#b02a15]">{`0${i + 1}`}</span>
                  <h3
                    className={`${display.className} text-3xl font-extrabold tracking-tight text-[#111] uppercase transition-transform duration-300 group-hover:translate-x-2 motion-reduce:transition-none`}
                  >
                    {f.title}
                  </h3>
                  <p className="text-lg text-neutral-800">{f.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
          <Rule ch="-" />
        </section>

        <section className="grid gap-10 pb-14 sm:pb-20 lg:grid-cols-2">
          <Reveal>
            <h2 className={h2}>Today&apos;s set</h2>
            <AsciiBox className="mt-6">
              <ul>
                {problems.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-4 border-b border-dashed border-neutral-400 py-2.5 last:border-0">
                    <span className="w-8 font-mono text-sm text-neutral-700">{p.id}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
                    <span className="font-mono text-xs text-neutral-800 uppercase">{p.level}</span>
                  </li>
                ))}
              </ul>
            </AsciiBox>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className={h2}>Standings</h2>
            <table className="mt-6 w-full border-collapse text-left">
              <thead>
                <tr className={label}>
                  <th scope="col" className="border-b-2 border-[#111] py-2 font-normal">
                    No.
                  </th>
                  <th scope="col" className="border-b-2 border-[#111] py-2 font-normal">
                    Coder
                  </th>
                  <th scope="col" className="border-b-2 border-[#111] py-2 text-right font-normal">
                    Rating
                  </th>
                  <th scope="col" className="border-b-2 border-[#111] py-2 text-right font-normal">
                    Streak
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.name} className="transition-colors hover:bg-[#111] hover:text-[#f3efe6]">
                    <td className="border-b border-neutral-400 py-2.5 font-mono text-sm">{l.rank}</td>
                    <td className="border-b border-neutral-400 py-2.5 font-semibold">{l.name}</td>
                    <td className="border-b border-neutral-400 py-2.5 text-right font-mono text-sm">{l.score}</td>
                    <td className="border-b border-neutral-400 py-2.5 text-right font-mono text-sm">{l.streak}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </section>

        <section className="pb-14 sm:pb-20">
          <Reveal>
            <AsciiBox>
              <p className={label}>Exhibit A / two_sum.py / accepted in 42 ms</p>
              <pre className="mt-4 overflow-x-auto text-sm leading-relaxed text-[#111]">{code.join("\n")}</pre>
            </AsciiBox>
          </Reveal>
        </section>

        <Rule />
        <footer className="flex flex-wrap justify-between gap-3 py-6 font-mono text-xs text-neutral-700 uppercase">
          <span>CodeCrack / printed on the internet</span>
          <Link href="/variants" className={`underline-offset-4 hover:underline ${focus}`}>
            All variants
          </Link>
        </footer>
      </div>
    </div>
  );
}
