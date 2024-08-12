import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteFile, uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    console.log(userId);
    const pipeline = [];

    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    
    pipeline.push({ $match: { isPublished: true } });

   
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
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
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const uploadVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    // check if title and desc are presnt
    // check for both thumbnail and video file
    // upload video to cloudinary then upload thumbnail
    // check if got the url or not
    // create a video object 

    if (!(title && description)) {
        throw new ApiError(400, "Title and description are required")
    }

    const videoLocalPath = req.files?.video[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if (!(videoLocalPath && thumbnailLocalPath)) {
        throw new ApiError(400, "Video and Thumbnail are required")
    }

    const video = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);


    if (!(video && thumbnail)) {
        throw new ApiError(400, "Something went wrong while uploading to cloudinary")
    }

    // console.log(req.user);
    const videoObj = await Video.create({

        title: title,
        description: description,
        videoFile: {
            url: video.url,
            public_id: video.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        owner: new mongoose.Types.ObjectId(req.user?._id),
        isPublished: true,
        duration: video?.duration,
    })

    if (!video) {
        throw new ApiError(400, "Something went wrong while creating video object in database")
    }

    res.status(200).json(
        new ApiResponse(200, videoObj, "Video Uploaded Successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is required")
    }

    const video = await Video.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCnt: { $size: "$subscribers" },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            subscriberCnt: 1,
                            isSubscribed: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes"] },
                        then: true,
                        else: false
                    }
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video) {
        throw new ApiError(501, "Failed to fetch the video")
    }

    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                views: 1
            }
        }
    )

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet: {
                watchHistory: videoId
            }
        }
    )
    // console.log(video)
    res.status(200).json(
        new ApiResponse(200, video[0], "Video fetched successfully")
    )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!videoId) {
        throw new ApiError(401, "No videoId received")
    }
    const { title, description } = req.body

    if (!(title && description)) {
        throw new ApiError(401, "Title and Description is required")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(401, "No video found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You cannot edit the video because you are not the owner.");
    }

    const thumbnailLocalPath = req.file?.path
    // console.log(thumbnailLocalPath)
    if (!thumbnailLocalPath) {
        throw new ApiError(401, "Thumbnail is required")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
        throw new ApiError(501, "Something went wrong while uploading thumbnail to cloudinary")
    }

    const oldThumbnailid = video?.thumbnail?.public_id;

    const updatedVideo = await findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title,
                description: description,
                thumbnail: {
                    url: thumbnail?.url,
                    public_id: thumbnail?.public_id
                }
            }
        },
        {
            new: true
        }
    )

    if (!updateVideo) {
        throw new ApiError(501, "Something went worng while updating video")
    }

    if (!(await deleteFile(oldThumbnailid))) {
        throw new ApiError(501, "Old thumbnail not deleted properly")
    }

    res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video Updated succesfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "videoId is not valid")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(401, "No video found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You cannot delete the video because you are not the owner.")
    }

    const deletedVideo = await Video.findByIdAndDelete(video?._id)

    await deleteFile(video?.videoFile?.public_id)
    await deleteFile(video?.thumbnail?.public_id)

    res.status(200).json(
        new ApiResponse(200, deletedVideo, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "videoId is not valid")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(401, "No video found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You cannot delete the video because you are not the owner.")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        video?._id,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        {
            new: true
        }
    )

    res.status(200).json(
        new ApiResponse(200, updatedVideo, "Publish status toggled succesfully")
    )
})

export {
    getAllVideos,
    uploadVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}