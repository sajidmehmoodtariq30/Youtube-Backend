import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_URL,
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }) );

app.use(urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

// / route
app.get("/", (req, res) => {
    res.send("API is running....");
});

// routes import
import userRouter from './routes/UserRoutes.js'
import tweetRouter from './routes/TweetRoutes.js'
import subscriptionRouter from './routes/SubscriptionRoutes.js'
import videoRouter from './routes/VideoRoutes.js'
import commentRouter from './routes/CommentRoutes.js'
import likeRouter from './routes/LikeRoutes.js'
import playlistRouter from './routes/PlaylistRoutes.js'
import dashboardRouter from './routes/DashboardRoutes.js'


// routes decleration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

export default app;
