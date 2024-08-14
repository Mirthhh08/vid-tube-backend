import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const videoStats = await Video.aggregate([
        {
            $match: { owner: req.user?._id }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                likesCnt: {
                    $size: "$likes"
                },
                viewsCnt: "$views",
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikesCnt: {
                    $sum: "$likesCnt"
                },
                totalViewsCnt: {
                    $sum: "$viewsCnt"
                },
                totalVideos: {
                    $sum: 1
                }

            }
        }
    ])

    const subscriberStats = await Subscription.aggregate([
        {
            $match: {
                channel: req.user?._id
            }
        },
        {
            $group: {
                _id: null,
                subscriberCnt: {
                    $sum: 1
                }
            }
        }
    ])


    if (!(videoStats && subscriberStats)) {
        throw new ApiError(501, "Failed to fetch channel data")
    }

    const stats = {
        totalSubscribers: subscriberStats[0]?.subscriberCcnt || 0,
        totalLikes: videoStats[0]?.totalLikesCnt || 0,
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViewsCnt || 0,

    }

    return res.status(200).json(
        new ApiResponse(
            200,
            stats,
            "Stats Fetched"
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const videos = await Video.aggregate([
        {
            $match: {
                owner: req.user?._id
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $addFields: {
                createdAt: { $dateToParts: { date: "$createdAt" } },
                likesCnt: { $size: "$likes" }
            }
        },
        {
            $sort: {
                createdAt: 1
            }
        },
        {
            $project: {
                _id: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                isPublished: 1,
                likesCnt: 1,
                createdAt: 1,
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
            }
        }
    ])


    if (!videos) {
        throw new ApiError(501, "No videos found")
    }

    res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    )
})

export {
    getChannelStats,
    getChannelVideos
}