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

// routes decleration
app.use("/api/v1/users", userRouter);

export default app;
