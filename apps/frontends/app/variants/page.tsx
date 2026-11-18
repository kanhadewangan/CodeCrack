import Link from "next/link";
import { Reveal } from "./_components/motion";
import { variants } from "./_components/data";

export default function VariantsIndex() {
  return (
    <div className="cc-v mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-8">
      <p className="font-mono text-xs tracking-widest text-[var(--purple-3)] uppercase">Design exploration</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Landing page variants</h1>
      <p className="mt-4 text-[var(--text-body)]">
        Four directions for the CodeCrack start screen. Sample content only, no sign-in needed.
      </p>
      <ol className="mt-10 grid gap-4">
        {variants.map((v, i) => (
          <li key={v.slug}>
            <Reveal delay={i * 0.06}>
              <Link
                href={`/variants/${v.slug}`}
                className="block rounded-xl border border-white/10 bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--purple-2)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--purple-3)]"
              >
                <span className="font-mono text-xs text-[var(--text-body)]">
                  0{i + 1} / /variants/{v.slug}
                </span>
                <span className="mt-1 block text-xl font-semibold text-[var(--text-heading)]">{v.name}</span>
                <span className="mt-1 block text-[var(--text-body)]">{v.text}</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ol>
      <p className="mt-10">
        <Link href="/" className="text-[var(--text-body)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--purple-3)]">
          Back to the app
        </Link>
      </p>
    </div>
  );
}
