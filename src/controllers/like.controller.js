import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Not a valid video id")
    }

    const like = await Like.findOne({
        video: new mongoose.Types.ObjectId(videoId),
        likedBy: req.user?._id
    })

    let isLiked;
    if (like) {
        const deleteLike = await Like.findByIdAndDelete(like._id);

        if (!deleteLike) {
            throw new ApiError(501, "Something went wrong while disliking");
        }

        isLiked = false;
    }
    else {
        const addLike = await Like.create({
            video: new mongoose.Types.ObjectId(videoId),
            likedBy: req.user?._id
        });

        if (!addLike) {
            throw new ApiError(501, "Something went wrong while liking");
        }

        isLiked = true;
    }

    res.status(200).json(
        new ApiResponse(200, { isLiked }, "Toggled like successfully")
    );

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId)) {
        throw new ApiError(401, "Not a valid video id")
    }

    const like = await Like.findOne({
        comment: new mongoose.Types.ObjectId(commentId),
        likedBy: req.user?._id
    })

    let isLiked;
    if (like) {
        const deleteLike = await Like.findByIdAndDelete(like._id);

        if (!deleteLike) {
            throw new ApiError(501, "Something went wrong while disliking");
        }

        isLiked = false;
    }
    else {
        const addLike = await Like.create({
            comment: new mongoose.Types.ObjectId(commentId),
            likedBy: req.user?._id
        });

        if (!addLike) {
            throw new ApiError(501, "Something went wrong while liking");
        }

        isLiked = true;
    }

    res.status(200).json(
        new ApiResponse(200, { isLiked }, "Toggled comment like successfully")
    );

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(401, "Not a valid tweet id")
    }

    const like = await Like.findOne({
        tweet: new mongoose.Types.ObjectId(tweetId),
        likedBy: req.user?._id
    })

    let isLiked;
    if (like) {
        const deleteLike = await Like.findByIdAndDelete(like._id);

        if (!deleteLike) {
            throw new ApiError(501, "Something went wrong while disliking");
        }

        isLiked = false;
    }
    else {
        const addLike = await Like.create({
            comment: new mongoose.Types.ObjectId(tweetId),
            likedBy: req.user?._id
        });

        if (!addLike) {
            throw new ApiError(501, "Something went wrong while liking");
        }

        isLiked = true;
    }

    res.status(200).json(
        new ApiResponse(200, { isLiked }, "Toggled comment like successfully")
    );

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: req.user?._id
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos"
            }
        },
        { $unwind: "$videos" },
        {
            $lookup: {
                from: "users",
                localField: "videos.owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $project: {
                _id: 1,
                "videos.videoFile.url": 1,
                "videos.thumbnail.url": 1,
                "owner.username": 1,
                "owner._id": 1,
                "owner.avatar.url": 1,
                "videos.views": 1,
                "videos.duration": 1,
                "videos.title": 1,
                "videos.createdAt": 1
            }
        }
    ]);

    if (!likedVideos || likedVideos.length === 0) {
        throw new ApiError(501, "No videos found")
    }


    res.status(200).json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}