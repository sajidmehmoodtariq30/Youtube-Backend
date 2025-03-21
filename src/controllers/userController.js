import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/userModel.js";
import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const extractPublicIdFromUrl = (url) => {
    const parts = url.split("/");
    const publicIdWithExtension = parts[parts.length - 1];
    const publicId = publicIdWithExtension.split(".")[0];
    return publicId;
};


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
    let coverImageLocalPath = req.files?.cover[0]?.path;
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

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incommingRefreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }
    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(400, "Refresh token is Invalid");
        }
        if (incommingRefreshToken !== user.refreshToken) {
            throw new ApiError(400, "Refresh token is Invalid");
        }

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);
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
                    { accessToken, mewRefreshToken },
                    "Token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(400, "Refresh token is Invalid");
    }
});

const editPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body;

    if (oldPassword === newPassword)
        throw new ApiError(
            400,
            "New password cannot be the same as old password"
        );

    if (newPassword !== confPassword)
        throw new ApiError(400, "Passwords do not match");

    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(oldPassword)))
        throw new ApiError(400, "Invalid password");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "-password -refreshToken"
    );
    return res
        .status(200)
        .json(new ApiResponse(200, user, "User found successfully"));
});

const editUser = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath = req.files?.cover[0]?.path;

    if (email && !email.includes("@")) {
        throw new ApiError(400, "Invalid email format");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    let avatar = null;
    let coverImage = null;

    if (avatarLocalPath) {
        if (user.avatar) {
            const publicId = extractPublicIdFromUrl(user.avatar);
            await deleteFromCloudinary(publicId);
        }
        avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) throw new ApiError(500, "Avatar upload failed");
    }

    if (coverImageLocalPath) {
        if (user.coverImage) {
            const publicId = extractPublicIdFromUrl(user.coverImage);
            await deleteFromCloudinary(publicId);
        }
        coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!coverImage) throw new ApiError(500, "Cover image upload failed");
    }

    if (fullName && fullName !== user.fullName) user.fullName = fullName;
    if (email && email !== user.email) user.email = email;
    if (avatar) user.avatar = avatar.url;
    if (coverImage) user.coverImage = coverImage.url;

    const updatedUser = await user.save();

    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(200).json(
        new ApiResponse("User updated successfully", userResponse)
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    editPassword,
    getCurrentUser,
    editUser,
    getUserChannelProfile,
    getWatchHistory,
};
