import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;
  // TODO: toggle subscription

  //userid from req.user
  //

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "the channelid is not valid");
  }
  if (!userId) {
    throw new ApiError(400, "must be login");
  }

  const result = await Subscription.findOne({
    channel: channelId,
    subscriber: userId,
  });

  let data = null;
  let message = "";
  if (!result) {
    data = await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });
    message = "Subscribed Successfully";
  } else {
    await Subscription.findOneAndDelete({ _id: result._id });
    message = "UnSubscribed Successfully";
  }

  return res.status(200).json(new ApiResponse(200, data, message));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  console.log(channelId);

  const result = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetail",
      },
    },
    {
      $unwind: "$subscriberDetail",
    },
    {
      $facet: {
        totalSubscribers: [{ $count: "count" }],
        subscribers: [
          {
            $project: {
              "subscriberDetail.password": 0,
              "subscriberDetail.refreshToken": 0,
              __v: 0,
            },
          },
        ],
      },
    },
  ]);

  const total = result[0].subscribers || [];

  return res
    .status(201)
    .json(new ApiResponse(201, total, "List of subscribers"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;
  if (!userId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "something wrong channelid or userid not login");
  }

  const validUser = await User.findById(channelId);
  if (!validUser) {
    throw new ApiError(401, "User not found");
  }

  const listSubscribed = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "listSubscribed",
      },
    },
    {
      $project: {
        "listSubscribed.password": 0,
        "listSubscribed.refreshToken": 0,
      },
    },
  ]);

  console.log(listSubscribed);
  if (!listSubscribed) {
    throw new ApiError(400, "not found list");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, listSubscribed, "Subscribed List"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
