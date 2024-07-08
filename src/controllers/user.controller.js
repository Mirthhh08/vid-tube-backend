import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"
import mongoose from 'mongoose'

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)


        const accessToken = user.generateAccessToken()


        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ vailidateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (err) {
        throw new ApiError(400, "Something went wrong while generating refresh and access token")
    }
}

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


    const { fullName, username, password, email } = req.body


    if ([fullName, username, password, email].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
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
            coverImage: coverImage || "",
            email,
            username: username.toLowerCase(),
            password,

        }
    )

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    console.log(createdUser)
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})


const loginUser = asyncHandler(async (req, res) => {
    // take email passowrd from user
    // validate the information from db
    // if user exist create a token and store it in local storage also genrate refresh token
    // if user doesnt exist thorw an errow no user found

    const { email, username, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!existingUser) {
        throw new ApiError(400, "user does not exist")
    }



    const isPasswordValid = await existingUser.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(400, "Incoorect Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(existingUser._id)


    const loggedInUser = await User.findOne(existingUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken: accessToken,
                refreshToken: refreshToken
            },
            "User logged In Successfully"
        )
    )
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(
            200,
            {},
            "User logged Out Successfully"
        )
    )

})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )


        const user = await User.findById(decodedToken?._id)

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or Invalid")
        }


        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
            new ApiResponse(200, { accessToken, refreshToken }, "Access Token Refreshed")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})

const changePassword = asyncHandler(async (req, res) => {

    // current password , new password from user
    // agar wo ye krr para hai iska mtlb logged in hai so we can find teh user in req.user
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPassowrd) {
        throw new ApiError(401, "Incorrect Password")
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false })


    return res.status(200).json(
        new ApiResponse(200, {}, "Password Updated Successfully")
    )

})

const getCurrentUser = (req, res) => {

    // agar user login hai to req.user me mil jaeyga
    if (!req.user) {
        throw new ApiError(400, "User not logged In")
    }

    res.status(200).json(
        new ApiResponse(200, { user: req.user }, "")
    )
}

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!(fullName && email)) {
        throw new ApiError(400, "Full Name  & Email are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Account Updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Errow while uploading on cloudinary")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { avatar },
        { new: true }
    ).select("-password  -refreshToken")


    res.status(200).json(
        new ApiResponse(200, user, "Avatar Updated Successfully")
    )
})


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(400, "Errow while uploading on cloudinary")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { coverImage },
        { new: true }
    ).select("-password  -refreshToken")


    res.status(200).json(
        new ApiResponse(200, user, "CoverImage Updated Successfully")
    )
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"

            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscibersCount: {
                    $size: "$subscribers"
                },
                subscribedTo: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscibersCount: 1,
                subscribedTo: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,

            }
        }
    ])

    console.log(channel);


    if (!channel?.length) {
        throw new ApiError(400, "Channel does not exist")
    }

    res.status(200).json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foriegnField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foriegnField: "_id",
                            as: "owner",
                            pipline: [
                                {
                                    $project: [
                                        {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} 