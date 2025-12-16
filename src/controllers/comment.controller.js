import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import { Video } from "../models/video.model.js";

// const getVideoComments = asyncHandler(async (req, res) => {
//   //TODO: get all comments for a video
//   const { videoId } = req.params;
//   const { page = 1, limit = 10 } = req.query;

//   const pageNumber = Math.max(Number(page), 1);
//   const pageLimit = Math.max(Number(limit), 50);

//   if (!mongoose.isValidObjectId(videoId)) {
//     throw new ApiError(400, "Video id is invalid");
//   }

//   const aggregate = Comment.aggregate([
//     {
//       $match: { video: videoId },
//     },
//   ]);

// //   const comments = await Comment.find({ video: videoId });
// const options={
//     page:pageNumber,
//     limit:pageLimit
// }

// const result=await Video.aggregatePaginate(aggregate,options)

//   if (!result) {
//     throw new ApiError(500, "Fail to fetech comments");
//   }

//   return res.status(200).json(new ApiResponse(200, result, "All comments"));
// });

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const pageNumber = Math.max(Number(page), 1);
  const pageLimit = Math.max(Number(limit), 1);

  const aggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },

    // join user (comment owner)
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

    // shape response
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        "owner._id": 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },

    // latest comments first
    {
      $sort: { createdAt: -1 },
    },
  ]);

  const options = {
    page: pageNumber,
    limit: pageLimit,
  };

  const comments = await Comment.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(
      new ApiResponse(200, comments, "Video comments fetched successfully")
    );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;
  const owner = req.user;

  if (!owner) {
    throw new ApiError(400, "User Error ");
  }

  if (!content) {
    throw new ApiError(400, "enter the comment");
  }
  if (!videoId) {
    throw new ApiError(400, "Video Comment Id");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner,
  });
  await comment.save();

  if (!comment) {
    throw new ApiError(500, "Unable to Insert the comment");
  }

  return res.status(201).json(new ApiResponse(201, comment, "Comment Posted"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment

  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) {
    throw new ApiError(400, "Wrong Comment  Id");
  }
  if (!content) {
    throw new ApiError(400, "Must fill the content Field");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: { content },
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(500, "Error while updating the comment");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, updatedComment, "Updated the comment Successfully!")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment

  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "Comment Id not Found");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(400, "Comment not found");
  }
  const deletedComment = await Comment.findByIdAndDelete(commentId);

  console.log("deleted comment", deletedComment);

  if (!deletedComment) {
    throw new ApiError(500, "Error while deleting the comment");
  }

  return res.status(201).json(new ApiResponse(201, {}, "Deleted the Commment"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
