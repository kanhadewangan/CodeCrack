import express from "express";
import  route from "./auth/index.ts";
import problemsRoute from "./problems-service/index.ts";
import {authMiddleware} from "./auth/middleware.ts";
import submissionsRoute from "./code-submisson/index.ts";
import { prisma } from "@repo/db";
import streaksRoute from "./code-submisson/streaks.ts";

const app = express();

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use("/auth", route);
app.use("/problems", problemsRoute);
app.use("/streaks", authMiddleware, streaksRoute);
app.use("/api", authMiddleware, submissionsRoute);

app.get("/leaderboard", async (req, res) => {
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