import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId=req.user?._id

    if(!(channelId && userId)){
        throw new ApiError(400,"Error while fetching the required data for toggling subscription")
    }
   
    const subscription=await Subscription.findOne({channel:channelId, subscriber:userId})
    console.log(subscription)

    if(subscription){
        await Subscription.findByIdAndDelete(subscription._id,{new:true})
    }
    else{
        await Subscription.create({channel:channelId,subscriber:userId})
    }

    return res.status(201).json(new ApiResponse(200,subscription,"Subscription toggle successful"))
    
    // TODO: toggle subscription
})

// return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId:channelId} = req.params
    if(!channelId){
        throw new ApiError(400,"Error while fetching the channel id")
    }

    if(!req.user?._id){
        throw new ApiError(400,"Unauthorized request")
    }
    const newchannelId=new mongoose.Types.ObjectId(channelId)
    // console.log(newchannelId);
    // console.log(req.user._id)
    if(!newchannelId.equals(req.user?._id)){
        throw new ApiError(404,"This channel is not owned by you")
    }

    const subscription=await Subscription.aggregate([
        {
            $match:{
                channel:newchannelId
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullname:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                subscriber:{
                    $first:"$subscriber"
                }
            }
        }
    ])

    if(!subscription){
        throw new ApiError(400,"Error encountered while fetching subscribers list")
    }

    return res.status(201).json(new ApiResponse(200,subscription,"Subscribers list fetched successfully"))

})

// return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    console.log("abcd")
    const { channelId:subscriberId } = req.params

    if(!subscriberId){
        throw new ApiError(400,"Error while fetching the channel id")
    }

    const channel=await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullname:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                channel:{
                    $first:"$channel"
                }
            }
        }
    ])

    if(!channel){
        throw new ApiError(400,"Error encountered while fetching channel list")
    }

    return res.status(201).json(new ApiResponse(200,channel,"Channel list fetched successfully"))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}