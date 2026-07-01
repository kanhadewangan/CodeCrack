import express from "express";
import {prisma} from "@repo/db";
import {publishToQueue} from "@repo/queue"
import {startWorker} from "@repo/code-runner"
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
startWorker().catch((error) => {
  console.error("Failed to start submission worker", error);
  process.exit(1);
});

console.log("RABBITMQQ_ENV", process.env.RABBITMQQ_ENV)
router.get("/submissions", async (req, res) => {
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


router.get("/submissions/:id", async (req, res) => {
    const { id } = req.params;
    const submission = await prisma.submissions.findUnique({
        where: {
            id: id,
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


router.post("/submission", async (req, res) => {
   
   try {
    const {  problemId, code, language } = req.body;

    // add validation for userId, problemId, code, and language here
    // check if the any occur in code execution and return error if so
    // tle if it take more than 5 seconds to execute the code and return error if so
    const submissionPromise = await new  Promise(async (resolve, reject)=>{
        const submission = await prisma.submissions.create({
            data: {
                problemId,
                code,
                language,
                status: "PENDING",
                userId: (req as any).user.id
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
                userId: (req as any).user.id,
                problemId: problemId,
            },
        })
        console.log("submission", submission)
       const message = {
        submissionId: submission.id,
        problemId: submission.problemId,
        code: submission.code,
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


