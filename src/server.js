// Modular Approch
import connectDB from "./db/index.js";

connectDB();

// Non Modular Approch
/*
require dotenv from "dotenv.config({path: "./env"})";
import express from "express";
const app = express();

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DBName}`);
        app.on("error", (error) => {
            console.log(`Error: ${error}`);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });

    } catch (error) {
        console.log(error);
        throw error;
    }
})();
*/
