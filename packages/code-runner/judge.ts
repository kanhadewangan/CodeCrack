// Pure judging logic: no Docker or DB imports, so it can be unit tested.

export type Verdict = "ACCEPTED" | "WRONG_ANSWER" | "TIME_LIMIT_EXCEEDED" | "RUNTIME_ERROR";

export const PER_TEST_SECONDS = 2;

const node = { image: "node:20-alpine", cmd: "node" };
const python = { image: "python:3.11-alpine", cmd: "python3" };
const RUNNERS: Record<string, { image: string; cmd: string }> = {
  javascript: node,
  js: node,
  python,
  py: python,
};

export function runnerFor(language: string) {
  const runner = RUNNERS[language.toLowerCase()];
  if (!runner) throw new Error(`Unsupported language: ${language}`);
  return runner;
}

// Runs the solution once per test with that test's input on stdin, and prints
// "<stdout>\n<delimiter> <exit code>\n" for each. Expected outputs never enter the container.
// shortcut: code and inputs travel as env vars (~128KB each on Linux), switch to a mounted volume for larger tests.
export function buildScript(cmd: string): string {
  return [
    `printf '%s' "$CODE_B64" | base64 -d > /tmp/sol || exit 1`,
    `i=0`,
    `while [ "$i" -lt "$N" ]; do`,
    `  eval "printf '%s' \\"\\$IN_$i\\"" | base64 -d > /tmp/in`,
    `  timeout ${PER_TEST_SECONDS} ${cmd} /tmp/sol < /tmp/in > /tmp/out 2>/dev/null`,
    `  rc=$?`,
    `  head -c 1000000 /tmp/out`,
    `  printf '\\n%s %s\\n' "$D" "$rc"`,
    `  i=$((i+1))`,
    `done`,
  ].join("\n");
}

const normalize = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

export function judge(rawLog: string, delimiter: string, expected: string[]): Verdict {
  // A problem with no tests cannot be solved, only left unjudged.
  if (expected.length === 0) return "RUNTIME_ERROR";

  // [out0, rc0, out1, rc1, ...]
  const parts = rawLog.replace(/\r\n/g, "\n").split(new RegExp(`\\n${delimiter} (\\d+)\\n`));

  for (let i = 0; i < expected.length; i++) {
    const output = parts[2 * i];
    const exitCode = parts[2 * i + 1];
    if (output === undefined || exitCode === undefined) return "RUNTIME_ERROR";
    // timeout exits 124 (coreutils) or leaves the SIGTERM status 143 (busybox).
    if (exitCode === "124" || exitCode === "143") return "TIME_LIMIT_EXCEEDED";
    if (exitCode !== "0") return "RUNTIME_ERROR";
    if (normalize(output) !== normalize(expected[i] as string)) return "WRONG_ANSWER";
  }
  return "ACCEPTED";
}
