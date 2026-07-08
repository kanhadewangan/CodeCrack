import {prisma} from "@repo/db";
import express from "express";
import {type Request, type Response} from "express";
const route = express.Router();





route.get("/streaks", async (req: Request, res: Response) => {
    const streaks = await getStreaks((req as any).user.id, req);
    res.status(200).json({ streaks });
})


route.get("/contributions", async (req: Request, res: Response) => {
    const contributions = await getContributionMap((req as any).user.id);
    const obj = Object.fromEntries(contributions);
    res.status(200).json(obj);
})

const streaksRoute = route;

export default streaksRoute;



 const getStreaks = async (userId: string, req: Request) => {
    const contributions = await prisma.streak.findMany({
       where:{
        userId: (req as any).user.id
       }
       
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




