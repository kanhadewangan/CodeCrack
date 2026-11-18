import { randomUUID } from "node:crypto";
import Docker from "dockerode";
import { prisma } from "@repo/db";
import { consumeFromQueue } from "@repo/queue";
import { buildScript, judge, runnerFor, PER_TEST_SECONDS, type Verdict } from "./judge.ts";

const docker = new Docker();
const queueName = "submission_queue";
// Containers judged at once; each is capped at 256MB and half a CPU.
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);

type TestCase = {
  input?: string;
  output?: string;
};

type SubmissionMessage = {
  submissionId: string;
  problemId: string;
  contestId?: string | null;
  code: string;
  language?: string;
};

type JudgedSubmission = {
  submissionId: string;
  userId: string;
  problemId: string;
  contestId?: string | null;
  status: Verdict;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  isFirstAcceptedInContest: boolean;
};

async function startWorker(onJudged?: (submission: JudgedSubmission) => Promise<void>) {
  await consumeFromQueue(queueName, async (message) => {


    let parsedMessage: SubmissionMessage;
    try {
      parsedMessage = JSON.parse(message) as SubmissionMessage;
    } catch {
      console.error("Skipping invalid queue message payload");
      return;
    }

    const { submissionId, problemId, code, language = "javascript" } = parsedMessage;

    // A redelivered message must not be judged (and counted in stats) twice.
    const existing = await prisma.submissions.findUnique({
      where: { id: submissionId },
      select: { status: true },
    });
    if (existing?.status !== "PENDING") return;

    let verdict: Verdict;
    try {
      const testCases = await getTestCasesForProblem(problemId);
      verdict = await runSubmission(code, language, testCases);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      console.error(`Submission ${submissionId} failed: ${err}`);
      verdict = "RUNTIME_ERROR";
    }

    const judgedSubmission = await updateSubmissionStatus(submissionId, verdict);
    if (onJudged) await onJudged(judgedSubmission);
  }, concurrency);
}

const getTestCasesForProblem = async (problemId: string): Promise<TestCase[]> => {
  const problem = await prisma.problems.findUnique({
    where: { id: problemId },
    select: { testCases: true },
  });

  if (!Array.isArray(problem?.testCases)) {
    return [];
  }

  return problem.testCases as TestCase[];
};

const updateSubmissionStatus = async (submissionId: string, status: Verdict): Promise<JudgedSubmission> => {
  // 1. Update the submission status
  const updatedSubmission = await prisma.submissions.update({
    where: { id: submissionId },
    data: { status },
    include: {
      problems: true
    }
  });

  const { userId, problemId, contestId, problems } = updatedSubmission;

  // 2. Fetch or create userStat
  let userStat = await prisma.userStat.findUnique({
    where: { userId }
  });

  if (!userStat) {
    userStat = await prisma.userStat.create({
      data: {
        userId,
        problemsSolved: 0,
        totalSubmissions: 0,
        rating: 200 // starting rating
      }
    });
  }

  // 3. Increment total submissions
  let totalSubmissions = userStat.totalSubmissions + 1;
  let problemsSolved = userStat.problemsSolved;
  let rating = userStat.rating;

  let isFirstAcceptedInContest = false;

  if (status === "ACCEPTED") {
    // Check if the user already has an accepted submission for this problem
    const existingAccepted = await prisma.submissions.findFirst({
      where: {
        userId,
        problemId,
        status: "ACCEPTED",
        id: { not: submissionId }
      }
    });

    if (!existingAccepted) {
      problemsSolved += 1;
      
      // Calculate rating points based on difficulty
      let points = 10;
      if (problems?.difficulty === "MEDIUM") points = 20;
      if (problems?.difficulty === "HARD") points = 30;
      
      rating += points;
    }

    if (contestId) {
      const existingContestAccepted = await prisma.submissions.findFirst({
        where: {
          userId,
          problemId,
          contestId,
          status: "ACCEPTED",
          id: { not: submissionId },
        },
      });

      isFirstAcceptedInContest = !existingContestAccepted;
    }
  }

  // 4. Save updated userStats
  await prisma.userStat.update({
    where: { userId },
    data: {
      totalSubmissions,
      problemsSolved,
      rating
    }
  });

  // 5. Upsert leaderboard rating
  const existingLeaderboard = await prisma.leaderboard.findFirst({
    where: { userId }
  });

  if (existingLeaderboard) {
    await prisma.leaderboard.update({
      where: { id: existingLeaderboard.id },
      data: { rating }
    });
  } else {
    await prisma.leaderboard.create({
      data: {
        userId,
        rating
      }
    });
  }

  return {
    submissionId,
    userId,
    problemId,
    contestId,
    status,
    difficulty: problems?.difficulty,
    isFirstAcceptedInContest,
  };
};

async function runSubmission(code: string, language: string, testCases: TestCase[]): Promise<Verdict> {
  const runner = runnerFor(language);
  await ensureImageAvailable(runner.image);

  const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
  const delimiter = randomUUID();

  const container = await docker.createContainer({
    Image: runner.image,
    Cmd: ["sh", "-c", buildScript(runner.cmd)],
    // Inputs only: expected outputs stay in this process.
    Env: [
      `CODE_B64=${b64(code)}`,
      `N=${testCases.length}`,
      `D=${delimiter}`,
      ...testCases.map((testCase, i) => `IN_${i}=${b64(testCase.input ?? "")}`),
    ],
    Tty: true,
    HostConfig: {
      Memory: 256 * 1024 * 1024,
      MemorySwap: 256 * 1024 * 1024,
      CpuQuota: 50000,
      NetworkMode: "none",
      PidsLimit: 64,
      ReadonlyRootfs: true,
      Tmpfs: { "/tmp": "size=16m" },
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
    },
    NetworkDisabled: true,
    AttachStdout: true,
    AttachStderr: true,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await container.start();

    // Backstop for a solution that ignores the per-test SIGTERM.
    const timeoutMs = testCases.length * PER_TEST_SECONDS * 1000 + 5000;
    await Promise.race([
      container.wait(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("TIME_LIMIT_EXCEEDED")), timeoutMs);
      }),
    ]);

    const logs = await container.logs({ stdout: true, stderr: true });
    return judge(logs.toString("utf8"), delimiter, testCases.map((testCase) => testCase.output ?? ""));
  } catch (error) {
    await container.kill().catch(() => {
      // Container may already have exited.
    });

    const err = error instanceof Error ? error.message : String(error);
    if (err !== "TIME_LIMIT_EXCEEDED") console.error("Container run failed:", err);
    return err === "TIME_LIMIT_EXCEEDED" ? "TIME_LIMIT_EXCEEDED" : "RUNTIME_ERROR";
  } finally {
    clearTimeout(timer);
    await container.remove({ force: true }).catch(() => {
      // Best-effort cleanup.
    });
  }
}

async function ensureImageAvailable(image: string): Promise<void> {
  const imageHarness = await docker.listImages({
    filters: { reference: [image] },
  });
  if(imageHarness.length === 0) {
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: any, stream: any) => {
        if (err) {
          reject(err);
          return;
        }
        docker.modem.followProgress(
          stream,(err:any) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          },
          () => {
            // Ignore progress events.
          },
        );
      });
    })
  }
  }

export { startWorker };
