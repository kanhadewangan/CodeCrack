import { test } from "node:test";
import assert from "node:assert/strict";
import { judge } from "./judge.ts";

const D = "delim-123";
const run = (...tests: Array<[output: string, exitCode: number]>) =>
  tests.map(([output, exitCode]) => `${output}\n${D} ${exitCode}\n`).join("");

test("accepts only when every test's output matches", () => {
  assert.equal(judge(run(["3", 0], ["7", 0]), D, ["3", "7"]), "ACCEPTED");
  assert.equal(judge(run(["3", 0], ["8", 0]), D, ["3", "7"]), "WRONG_ANSWER");
});

test("exiting 0 without the right output is not accepted", () => {
  assert.equal(judge(run(["hi", 0]), D, ["3"]), "WRONG_ANSWER");
  assert.equal(judge(run(["", 0]), D, ["3"]), "WRONG_ANSWER");
});

test("ignores trailing whitespace and TTY line endings", () => {
  assert.equal(judge(run(["1 2 \r\n3\r\n", 0]).replace(/\n/g, "\r\n"), D, ["1 2\n3"]), "ACCEPTED");
});

test("maps exit codes to verdicts", () => {
  assert.equal(judge(run(["", 143]), D, ["3"]), "TIME_LIMIT_EXCEEDED");
  assert.equal(judge(run(["", 124]), D, ["3"]), "TIME_LIMIT_EXCEEDED");
  assert.equal(judge(run(["3", 1]), D, ["3"]), "RUNTIME_ERROR");
});

test("missing results or no test cases are never accepted", () => {
  assert.equal(judge(run(["3", 0]), D, ["3", "7"]), "RUNTIME_ERROR");
  assert.equal(judge("", D, ["3"]), "RUNTIME_ERROR");
  assert.equal(judge("", D, []), "RUNTIME_ERROR");
});

test("printing a wrong delimiter does not forge a result", () => {
  assert.equal(judge(run(["3\nother-delim 0\n7", 0]), D, ["3", "7"]), "WRONG_ANSWER");
});
