import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/userModel.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Token generation failed");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user data from frontend
    const { fullName, email, username, password } = req.body;

    // validation - not empty
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        res.status(400);
        throw new ApiError("Please fill all fields", 400);
    } else if (!email.includes("@")) {
        res.status(400);
        throw new ApiError("Invalid email", 400);
    }

    // check if user already exists
    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    });
    if (existedUser) {
        res.status(409);
        throw new ApiError("User already exists", 409);
    }

    // check for files
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath = null;
    if (
        req.files &&
        Array.isArray(req.files.cover && req.files.cover.length > 0)
    ) {
        coverImageLocalPath = req.files.cover[0].path;
    }
    if (!avatarLocalPath) {
        res.status(400);
        throw new ApiError("Please upload avatar", 400);
    }
    // upload them to cloudinary, check avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    let coverImage = null;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    if (!avatar) {
        res.status(500);
        throw new ApiError("Avatar upload failed", 500);
    }

    // create user object create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || null, // if cover image does not exists
        email,
        username: username.toLowerCase(),
        password,
    });

    // remove password and refresh token feild from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // check for user creation response
    if (!createdUser) {
        res.status(500);
        throw new ApiError(500, "User creation failed");
    }
    // return response
    res.status(201).json(
        new ApiResponse("User created successfully", createdUser)
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // get userdata from frontend
    const { email, username, password } = req.body;
    // Validate data
    if (!(email || username)) {
        throw new ApiError(400, "Username or Email is required");
    }
    // Check if user exists
    const user = await User.findOne({ $or: [{ email }, { username }] });
    if (!user) {
        throw new ApiError(400, "User not found");
    }
    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid password");
    }
    // Create token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // Send cookies and response
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, user: loggedInUser, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // Clear cookies
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        {
            new: true,
        }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res)=>{
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incommingRefreshToken){
        throw new ApiError(400, "Refresh token is required");
    }
    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(400, "Refresh token is Invalid");
        }
        if (incommingRefreshToken !== user.refreshToken) {
            throw new ApiError(400, "Refresh token is Invalid");
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
        const options = {
            httpOnly: true,
            secure: true,
        }
        return res
            .status(200)
            .cookie("refreshToken", refreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(
                new ApiResponse(200, { accessToken, mewRefreshToken }, "Token refreshed successfully")
            )
    } catch (error) {
        throw new ApiError(400, "Refresh token is Invalid");
        
    }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken };
