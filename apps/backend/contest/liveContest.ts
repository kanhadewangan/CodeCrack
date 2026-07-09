import { createServer, type Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import Redis from "ioredis";
import { Server, type Socket } from "socket.io";
import { prisma } from "@repo/db";

const START_WINDOW_MINUTES = Number(process.env.CONTEST_START_WINDOW_MINUTES ?? 15);
const DEFAULT_TOP_N = Number(process.env.CONTEST_LEADERBOARD_TOP_N ?? 50);
const REDIS_URL = process.env.REDIS_URL;

type AuthedSocket = Socket & {
  user?: {
    id: string;
  };
};

export type ContestServiceResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code: string; message: string };

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  score: number;
  penalty: number;
};

let io: Server | undefined;
const endTimers = new Map<string, NodeJS.Timeout>();
const broadcastTimers = new Map<string, NodeJS.Timeout>();
const redis = new Redis(process.env.REDIS_URL as string,);

redis.on("error", (error) => {
  console.error("Contest Redis error:", error.message);
});

export function initializeContestSockets(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN ?? "*",
      methods: ["GET", "POST"],
    },
  });

  const contestNamespace = io.of("/contests");

  contestNamespace.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("AUTHENTICATION_REQUIRED"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id?: string };
      if (!decoded.id) return next(new Error("AUTHENTICATION_REQUIRED"));
      socket.user = { id: decoded.id };
      next();
    } catch {
      next(new Error("AUTHENTICATION_REQUIRED"));
    }
  });

  contestNamespace.on("connection", (socket: AuthedSocket) => {
    socket.on("join_contest", async (payload: { contestId?: string }, ack?: (response: unknown) => void) => {
      const contestId = payload?.contestId;
      if (!contestId || !socket.user?.id) {
        return respond(socket, ack, "contest:error", {
          code: "INVALID_PAYLOAD",
          message: "contestId is required",
        });
      }

      const participant = await prisma.contestParticipants.findFirst({
        where: { contestId, userId: socket.user.id },
      });

      if (!participant) {
        return respond(socket, ack, "contest:error", {
          code: "NOT_REGISTERED",
          message: "User is not registered for this contest",
        });
      }

      const room = roomName(contestId);
      await socket.join(room);
      respond(socket, ack, "contest:joined", { contestId, room });
    });

    socket.on(
      "leaderboard:sync",
      async (payload: { contestId?: string; topN?: number }, ack?: (response: unknown) => void) => {
        const contestId = payload?.contestId;
        if (!contestId) {
          return respond(socket, ack, "contest:error", {
            code: "INVALID_PAYLOAD",
            message: "contestId is required",
          });
        }

        const rankings = await getLeaderboardSnapshot(contestId, payload.topN ?? DEFAULT_TOP_N);
        respond(socket, ack, "leaderboard:update", {
          contestId,
          updatedAt: new Date().toISOString(),
          rankings,
        });
      },
    );

    socket.on("leave_contest", async (payload: { contestId?: string }, ack?: (response: unknown) => void) => {
      if (!payload?.contestId) return;
      await socket.leave(roomName(payload.contestId));
      respond(socket, ack, "contest:left", { contestId: payload.contestId });
    });
  });

  return io;
}

export function getContestSocketServer() {
  return io;
}

export async function startContest(contestId: string, userId: string): Promise<ContestServiceResult> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      contestProblems: {
        include: {
          problems: {
            select: {
              id: true,
              testCases: { select: { id: true }, take: 1 },
            },
          },
        },
      },
      contestParticipants: {
        include: {
          users: { select: { id: true, email: true } },
        },
      },
    },
  });

  if (!contest) {
    return failure(404, "CONTEST_NOT_FOUND", "Contest not found");
  }

  if (contest.creatorId !== userId) {
    return failure(403, "NOT_AUTHORIZED", "Only the contest creator can start this contest");
  }

  if (!["SCHEDULED", "DRAFT"].includes(contest.status)) {
    return failure(409, "INVALID_CONTEST_STATE", `Contest cannot be started from ${contest.status}`);
  }

  const now = new Date();
  const earliestStart = new Date(contest.startTime.getTime() - START_WINDOW_MINUTES * 60 * 1000);
  if (now < earliestStart || now > contest.endTime) {
    return failure(400, "INVALID_START_TIME", "Contest is outside the allowed start window");
  }

  const validProblems = contest.contestProblems.filter((contestProblem) => {
    return contestProblem.problems?.testCases?.length > 0;
  });

  if (validProblems.length === 0) {
    return failure(400, "NO_PROBLEMS_ADDED", "Contest needs at least one problem with test cases");
  }

  if (contest.contestParticipants.length < contest.minimumParticipants) {
    return failure(400, "INSUFFICIENT_PARTICIPANTS", "Contest does not have enough participants");
  }

  const durationMs = contest.endTime.getTime() - contest.startTime.getTime();
  const actualEndTime = new Date(now.getTime() + Math.max(durationMs, 0));

  const updatedCount = await prisma.contest.updateMany({
    where: {
      id: contestId,
      status: { in: ["SCHEDULED", "DRAFT"] },
    },
    data: {
      status: "RUNNING",
      actualStartTime: now,
      actualEndTime,
    },
  });

  if (updatedCount.count !== 1) {
    return failure(409, "INVALID_CONTEST_STATE", "Contest was already started or changed state");
  }

  const updatedContest = await prisma.contest.findUniqueOrThrow({
    where: { id: contestId },
  });

  await initializeContestLeaderboard(
    contestId,
    contest.contestParticipants.map((participant) => ({
      userId: participant.userId,
      username: participant.users?.email ?? participant.userId,
    })),
  );

  emitContestStarted(contestId, updatedContest.actualStartTime ?? now, updatedContest.actualEndTime ?? actualEndTime);
  scheduleContestEnd(contestId, updatedContest.actualEndTime ?? actualEndTime);

  return {
    ok: true,
    status: 200,
    data: {
      message: "Contest started successfully",
      contest: updatedContest,
    },
  };
}

export async function initializeContestLeaderboard(
  contestId: string,
  participants: Array<{ userId: string; username: string }>,
) {
  await prisma.leaderboardContest.createMany({
    data: participants.map((participant) => ({
      contestId,
      userId: participant.userId,
      rating: 0,
      score: 0,
      penalty: 0,
    })),
    skipDuplicates: true,
  });

  await withRedis(async () => {
    const pipeline = redis.pipeline();
    for (const participant of participants) {
      pipeline.zadd(scoreKey(contestId), 0, participant.userId);
      pipeline.hset(userKey(contestId, participant.userId), {
        username: participant.username,
        penalty: "0",
      });
    }
    await pipeline.exec();
  });
}

export async function recordContestScore(params: {
  contestId: string;
  userId: string;
  scoreDelta: number;
  penalty?: number;
}) {
  const contest = await prisma.contest.findUnique({
    where: { id: params.contestId },
    select: { status: true },
  });

  if (!contest || contest.status !== "RUNNING") return;

  const row = await prisma.leaderboardContest.upsert({
    where: {
      contestId_userId: {
        contestId: params.contestId,
        userId: params.userId,
      },
    },
    update: {
      score: { increment: params.scoreDelta },
      rating: { increment: params.scoreDelta },
      penalty: params.penalty,
    },
    create: {
      contestId: params.contestId,
      userId: params.userId,
      rating: params.scoreDelta,
      score: params.scoreDelta,
      penalty: params.penalty ?? 0,
    },
  });

  await withRedis(async () => {
    await redis.zadd(scoreKey(params.contestId), row.score, params.userId);
    await redis.hset(userKey(params.contestId, params.userId), {
      username: params.userId,
      penalty: String(row.penalty),
    });
  });

  queueLeaderboardBroadcast(params.contestId);
}

