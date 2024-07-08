import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteFile, uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

})

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

    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }

    const video = await Video.aggregate(
        [
            {
                $match: {
                    _id: videoId
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreginFiled: "_id",
                    as: "channel"
                }
            }
        ])

    if (!video) {
        throw new ApiError(400, "Video does not exist")
    }


    res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
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

    const deltedVideo = await Video.findByIdAndDelete(video?._id)

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