import express, { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@repo/db";
import { publishToQueue } from "@repo/queue";
import { authMiddleware } from "../auth/middleware";
import { getLeaderboardSnapshot, startContest } from "./liveContest";

const route = express.Router();

type RequestWithUser = Request & {
  user?: {
    id?: string;
  };
};

route.post("/create-contest", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { name, description, startTime, endTime, minimumParticipants } = req.body;

  if (!name || !startTime || !endTime) {
    return res.status(400).json({ code: "INVALID_PAYLOAD", message: "name, startTime and endTime are required" });
  }

  try {
    const contest = await prisma.contest.create({
      data: {
        name,
        description: description ?? "",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: "SCHEDULED",
        creatorId: req.user?.id,
        minimumParticipants: Number(minimumParticipants ?? 1),
      },
    });

    res.status(201).json({ message: "Contest created successfully", contest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/get-contests", async (_req: Request, res: Response) => {
  try {
    const contests = await prisma.contest.findMany({
      orderBy: { startTime: "desc" },
      include: {
        _count: {
          select: { contestParticipants: true },
        },
      },
    });

    res.status(200).json({
      message: "Contests retrieved successfully",
      contests: contests.map((contest) => ({
        ...contest,
        participantCount: contest._count.contestParticipants,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/start-contest/:contestId", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { contestId } = req.params;
  const userId = req.user?.id;

  if (!contestId || !userId) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const result = await startContest(contestId, userId);
  if (!result.ok) {
    return res.status(result.status).json({ code: result.code, message: result.message });
  }

  res.status(result.status).json(result.data);
});

route.post("/join-contest", authMiddleware, async (req: RequestWithUser, res: Response) => {
  try {
    const { contestId } = req.body;
    const userId = req.user?.id;

    if (!contestId || !userId) {
      return res.status(400).json({ code: "INVALID_PAYLOAD", message: "contestId is required" });
    }

    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) {
      return res.status(404).json({ code: "CONTEST_NOT_FOUND", message: "Contest not found" });
    }

    const joinContest = await prisma.contestParticipants.upsert({
      where: {
        contestId_userId: { contestId, userId },
      },
      update: {},
      create: { contestId, userId },
    });

    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    res.status(200).json({ message: "Joined contest successfully", userInfo, joinContest });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/leave-contest", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { contestId, userId: requestedUserId } = req.body;
  const userId = req.user?.id;

  if (!contestId || !userId) {
    return res.status(400).json({ code: "INVALID_PAYLOAD", message: "contestId is required" });
  }

  if (requestedUserId && requestedUserId !== userId) {
    return res.status(403).json({ code: "NOT_AUTHORIZED", message: "Cannot remove another participant" });
  }

  try {
    const leaveContest = await prisma.contestParticipants.deleteMany({
      where: { contestId, userId },
    });
    res.status(200).json({ message: "Left contest successfully", leaveContest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/get-contest-participants/:contestId", async (req: Request, res: Response) => {
  const { contestId } = req.params;
  try {
    const participants = await prisma.contestParticipants.findMany({
      where: { contestId },
      include: {
        users: {
          select: {
            email: true,
            userStat: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json({ message: "Participants retrieved successfully", participants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/joined-contests", authMiddleware, async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: "User not authenticated" });
    }

    const joinedContests = await prisma.contestParticipants.findMany({
      where: { userId },
      include: { contests: true },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ message: "Joined contests retrieved successfully", joinedContests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/add-problem", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { contestId, problemId } = req.body;
  try {
    const auth = await ensureContestOwner(contestId, req.user?.id);
    if (!auth.ok) return res.status(auth.status).json(auth.body);

    const addProblem = await prisma.contestProblems.upsert({
      where: {
        contestId_problemId: { contestId, problemId },
      },
      update: {},
      create: { contestId, problemId },
    });

    res.status(200).json({ message: "Problem added to contest successfully", addProblem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/get-contest-problems/:contestId", async (req: Request, res: Response) => {
  const { contestId } = req.params;
  try {
    const contestProblems = await prisma.contestProblems.findMany({
      where: { contestId },
      include: {
        problems: {
          include: {
            testCases: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ message: "Contest problems retrieved successfully", contestProblems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/remove-problem", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { contestId, problemId } = req.body;
  try {
    const auth = await ensureContestOwner(contestId, req.user?.id);
    if (!auth.ok) return res.status(auth.status).json(auth.body);

    const removeProblem = await prisma.contestProblems.deleteMany({
      where: { contestId, problemId },
    });
    res.status(200).json({ message: "Problem removed from contest successfully", removeProblem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/delete-contest", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { contestId } = req.body;
  return deleteContest(req, res, contestId);
});

route.delete("/delete-contest/:contestId", authMiddleware, async (req: RequestWithUser, res: Response) => {
  return deleteContest(req, res, req.params.contestId);
});

route.post("/update-contest", authMiddleware, async (req: RequestWithUser, res: Response) => {
  return updateContest(req, res, req.body.contestId, req.body);
});

route.put("/update-contest/:contestId", authMiddleware, async (req: RequestWithUser, res: Response) => {
  return updateContest(req, res, req.params.contestId, req.body);
});

route.get("/get-contest-details/:contestId", async (req: Request, res: Response) => {
  const { contestId } = req.params;
  try {
    const authUserId = getUserIdFromHeader(req);
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        _count: {
          select: {
            contestParticipants: true,
            contestProblems: true,
          },
        },
        contestParticipants: authUserId
          ? {
              where: { userId: authUserId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!contest) {
      return res.status(404).json({ code: "CONTEST_NOT_FOUND", message: "Contest not found" });
    }

    res.status(200).json({
      message: "Contest retrieved successfully",
      contest: {
        ...contest,
        isOwner: Boolean(authUserId && contest.creatorId === authUserId),
        joined: Boolean(authUserId && contest.contestParticipants?.length),
        participantCount: contest._count.contestParticipants,
        problemCount: contest._count.contestProblems,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/get-contest-by-name/:name", async (req: Request, res: Response) => {
  const { name } = req.params;
  try {
    const contest = await prisma.contest.findFirst({ where: { name } });
    res.status(200).json({ message: "Contest retrieved successfully", contest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/get-contest-leaderboard/:contestId", async (req: Request, res: Response) => {
  const { contestId } = req.params;
  const topN = Number(req.query.topN ?? 50);

  try {
    const leaderboard = await getLeaderboardSnapshot(contestId, Number.isFinite(topN) ? topN : 50);
    res.status(200).json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.get("/get-contest-submissions/:contestId", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { contestId } = req.params;
  try {
    const submissions = await prisma.submissions.findMany({
      where: { contestId, userId: req.user?.id },
      orderBy: { createdAt: "desc" },
      include: {
        problems: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
    });

    res.status(200).json({ submissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

route.post("/submit-contest-problem", authMiddleware, async (req: RequestWithUser, res: Response) => {
  const { contestId, problemId, code, language } = req.body;
  const userId = req.user?.id;

  if (!contestId || !problemId || !code || !language || !userId) {
    return res.status(400).json({ code: "INVALID_PAYLOAD", message: "contestId, problemId, code and language are required" });
  }

  try {
    const [contest, participant, contestProblem] = await Promise.all([
      prisma.contest.findUnique({ where: { id: contestId } }),
      prisma.contestParticipants.findFirst({ where: { contestId, userId } }),
      prisma.contestProblems.findFirst({ where: { contestId, problemId } }),
    ]);

    if (!contest) return res.status(404).json({ code: "CONTEST_NOT_FOUND", message: "Contest not found" });
    if (contest.status !== "RUNNING") {
      return res.status(409).json({ code: "INVALID_CONTEST_STATE", message: "Contest is not running" });
    }
    if (!participant) return res.status(403).json({ code: "NOT_REGISTERED", message: "Join the contest before submitting" });
    if (!contestProblem) {
      return res.status(400).json({ code: "PROBLEM_NOT_IN_CONTEST", message: "Problem is not part of this contest" });
    }

    const submission = await prisma.submissions.create({
      data: {
        contestId,
        problemId,
        code,
        language,
        status: "PENDING",
        userId,
      },
      select: {
        id: true,
        problemId: true,
        code: true,
        language: true,
        contestId: true,
      },
    });

    await publishToQueue("submission_queue", JSON.stringify(submission));
    res.status(201).json({ message: "Contest submission created successfully", submissionId: submission.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function deleteContest(req: RequestWithUser, res: Response, contestId?: string) {
  try {
    const auth = await ensureContestOwner(contestId, req.user?.id);
    if (!auth.ok) return res.status(auth.status).json(auth.body);

    const deleteContest = await prisma.contest.delete({ where: { id: contestId } });
    res.status(200).json({ message: "Contest deleted successfully", deleteContest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updateContest(req: RequestWithUser, res: Response, contestId: string | undefined, body: Record<string, unknown>) {
  try {
    const auth = await ensureContestOwner(contestId, req.user?.id);
    if (!auth.ok) return res.status(auth.status).json(auth.body);

    const updateContest = await prisma.contest.update({
      where: { id: contestId },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
        startTime: body.startTime ? new Date(String(body.startTime)) : undefined,
        endTime: body.endTime ? new Date(String(body.endTime)) : undefined,
        minimumParticipants: body.minimumParticipants ? Number(body.minimumParticipants) : undefined,
        status: body.status === "DRAFT" || body.status === "SCHEDULED" ? body.status : undefined,
      },
    });

    res.status(200).json({ message: "Contest updated successfully", updateContest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function ensureContestOwner(contestId?: string, userId?: string) {
  if (!contestId || !userId) {
    return {
      ok: false,
      status: 400,
      body: { code: "INVALID_PAYLOAD", message: "contestId is required" },
    };
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { creatorId: true },
  });

  if (!contest) {
    return {
      ok: false,
      status: 404,
      body: { code: "CONTEST_NOT_FOUND", message: "Contest not found" },
    };
  }

  if (contest.creatorId !== userId) {
    return {
      ok: false,
      status: 403,
      body: { code: "NOT_AUTHORIZED", message: "Only the contest creator can perform this action" },
    };
  }

  return { ok: true as const };
}

function getUserIdFromHeader(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return undefined;

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1] as string, process.env.JWT_SECRET as string) as { id?: string };
    return decoded.id;
  } catch {
    return undefined;
  }
}

const contestRoute = route;
export default contestRoute;
