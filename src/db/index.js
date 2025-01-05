import mongoose from "mongoose";
import dotenv from "dotenv";
import { DBName } from "../constant.js";

dotenv.config();

const connectDB = async () => {
    try {
        const connectionString = `${process.env.MONGODB_URI}/${DBName}`;
        console.log(`Attempting to connect to: ${connectionString}`);
        const connectionInstance = await mongoose.connect(connectionString);
        console.log(`Database connected successfully with host ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
};

export default connectDB;
