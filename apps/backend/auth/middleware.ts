import {type Request,type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try{
        const decoded = jwt.verify(token  as string, process.env.JWT_SECRET as string);
        (req as any).user = decoded;
    }catch(err){
        return res.status(401).json({ message: "Unauthorized" });
    }
  next();
};