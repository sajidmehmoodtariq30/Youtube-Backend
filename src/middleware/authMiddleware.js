import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import dotenv from "dotenv";
dotenv.config();

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401);
            throw new ApiError(401, "Unauthorized");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                res.status(401);
                throw new ApiError(401, "Unauthorized");
            }
            return decoded;
        });
        const loggedInUser = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if (!loggedInUser) {
            res.status(401);
            throw new ApiError(401, "Invalid");
        }
        req.user = loggedInUser;
        next();
    } catch (error) {
        throw new ApiError(401, "Unauthorized");
    }
});