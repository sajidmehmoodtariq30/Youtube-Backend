import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/userModel.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const coverImageLocalPath = req.files?.cover[0]?.path;
    if (!avatarLocalPath) {
        res.status(400);
        throw new ApiError("Please upload avatar", 400);
    }
    // upload them to cloudinary, check avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
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
        throw new ApiError("User creation failed", 500);
    }
    // return response
    res.status(201).json(
        new ApiResponse("User created successfully", createdUser)
    );
});

export { registerUser };
