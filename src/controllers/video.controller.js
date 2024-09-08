import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const getMyVideos = asyncHandler(async (req,res) => {
const {userId}=req.params;
if(!userId){
  throw new ApiError(400,"Invalid user id")
}

const videoAggregate=await Video.aggregate([
  {
    $match:{
      owner: new mongoose.Types.ObjectId(userId),
    }
  },
  {
    $lookup:{
      from:"users",
      localField:"owner",
      foreignField:"_id",
      as:"ownerVideos",
      pipeline:[
        {
          $project:{
            username:1,
            fullname:1,
            avatar:1,
            _id:1,
          }
        }
      ]
    }
  },
  {
    $addFields:{
      ownerVideos:{
        $first:"$ownerVideos",
      }
    }
  }

])

if(!videoAggregate){
  throw new ApiError(400,"Error in fetching user's uploaded videos")
}

return res.status(200).json(new ApiResponse(201,videoAggregate,"User's uploaded videos fetched successfully"))


})

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    query = "",
    sortBy="createdAt",
    sortType=1,
  } = req.query;
  // console.log(typeof(page),typeof(limit),typeof(sortBy),typeof(sortType))
  //TODO: get all videos based on query, sort, pagination
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const parsedSortType = parseInt(sortType, 10);

  const videoAggregate = Video.aggregate([
    {
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
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
              fullname: 1,
              avatar: 1,
              username: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $sort: {
        [sortBy || "createdAt"]: parsedSortType || 1,
      },
    },
  ]);

  const options = {
    page:parsedPage,
    limit:parsedLimit,
    customLabels: {
      totalDocs: "totalVideos",
      docs: "videos",
    },
    skip: (page - 1) * limit,
    limit: parseInt(limit),
  };

  const total = await Video.aggregatePaginate(videoAggregate, options);
  if (!total) {
    throw new ApiError(500, "Unexpected issue while video aggregation");
  }
  //   console.log(total);

  if (total?.videos?.length === 0 && userId) {
    return res.status(200).json(new ApiResponse(200, [], "No videos found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, total, "video fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (
    [title, description].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are mandatory");
  }
  //vlp=video local path
  //tlp=thumbnail local path
  let vlp = null;
  let tlp = null;

  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile &&
    req.files.videoFile.length > 0
  ) {
    vlp = req.files.videoFile[0].path;
  }

  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail &&
    req.files.thumbnail.length > 0
  ) {
    tlp = req.files.thumbnail[0].path;
  }

  if (!vlp) {
    throw new ApiError(400, "Video file is required");
  }
  if (!tlp) {
    throw new ApiError(400, "Thumbnail is required");
  }
  //   console.log(req.files);

  const videoFile = await uploadOnCloudinary(vlp);
  const thumbnail = await uploadOnCloudinary(tlp);

  //   console.log("Problem is with videofile")
  //   console.log(videoFile)
  //   console.log(thumbnail)
  if (!videoFile) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const video = await Video.create({
    title,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    description,
    duration: videoFile.duration,
    isPublished: true,
    owner: req.user?._id,
  });
  if (!video) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, video, "Video uploaded and published successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Invalid request");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Failed to fetch the video");
  }

  const watchHistory = req.user?.watchHistory;

  if (!watchHistory.includes(videoId)) {
    const newwatchHistory = [...watchHistory, videoId];
    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          watchHistory: newwatchHistory,
        },
      },
      { new: true }
    );

    console.log(newwatchHistory);

    await Video.findByIdAndUpdate(
      videoId,
      {
        $inc: { views: 1 },
      },
      { new: true }
    );
  }

  const fetchedVideo = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
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
              username: 1,
              fullname: 1,
              avatar: "$avatar.url",
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, fetchedVideo[0], "Video fetched successfully"));

  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, thumbnail } = req.body;
  if (!videoId) {
    throw new ApiError(400, "Invalid request");
  }
  if (!(title || description || thumbnail)) {
    throw new ApiError(400, "One of the fields is mandatory");
  }
  const editVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail,
      },
    },
    { new: true }
  ).select("-isPublished");

  return res
    .status(201)
    .json(
      new ApiResponse(200, editVideo, "Video details updated successfully")
    );
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Invalid delete-video request");
  }

  const video = await Video.findById(videoId);
  // console.log(video.owner,req.user?._id)
  if (String(video.owner) !== String(req.user?._id)) {
    throw new ApiError(400, "This video is not published by you !!");
  }

  const delVideo = await Video.findByIdAndDelete(videoId,{new:true});

  if(!delVideo){
    throw new ApiError(400,"Some error occured while deleting the video")
  }

  const watchHistory = req.user?.watchHistory;
  let newwatchHistory = [];
  if (watchHistory.includes(videoId)) {
    newwatchHistory = watchHistory.filter((id) => id !== videoId);
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        watchHistory: newwatchHistory,
      },
    },
    { new: true }
  );
  //TODO: delete video
  return res
    .status(201)
    .json(new ApiResponse(200, delVideo, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Invalid Toggle request");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Invalid video request");
  }

  const toggleVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(200, toggleVideo, "Publish status changed successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getMyVideos
};