export async function getLeaderboardSnapshot(contestId: string, topN = DEFAULT_TOP_N): Promise<LeaderboardRow[]> {
  const redisRows = await withRedis(async () => {
    const raw = await redis.zrevrange(scoreKey(contestId), 0, Math.max(topN - 1, 0), "WITHSCORES");
    if (raw.length === 0) return [];

    const rows: LeaderboardRow[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const userId = raw[i];
      const score = Number(raw[i + 1]);
      const profile = await redis.hgetall(userKey(contestId, userId as string));
      rows.push({
        rank: i / 2 + 1,
        userId,
        username: profile.username || userId,
        score,
        penalty: Number(profile.penalty ?? 0),
      });
    }
    return rows;
  });

  if (redisRows && redisRows.length > 0) {
    return redisRows;
  }

  const rows = await prisma.leaderboardContest.findMany({
    where: { contestId },
    orderBy: [{ score: "desc" }, { penalty: "asc" }, { updatedAt: "asc" }],
    take: topN,
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    username: row.userId,
    score: row.score,
    penalty: row.penalty,
  }));
}

export function scheduleContestEnd(contestId: string, actualEndTime: Date) {
  const existing = endTimers.get(contestId);
  if (existing) clearTimeout(existing);

  const delay = Math.max(actualEndTime.getTime() - Date.now(), 0);
  const timer = setTimeout(() => {
    endContest(contestId).catch((error) => {
      console.error(`Failed to end contest ${contestId}`, error);
    });
  }, delay);

  endTimers.set(contestId, timer);
}

export async function endContest(contestId: string) {
  const result = await prisma.contest.updateMany({
    where: { id: contestId, status: "RUNNING" },
    data: { status: "ENDED", actualEndTime: new Date() },
  });

  if (result.count !== 1) return;

  await prisma.leaderboardContest.updateMany({
    where: { contestId },
    data: { frozen: true },
  });

  const finalRankings = await getLeaderboardSnapshot(contestId, DEFAULT_TOP_N);
  io?.of("/contests").to(roomName(contestId)).emit("contest:ended", {
    contestId,
    endedAt: new Date().toISOString(),
    finalRankings,
  });
}

function emitContestStarted(contestId: string, actualStartTime: Date, actualEndTime: Date) {
  io?.of("/contests").to(roomName(contestId)).emit("contest:started", {
    contestId,
    actualStartTime: actualStartTime.toISOString(),
    actualEndTime: actualEndTime.toISOString(),
  });
}

function queueLeaderboardBroadcast(contestId: string) {
  if (broadcastTimers.has(contestId)) return;

  const timer = setTimeout(async () => {
    broadcastTimers.delete(contestId);
    const rankings = await getLeaderboardSnapshot(contestId, DEFAULT_TOP_N);
    io?.of("/contests").to(roomName(contestId)).emit("leaderboard:update", {
      contestId,
      updatedAt: new Date().toISOString(),
      rankings,
    });
  }, 1000);

  broadcastTimers.set(contestId, timer);
}

async function withRedis<T>(operation: () => Promise<T>): Promise<T | undefined> {
  try {
    if (redis.status === "wait") await redis.connect();
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Contest Redis operation failed:", message);
    return undefined;
  }
}

function respond(socket: Socket, ack: ((response: unknown) => void) | undefined, event: string, payload: unknown) {
  if (ack) return ack(payload);
  socket.emit(event, payload);
}

function failure(status: number, code: string, message: string): ContestServiceResult {
  return { ok: false, status, code, message };
}

function roomName(contestId: string) {
  return `contest:${contestId}`;
}

function scoreKey(contestId: string) {
  return `contest:${contestId}:leaderboard:scores`;
}

function userKey(contestId: string, userId: string) {
  return `contest:${contestId}:leaderboard:user:${userId}`;
}

export { createServer };
