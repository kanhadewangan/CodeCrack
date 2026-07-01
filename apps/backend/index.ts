import express from "express";
import  route from "./auth/index.ts";
import problemsRoute from "./problems-service/index.ts";
import {authMiddleware} from "./auth/middleware.ts";
import submissionsRoute from "./code-submisson/index.ts";
const app = express();

app.use(express.json());
app.use("/auth", route);
app.use("/problems", problemsRoute);
app.use("/protected", authMiddleware, (req, res) => {
  res.status(200).json({ message: "You have accessed a protected route!" });
});
app.use("/api",authMiddleware,submissionsRoute);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});