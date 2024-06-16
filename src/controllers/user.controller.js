import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
const registerUser = asyncHandler(async (req, res) => {
    // get details from user 
    // validation - empty
    // if user exist or not : username , email
    // check for images avatar 
    // upload to cloudinary
    // create user object , create entry to db
    // remove passowrd and refresh token from res
    // check for user creation
    // return res

    console.log(req.body);
    const { fullName, username, password, email } = req.body
    console.log("email", email);

    if ([fullName, username, password, email].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.coverImage[0]?.path;


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverLocalPath);

    if (!avatar) {
        throw new ApiError(404, "Avatar file is required")
    }

    const user = await User.create(
        {
            fullName,
            avatar: avatar,
            coverImage: coverImage?.url || "",
            email,
            username: username.toLowerCase(),

        }
    )

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }


    return res.status(201).json(
        new ApiResponse(201, createdUser , "User registered successfully")
    )
})


export { registerUser }