import express from "express";
import {prisma} from "@repo/db";
import {publishToQueue} from "@repo/queue"
import {type Request, type Response, type NextFunction} from "express";
import {startWorker} from "@repo/code-runner"
import { rateLimiter } from "@reoo/ratelimit";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
startWorker().catch((error) => {
  console.error("Failed to start submission worker", error);
  process.exit(1);
});

router.get("/submissions", async (req: Request, res: Response) => {
    const submissions = await prisma.submissions.findMany({
        where:{
            userId: (req as any).user.id
        },
        select: {
            id: true,
            problemId: true,
            code: true,
            language: true,
            status: true,
        }
    });
    res.status(200).json(submissions);
})


router.get("/submissions/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const submission = await prisma.submissions.findUnique({
        where: {
            id: id as string,
            userId: (req as any).user.id
        },
        select: {
            id: true,
            problemId: true,
            code: true,
            status: true,
        }
    })
    res.status(200).json(submission);
})


router.post("/submission", async (req: Request, res: Response) => {
   
   try {
    const {  problemId, code, language } = req.body;
    if(!problemId || !code || !language) {
        return res.status(400).json({ message: "Missing required fields" });
    }
     
     const userId = (req as any).user.id;
      rateLimiter(userId, "submission", 5, 60).then(async (allowed) => {
        if (!allowed) {
            return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
        }
      })
    const submissionPromise = await new  Promise(async (resolve)=>{       
        const submission = await prisma.submissions.create({
            data: {
                problemId,
                code,
                language,
                status: "PENDING",
                userId
            },
            select:{
                id: true,
                problemId: true,
                code: true,
                language: true,
                userId: true
            }
        })
        await prisma.contribution.create({
            data: {
                userId,
                problemId: problemId,
            },
        })
        await prisma.streak.create({
            data: {
                userId,
                date: new Date(),
            },
        })  

        console.log("submission", submission)
       const message = {
        submissionId: submission.id,
        problemId: submission.problemId,
        code: submission.code,
        language: submission.language,
       }
         await publishToQueue("submission_queue", JSON.stringify(message));         
         resolve(submission.id)

    })

    if(submissionPromise){
        res.status(201).json({ message: "Submission created successfully", submissionId: submissionPromise });
    }}

    catch (error) {
        console.log("Error creating submission:", error);
    }
            
})



const submissionsRoute = router;
export default submissionsRoute;


