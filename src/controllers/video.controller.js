import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const pageNumber = Math.max(Number(page), 1);
  const pageLimit = Math.max(Number(limit), 50);

  const matchStage = {};
  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }
  if (userId) {
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  const aggregate = Video.aggregate([
    { $match: matchStage },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        __v: 0,
        "owner.password": 0,
        "owner.refreshToken": 0,
      },
    },
  ]);

  const options = {
    page: pageNumber,
    limit: pageLimit,
  };

  const result = await Video.aggregatePaginate(aggregate, options);
 

  if (!result) {
    throw new ApiError(500, "Error fetching videos");
  }
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: result.docs,
        pagination: {
          totalItems: result.totalDocs,
          totalPages: result.totalPages,
          page: result.page,
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      },
      "Videos fetched successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile[0]?.path;

  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const videoUpload = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoUpload || !thumbnailUpload) {
    throw new ApiError(500, "Error uploading files to cloudinary");
  }

  const newVideo = await new Video({
    videoFile: videoUpload.url,
    thumbnail: thumbnailUpload.url,
    owner: req.user._id,
    title,
    description,
    views: 0,
    isPublished: true,
    duration: videoUpload.duration,
    owner: req.user._id,
  });

  await newVideo.save();
  if (!newVideo) {
    throw new ApiError(500, "Error creating video");
  }

  return res.status(201).json({
    message: "Video published successfully",
    data: newVideo,
  });
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //TODO: get video by id
  if (!videoId) {
    throw new ApiError(400, "No para");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(500, "Video not found");
  }

  return res.status(200).json(new ApiResponse(200, video, "Video found"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  if (!videoId || !title || !description) {
    throw new ApiError(400, "Video ID, title and description are required");
  }

  const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!newThumbnail) {
    throw new ApiError(500, "Error uploading thumbnail to cloudinary");
  }
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: newThumbnail.url,
      },
    },
    { new: true }
  );
  if (!updatedVideo) {
    throw new ApiError(500, "Error updating video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!videoId) {
    throw new Error(400, "Video ID is required");
  }
  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(500, "Video not Found or Error deleting video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "video is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video.isPublished,
        "Video publish status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
