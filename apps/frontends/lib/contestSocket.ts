import { io, type Socket } from "socket.io-client";
import { SOCKET_BASE } from "./api";

export type ContestSocket = Socket;

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  score: number;
  penalty: number;
};

export type LeaderboardPayload = {
  contestId: string;
  updatedAt: string;
  rankings: LeaderboardRow[];
};

export type ContestStartedPayload = {
  contestId: string;
  actualStartTime: string;
  actualEndTime: string;
};

export type ContestEndedPayload = {
  contestId: string;
  endedAt: string;
  finalRankings: LeaderboardRow[];
};

export function createContestSocket(token: string): ContestSocket {
  return io(`${SOCKET_BASE}/contests`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  });
}
