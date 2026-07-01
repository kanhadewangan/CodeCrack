import {prisma} from "@repo/db";
import express from "express";

const route = express.Router();





route.get("/streaks", async (req, res) => {
    const streaks = await getStreaks(req.user.id);
    res.status(200).json({ streaks });
})


route.get("/contributions", async (req, res) => {
    const contributions = await getContributionMap(req.user.id);
    const obj = Object.fromEntries(contributions);
    res.status(200).json(obj);
})

const streaksRoute = route;

export default streaksRoute;



 const getStreaks = async (userId: string) => {
    const contributions = await prisma.contribution.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    let streaks = 0;
    let lastDate = new Date();

    for (const contribution of contributions) {
        const contributionDate = new Date(contribution.createdAt);
        const diffInDays = Math.floor((lastDate.getTime() - contributionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0 || diffInDays === 1) {
            streaks++;
            lastDate = contributionDate;
        } else {
            break;
        }
    }

    return streaks;
};


const getContributionMap = async (userId: string) => {
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() - 1);

  const contributions = await prisma.contribution.findMany({
    where: {
      userId,
      createdAt: { gte: oneYear },
    },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (const contribution of contributions) {
    const key = contribution.createdAt.toISOString().split('T')[0];
    counts.set(key as string, (counts.get(key as string) || 0) + 1);
  }
  return counts;
};




