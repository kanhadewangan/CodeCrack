import express from "express";
import { prisma } from "@repo/db";
import { authMiddleware } from "../auth/middleware.ts";

const router = express.Router();
import { type Request, type Response } from "express";


router.get("/problems", async (req: Request, res: Response) => {
    try {
        const { difficulty, tag } = req.query;
        const whereClause: any = {};
        
        if (difficulty) {
            whereClause.difficulty = difficulty;
        }
        
        if (tag) {
            whereClause.tags = {
                has: tag
            };
        }

        // Test cases are judge-only: never returned to clients.
        const problems = await prisma.problems.findMany({
            where: whereClause,
        });
        res.status(200).json(problems);
    }
    catch (error) {
        console.error("Error fetching problems:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


router.get("/problems/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const problem = await prisma.problems.findUnique({
            where: {
                id: id as string
            },
        });
        res.status(200).json(problem);
    } catch (error) {
        res.status(500).json({ message: "Error fetching problem" });
    }
});

router.post("/problems", authMiddleware, async (req: Request, res: Response) => {
    try {
        const { title, description, difficulty, testCases, tags, hints } = req.body;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString().slice(-4);
        
        const problem = await prisma.problems.create({
            data: {
                title,
                slug,
                description,
                difficulty,
                tags: tags || [],
                testCases: {
                    create: testCases || []
                },
                problemHints:{
                    create: hints || []
                }
            }
        });
        res.status(201).json(problem);
    } catch (error) {
        console.error("Error creating problem:", error);
        res.status(500).json({ message: "Error creating problem" });
    }
});

router.get("/hints/:problemId", async (req: Request, res: Response) => {
    try {
        const problemId = req.params.problemId as string;
        const hints = await prisma.hints.findMany({
            where: { problemId }
        });
        res.status(200).json(hints);
    } catch (error) {
        res.status(500).json({ message: "Error fetching hints" });
    }
});

router.post("/hints", authMiddleware, async (req: Request, res: Response) => {
    try {
        const { problemId, hint } = req.body;
        const newHint = await prisma.hints.create({
            data: { problemId, hint }
        });
        res.status(201).json(newHint);
    } catch (error) {
        res.status(500).json({ message: "Error creating hint" });
    }
});

const problemsRoute = router
export default problemsRoute;