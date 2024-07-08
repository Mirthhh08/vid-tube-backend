import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose"
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    // get the videoId jispe comment krna hai
    // get the user id

    const { content } = req.body

    if (content?.trim() === "") {
        throw new ApiError(400, "Content can not be empty")
    }

    const comment = await Comment.create({
        content: content,
        videoId: new mongoose.Types.ObjectId(req.params),
        userId: new mongoose.Types.ObjectId(req.user?._id)
    })

    if (!comment) {
        throw new ApiError(400, "Something went wrong while creating the comment")
    }

    res.status(200).json(
        new ApiResponse(200, comment, "Comment Created Successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}