import express from "express";
import { prisma } from "@repo/db";
import jwt from "jsonwebtoken";
import brcypt from "bcrypt";

const route  = express.Router ();



route.post("/register", async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await brcypt.hash(password, 10);
    const user = await prisma.user.create({
        data:{
            email,
            password: hashedPassword
        },
        select:{
            id: true,
            email: true,
            createdAt: true
        }
    })
res.status(201).json(user);
})


route.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password){
        return res.status(400).json({ message: "Email and password are required" });
    }
    const users = await prisma.user.findFirst({
        where:{
            email,
        }
    })
    if(!users){
        return res.status(401).json({ message: "Invalid email or password" });
    }
    const isMatch = await brcypt.compare(password, users?.password as string);
    if(!isMatch){
        return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({
        id: users?.id
    }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
    res.status(200).json({ token });

});

route.get("/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try{
        const decoded = jwt.verify(token  as string, process.env.JWT_SECRET as string);
        const user = await prisma.user.findUnique({
            where:{
                id: (decoded as any).id
            },
            select:{
                id: true,
                email: true,
                createdAt: true,
                submissions: true,
                userStat: true
            }
        })
        res.status(200).json(user);
    }catch(err){
        return res.status(401).json({ message: "Unauthorized" });
    }
})


// route.get('/contribution',async(req,res)=>{

//     const authHeader = req.headers.authorization;
//     if(!authHeader || !authHeader.startsWith("Bearer ")){
//         return res.status(401).json({ message: "Unauthorized" });
//     }
//     const token = authHeader.split(" ")[1];

//     const contributions = await prisma.



// })



export default route;