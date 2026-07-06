import express , {type Request, type Response} from "express";
import {prisma} from "@repo/db";
import auth from "../auth";
import { authMiddleware } from "../auth/middleware";
const route = express.Router();


            route.post('/create-contest', async(req: Request, res: Response)=>{
                const {name, description, startTime, endTime} = req.body;
                try{
                    console.log("Creating contest with data:", {name, description, startTime    , endTime});
                    const contest = await prisma.contest.create({
                        data: {
                            name,
                            description,
                            startTime: new Date(Date.now()),
                            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to one week from now,
                            contestParticipants: {
                                create: [] // Initialize with an empty array of participants
                            },
                            contestProblems: {
                                create: [] // Initialize with an empty array of problems

                            }
                        },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            startTime: true,
                            endTime: true
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
     
        route.post("/join-contest",authMiddleware,async (req:Request, res: Response)=>{
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
