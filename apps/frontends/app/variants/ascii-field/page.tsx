import Link from "next/link";
import { Press, Reveal, Words } from "../_components/motion";
import { code, features } from "../_components/data";
import { AsciiField } from "./AsciiField";
import { Preview, Scramble, ScrollFade } from "./parts";

// Space Grotesk is already loaded by the root layout (--font-heading).
const display = "font-[family-name:var(--font-heading)]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300";
const eyebrow = "font-mono text-xs tracking-[0.25em] text-sky-300 uppercase";

const marks: Record<string, string> = { problems: "{ }", contests: ">_<", leaderboard: "/^\\", streaks: "~~~" };

export default function AsciiFieldVariant() {
  return (
    <div className={`cc-v ${display} relative flex-1 bg-[#08090c] text-slate-300`}>
      <section className="relative isolate overflow-hidden">
        <AsciiField className="absolute inset-0 -z-20 h-full w-full" />
        {/* scrim keeps the headline readable over the field */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(8,9,12,0.92)_0%,rgba(8,9,12,0.6)_45%,transparent_75%)]"
        />

        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
          <span className="font-mono text-sm text-white">codecrack_</span>
          <nav className="flex gap-5 text-sm">
            <Link href="/problems" className={`text-slate-200 hover:text-white ${focus}`}>
              Problems
            </Link>
            <Link href="/contests" className={`hidden text-slate-200 hover:text-white sm:inline ${focus}`}>
              Contests
            </Link>
            <Link href="/login" className={`text-slate-200 hover:text-white ${focus}`}>
              Sign in
            </Link>
          </nav>
        </header>

        <ScrollFade className="mx-auto flex min-h-[78vh] max-w-4xl flex-col items-center justify-center px-4 pt-8 pb-24 text-center sm:px-8">
          <p className={eyebrow}>
            <Scramble text="Competitive coding, live" />
          </p>
          <h1 className={`${display} mt-6 text-5xl leading-[0.95] font-medium tracking-tight text-white sm:text-7xl lg:text-8xl`}>
            <Words text="Find the signal in the noise." delay={0.2} />
          </h1>
          <Reveal delay={0.7}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
              Sharpen your thinking on real problems, race the clock in weekly contests and see
              exactly where you rank.
            </p>
          </Reveal>
          <Reveal delay={0.85} className="mt-10 flex flex-wrap justify-center gap-4">
            <Press>
              <Link
                href="/register"
                className={`block rounded-full bg-white px-7 py-3 font-medium text-black transition-colors hover:bg-sky-300 ${focus}`}
              >
                Start solving
              </Link>
            </Press>
            <Press>
              <Link
                href="/problems"
                className={`block rounded-full border border-white/30 px-7 py-3 font-medium text-white transition-colors hover:border-white ${focus}`}
              >
                Browse problems
              </Link>
            </Press>
          </Reveal>
          <p aria-hidden="true" className="mt-12 hidden font-mono text-xs text-slate-400 sm:block">
            move your pointer
          </p>
        </ScrollFade>
      </section>

      <section aria-labelledby="af-features" className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <p className={eyebrow}>
          <Scramble text="What you get" />
        </p>
        <h2 id="af-features" className={`${display} mt-3 max-w-2xl text-3xl font-medium tracking-tight text-white sm:text-5xl`}>
          Four loops that make you faster.
        </h2>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {features.map((f, i) => (
            <li key={f.key} className="group bg-[#08090c] p-6 transition-colors duration-300 hover:bg-[#0e1116] sm:p-8">
              <Reveal delay={i * 0.07}>
                <span
                  aria-hidden="true"
                  className="inline-block font-mono text-sky-300 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                >
                  {marks[f.key]}
                </span>
                <h3 className={`${display} mt-4 text-xl font-medium text-white`}>{f.title}</h3>
                <p className="mt-2 text-slate-300">{f.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <p className={eyebrow}>
            <Scramble text="Inside the product" />
          </p>
          <h2 className={`${display} mt-3 mb-8 text-3xl font-medium tracking-tight text-white sm:text-4xl`}>
            Everything one tab away.
          </h2>
          <Preview />
        </Reveal>
        <Reveal delay={0.1} className="self-end">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <p className="border-b border-white/10 px-5 py-3 font-mono text-xs text-slate-400">two_sum.py</p>
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-slate-200">{code.join("\n")}</pre>
            <p className="border-t border-white/10 px-5 py-3 font-mono text-xs text-emerald-300">
              Accepted - 42 ms - faster than 91%
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 border-t border-white/10 px-4 py-8 font-mono text-xs text-slate-400 sm:px-8">
        <span>codecrack_ / built for people who like hard problems</span>
        <Link href="/variants" className={`hover:text-white ${focus}`}>
          all variants
        </Link>
      </footer>
    </div>
  );
}
