import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const owner = req.user;

  //TODO: create playlist
  if (!name || !description) {
    throw new ApiError("400", "Name and Description are required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner,
    videos: [],
  });

  await playlist.save();

  if (!playlist) {
    throw new ApiError(401, "Error while creating playlist please try again");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist is created"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "invalid userId");
  }

  const userPlaylist = await Playlist.find({
    owner: new mongoose.Types.ObjectId(userId),
  }).select("-password -refreshToken");
  if (!userPlaylist) {
    throw new ApiError(401, "something wrong while getting the playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userPlaylist, "Successfully get the playlist"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const result = await Playlist.find({ _id: playlistId });

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
  ]);

  if (!playlist.length) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist found"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "wrong playlist or video id");
  }

  const result = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(501, "error while adding the video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, result, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "wrong playlist or video id");
  }

  const result = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: new mongoose.Types.ObjectId(videoId),
      },
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(501, "error while deleting the video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, result, "Video deleted to playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(401, "playlistid is not valid");
  }

  const deletePlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletePlaylist) {
    throw new ApiError(403, "error while deleting the playlist");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, deletePlaylist, "Playlist Deleted Successfully")
    );

  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!name || !description) {
    throw new ApiError(404, "name and description both required");
  }

  const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updatePlaylist) {
    throw new ApiError(404, "error while updating");
  }

  return res
    .status(200)
    .json({ message: "Updated Seccessfully", data: { updatePlaylist } });
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
