import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    //TODO: create playlist
    if (!name) {
        throw new ApiError(401, "Name is required")
    }

    const playlist = await Playlist.create({
        name: name,
        description: description || "",
        owner: req.user._id
    })

    if (!playlist) {
        throw new ApiError(501, "Something went wrong while creating the playlist")
    }

    res.status(200).json(
        new ApiResponse(200, playlist, "Playlist created successfully")
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists

    if (!isValidObjectId(userId)) {
        throw new ApiError(401, "Not a valid userId")
    }

    const playlist = await Playlist.find({
        owner: userId
    })

    if (!playlist) {
        throw new ApiError(501, "No playlist found")
    }

    res.status(200).json(
        new ApiResponse(200, playlist, "Playlists fetched successfully")
    )


})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(401, "Not a valid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(501, "Not playlist found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "you cannot access the playlist as you are not owner")
    }

    res.status(200).json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
        throw new ApiError(401, "Not valid object Id");
    }

    // console.log(playlistId, videoId);

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(401, "No playlist found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You cannot add a video to this playlist as you are not the owner");
    }

    if (playlist.videos.find((obj) => obj?._id.toString() === videoId)) {
        throw new ApiError(401, "Video already exists in your playlist");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),

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
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                owner: 1
            }
        }
    ]);

    if (!video || video.length === 0) {
        throw new ApiError(501, "No such video found");
    }

    playlist.videos.push(video[0]);

    await playlist.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, playlist, "Video added successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
        throw new ApiError(401, "Not valid object Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(401, "No playlist found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You cannot add a video to this playlist as you are not the owner");
    }

    if (!playlist.videos.find((obj) => obj?._id.toString() === videoId)) {
        throw new ApiError(401, "Video does not exist in your playlist");
    }

    playlist.videos = playlist.videos.filter((obj) => obj._id.toString() !== videoId)

    await playlist.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, playlist, "Video removed successfully")
    );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(401, "Not a valid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(501, "Not playlist found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "you cannot delete the playlist as you are not owner")
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if (!deletePlaylist) {
        throw new ApiError(501, "Something went wrong while deleting playlist")
    }


    res.status(200).json(
        new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(401, "Not a valid playlist id")
    }

    if (!name) {
        throw new ApiError(401, "Name is required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(501, "Not playlist found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "you cannot update the playlist as you are not owner")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name,
                description: description || ""
            }
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(501, "Something went wrong while updating the playlist")
    }


    res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}