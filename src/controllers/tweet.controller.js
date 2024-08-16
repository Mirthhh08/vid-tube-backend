import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body


    if (!content) {
        throw new ApiError(401, "Content is required")
    }

    const tweet = await Tweet.create({
        content: content,
        owner: new mongoose.Types.ObjectId(req.user?._id)
    })

    if (!tweet) {
        throw new ApiError(501, "Somthing went wrong while creating tweet")
    }


    res.status(200).json(
        new ApiResponse(200, tweet, "Tweet Created Successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(401, "Not valid objecID")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            },
        },
    ]);

    if (!tweets) {
        throw new ApiError(501, "No tweets found")
    }

    res.status(200).json(
        new ApiResponse(200, tweets, "Tweets Fetched Successfully")
    )

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(401, "Not a valid objectId")
    }

    if (content.trim() === "") {
        throw new ApiError(401, "Content cannot be empty")
    }


    const tweet = await Tweet.findById(tweetId);


    if (!tweet) {
        throw new ApiError(501, "No such tweet found")
    }


    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You cannot edit this tweet as you are not the owner")
    }

    tweet.content = content;

    await tweet.save({ validateBeforeSave: false })

    res.status(200).json(
        new ApiResponse(200, tweet, "Tweet updated successfully")
    )


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(401, "Not a valid objectId")
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(501, "No such tweet found")
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You cannot delete this tweet as you are not the owner")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweet._id)


    if (!deletedTweet) {
        throw new ApiError(501, "Something went wrong while deleting tweet")
    }

    res.status(200).json(
        new ApiResponse(200, deletedTweet, "Tweet Deleted Successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}