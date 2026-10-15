import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}))
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true, limit:"16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

//routes import
import userRouter from "./routes/user.router.js"
import videoRouter from "./routes/video.router.js"
import commentRouter from "./routes/comment.router.js"

//routes declaration
app.use("/api/v1/users",userRouter)
app.use("/api/v1/videos",videoRouter);
app.use("/api/v1/comments",commentRouter)


app.use(errorHandler);
export {app};