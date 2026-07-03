import express , {type Request, type Response} from "express";
import {prisma} from "@repo/db";
const route = express.Router();


            route.post('/create-contest', async(req: Request, res: Response)=>{
                const {name, description, startDate, endDate} = req.body;
                try{
                    const contest = await prisma.contest.create({
                        data: {
                            name,
                            description,
                            startDate: new Date(startDate) as Date,
                            endDate: new Date(endDate) as Date
                        },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            startDate: true,
                            endDate: true
                        }
                    });
                    res.status(201).json({"message": "Contest created successfully", contest});
                }catch(err){
                    console.error(err);
                    res.status(500).json({error: "Internal Server Error"});
                }
            })


        route.get('/get-contests', async(req: Request, res: Response)=>{
            try{
                const getData = await prisma.contest.findMany();
                res.status(200).json({"message": "Contests retrieved successfully", contests: getData});
            }
            catch(err){
                console.error(err);
                res.status(500).json({error: "Internal Server Error"});
            }
        })



        route.post("/join-contest",async (req:Request, res: Response)=>{
        try{  const {contestId, userId} = req.body;
            const joinContest = await prisma.contestParticipants.create({
                data: {
                    contestId,
                    userId
                }
            });
            res.status(200).json({"message": "Joined contest successfully", joinContest
            })
        }
        catch(err){
            console.log(err);
            res.status(500).json({error: "Internal Server Error"});
        }
        })

        route.get("/get-contest-participants/:contestId", async(req: Request, res: Response)=>{
            const {contestId} = req.params;
            try{
                const participants = await prisma.contestParticipants.findMany({
                    where: {
                        contestId: contestId as string
                    },
                    include: {
                        users: {
                            select: {
                                email: true,
                                userStat: true
                            }
                        }
                    }
                });
                res.status(200).json({"message": "Participants retrieved successfully", participants});
            }
            catch(err){
                console.error(err);
                res.status(500).json({error: "Internal Server Error"});
            }
        })
          

        const contestRoute = route;
export default contestRoute;
