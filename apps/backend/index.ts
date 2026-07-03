import express from "express";
import  route from "./auth/index.ts";
import problemsRoute from "./problems-service/index.ts";
import {authMiddleware} from "./auth/middleware.ts";
import submissionsRoute from "./code-submisson/index.ts";
import { prisma } from "@repo/db";
import streaksRoute from "./code-submisson/streaks.ts";
import cors from "cors";
import { type Request, type Response } from "express";
const app = express();



app.use(express.json());

// Enable CORS
app.use(cors({
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
}));

app.use("/auth", route);
app.use("/problems", problemsRoute);
app.use("/streaks", authMiddleware, streaksRoute);
app.use("/api", authMiddleware, submissionsRoute);

app.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const list = await prisma.leaderboard.findMany({
      orderBy: {
        rating: "desc"
      },
      include: {
        users: {
          select: {
            email: true,
            userStat: true
          }
        }
      },
      take: 50
    });
    
    const formatted = list.map((item, idx) => ({
      rank: idx + 1,
      userId: item.userId,
      email: item.users.email,
      rating: item.rating,
      problemsSolved: item.users.userStat[0]?.problemsSolved || 0,
      totalSubmissions: item.users.userStat[0]?.totalSubmissions || 0
    }));
    
    res.status(200).json(formatted);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
});

export default app;