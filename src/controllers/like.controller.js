
import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(400,"Invalid video id for toggling like")
    }
    if(!req.user?._id){
        throw new ApiError(400,"User must be logged in for toggling the video likes")
    }
    const like=await Like.findOne({video:videoId})
    let newLike
    if(!like){
        newLike=await Like.create({
            video:videoId,
            likedBy:req.user?._id
        })
    }
    else{
        newLike=await Like.deleteOne({video:videoId,likedBy:req.user?._id})
    }

    if(!newLike){
        throw new ApiError(400,"Error occured while toggling the video like")
    }

    return res.status(201).json(new ApiResponse(200,newLike,"Video like toggle successful"))
    //TODO: toggle like on video
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!commentId){
        throw new ApiError(400,"Invalid video id for toggling like")
    }
    if(!req.user?._id){
        throw new ApiError(400,"User must be logged in for toggling the comment likes")
    }
    const like=await Like.findOne({comment:commentId,likedBy:req.user?._id})
    let newLike
    if(!like){
        newLike=await Like.create({
            comment:commentId,
            likedBy:req.user?._id
        })
    }
    else{
        newLike=await Like.deleteOne({comment:commentId,likedBy:req.user?._id})
    }

    if(!newLike){
        throw new ApiError(400,"Error occured while toggling the comment like")
    }

    return res.status(201).json(new ApiResponse(200,newLike,"Comment like toggle successful"))
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    if(!req.user?._id){
        throw new ApiError(400,"You must be logged in to see your liked videos")
    }
    const totalLikes=await Like.find({likedBy:req.user?._id});
    if(!totalLikes){
        throw new ApiError(400,"An error occured while fetching your liked videos")
    }
    // MORE TO DO in the aggregation function
    const likeAggregate=await Like.aggregate([
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                       fullname:1,
                                       username:1,
                                       avatar:1, 
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])


    if(!likeAggregate){
        throw new ApiError(400,"An error occured while aggregating your liked videos")
    }



    return res.status(201).json(new ApiResponse(200,likeAggregate,"Your liked videos have been fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
