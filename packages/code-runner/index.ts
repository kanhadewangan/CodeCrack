import Docker from "dockerode";
import { prisma } from "@repo/db";
import { consumeFromQueue } from "@repo/queue";

const docker = new Docker();
const queueName = "submission_queue";

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

type SubmissionResult = {
  success: boolean;
  output: string;
  error?: string;
};

type JudgedSubmission = {
  submissionId: string;
  userId: string;
  problemId: string;
  contestId?: string | null;
  status: "ACCEPTED" | "WRONG_ANSWER";
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

    try {
      const testCases = await getTestCasesForProblem(problemId);
      const result = await runSubmission(code, language, testCases);
      const judgedSubmission = await updateSubmissionStatus(submissionId, result);
      if (onJudged) await onJudged(judgedSubmission);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      console.error(`Submission ${submissionId} failed: ${err}`);
      const judgedSubmission = await updateSubmissionStatus(submissionId, {
        success: false,
        output: "",
        error: err,
      });
      if (onJudged) await onJudged(judgedSubmission);
    }
  });
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

const updateSubmissionStatus = async (submissionId: string, result: SubmissionResult): Promise<JudgedSubmission> => {
  const status = result.success ? "ACCEPTED" : "WRONG_ANSWER";
  // console.log("Updating submission status:", submissionId, status);
  
  // 1. Update the submission status
  const updatedSubmission = await prisma.submissions.update({
    where: { id: submissionId },
    data: {
      status: status as any,
    },
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

async function runSubmission(code: string, language: string, testCases: TestCase[]): Promise<SubmissionResult> {
  const image = imageForLanguage(language);

  await ensureImageAvailable(image);

  const encodedCode = Buffer.from(code, "utf8").toString("base64");
  const encodedTestCases = Buffer.from(JSON.stringify(testCases), "utf8").toString("base64");

  const container = await docker.createContainer({
    Image: image,
    Cmd: runCommandFor(language),
    Env: [`SUBMISSION_CODE_B64=${encodedCode}`, `TEST_CASES_B64=${encodedTestCases}`],
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

  try {
    await container.start();

    const timeoutMs = 5000;
    const waitResult = (await Promise.race([
      container.wait(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIME_LIMIT_EXCEEDED")), timeoutMs),
      ),
    ])) as { StatusCode?: number };

    const logs = await container.logs({ stdout: true, stderr: true });
    console.log("Container logs:", logs.toString("utf8"));
    return parseOutput(logs, waitResult.StatusCode ?? 1);
  } catch (error) {
    await container.kill().catch(() => {
      // Container may already have exited.
    });

    const err = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: "",
      error: err,
    };
  } finally {
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

 

const LANGUAGE_IMAGES: Record<string, string> = {
  javascript: "node:20-alpine",
  js: "node:20-alpine",
  python: "python:3.11-alpine",
  py: "python:3.11-alpine",
};

function imageForLanguage(language: string): string {
  const image = LANGUAGE_IMAGES[language.toLowerCase()];
  if (!image) throw new Error(`Unsupported language: ${language}`);
  return image;
}

function runCommandFor(language: string): string[] {
  switch (language.toLowerCase()) {
    case "javascript":
    case "js":
      return [
        "sh",
        "-lc",
        "printf '%s' \"$SUBMISSION_CODE_B64\" | base64 -d > /tmp/solution.js && node /tmp/solution.js",
      ];
      case "python":
      case "py":
    return [
      "sh", "-c",
      "TMPFILE=$(mktemp /tmp/solution_XXXXXX) && " +
  "printf '%s' \"$SUBMISSION_CODE_B64\" | base64 -d > \"$TMPFILE\" && " +
    "(command -v python3 >/dev/null 2>&1 && python3 \"$TMPFILE\" || python \"$TMPFILE\")"
    ];
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

function parseOutput(logs: Buffer | string, statusCode: number): SubmissionResult {
  const output = Buffer.isBuffer(logs) ? logs.toString("utf8") : logs;

  if (statusCode === 0) {
    return { success: true, output };
  }

  return {
    success: false,
    output,
    error: output.trim() || `Process exited with code ${statusCode}`,
  };
}

export { startWorker };
