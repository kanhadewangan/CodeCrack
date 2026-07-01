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
  code: string;
  language?: string;
};

type SubmissionResult = {
  success: boolean;
  output: string;
  error?: string;
};

async function startWorker() {
  await consumeFromQueue(queueName, async (message) => {
    console.log(`Received message from queue ${queueName}: ${message}`);

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
      await updateSubmissionStatus(submissionId, result);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      console.error(`Submission ${submissionId} failed: ${err}`);
      await updateSubmissionStatus(submissionId, {
        success: false,
        output: "",
        error: err,
      });
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

const updateSubmissionStatus = async (submissionId: string, result: SubmissionResult) => {
  const status = result.success ? "ACCEPTED" : "WRONG_ANSWER";
  console.log("Updating submission status:", submissionId, status);
  
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

  const { userId, problemId, problems } = updatedSubmission;

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
  try {
    await docker.getImage(image).inspect();
    return;
  } catch {
    console.log(`Docker image ${image} not found locally. Pulling...`);
  }

  const stream = await docker.pull(image);

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err: Error | null) => {
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
}

function imageForLanguage(language: string): string {
  switch (language.toLowerCase()) {
    case "javascript":
    case "js":
      return "node:20-alpine";
    case "python":
    case "py":
      return "python:3.11-alpine";
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
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
        "sh",
        "-lc",
        "printf '%s' \"$SUBMISSION_CODE_B64\" | base64 -d > /tmp/solution.py && python /tmp/solution.py",
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