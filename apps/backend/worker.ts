// Judge worker. Runs as its own process on a host with a Docker socket: `bun run worker`.
import { startWorker } from "@repo/code-runner";
import { recordContestScore } from "./contest/liveContest";

const pointsByDifficulty = {
  EASY: 100,
  MEDIUM: 200,
  HARD: 300,
};

startWorker(async (submission) => {
  if (submission.status !== "ACCEPTED" || !submission.contestId || !submission.isFirstAcceptedInContest) return;

  await recordContestScore({
    contestId: submission.contestId,
    userId: submission.userId,
    scoreDelta: pointsByDifficulty[submission.difficulty ?? "EASY"],
    penalty: 0,
  });
}).catch((error) => {
  console.error("Failed to start submission worker", error);
  process.exit(1);
});
