import express from "express";
import { prisma } from "@repo/db";

const router = express.Router();



router.get("/problems", async (req, res) => {
    try {
    const problems = await prisma.problems.findMany();
    res.status(200).json(problems);
}
catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).json({ message: "Internal server error" });
}
});


router.get("/problems/:id", async (req, res) => {
    const { id } = req.params;
    const problem = await prisma.problems.findUnique({
        where: {
            id: id
        },
    })
    res.status(200).json(problem);
})

router.post("/problems", async (req, res) => {
    const { name, description, difficulty, testCases, tags } = req.body;
    const problem = await prisma.problems.create({
        data: {
            name,
            description,
            difficulty,
            testCases: {
                create: testCases
            },
            tags: {
                connectOrCreate: tags.map((tag: { name: string }) => ({
                    where: { name: tag.name },
                    create: tag
                }))
            }
        }
    });
    res.status(201).json(problem);
});

const problemsRoute = router
export default problemsRoute;