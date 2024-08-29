import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  if (!videoId) {
    throw new ApiError(400, "Invalid video id");
  }
  try {
    const commentAggregate = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
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
                username: 1,
                avatar: 1,
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
  
    const page=1
    const limit=20
    const options = {
      page:parseInt(page),
      limit:parseInt(limit),
      customLabels: {
        totalDocs: "totalComments",
        docs: "comments",
      },
      skip: (page - 1) * limit,
      // limit: parseInt(limit),
    };
  
    const comments = await Comment.aggregatePaginate(commentAggregate, options);
    if (!comments) {
      throw new ApiError(400, "An error occured while fetching the comments");
    }
  
    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          commentAggregate,
          "Comments for this video fetched successfully"
        )
      );
  } catch (error) {
      console.log(error.message)
      throw new ApiError(404,"Failed to paginate comments")
  }
});

const addComment = asyncHandler(async (req, res) => {
    const {videoId}=req.params
    console.log(req.body)
    const {content}=req.body
    if(!req.user?._id){
        throw new ApiError(400,"You must be logged in to post a comment")
    }
    console.log(content)
    if(!content){
        throw new ApiError(400,"Error while getting the content from body")
    }
    if(!videoId){
        throw new ApiError(400,"Error while fetching the video for comments")
    }
    if(content.trim()===""){
        throw new ApiError(400,"Cannot post an empty comment")
    }

    const comment=await Comment.create({
        content:content,
        video:videoId,
        owner:req.user?._id
    })
    if(!comment){
        throw new ApiError(400,"Something went wrong while adding the comment")
    }

    return res.status(201).json(new ApiResponse(200,comment,"Comment added successfully"))
  // TODO: add a comment to a video
});

const updateComment = asyncHandler(async (req, res) => {
    const {commentId}=req.params
    const {content:newcontent}=req.body

    if(!commentId){
        throw new ApiError(400,"Error while fetching the comment to be updated")
    }
    if(!newcontent || newcontent.trim()===""){
        throw new ApiError(400,"Content field is mandatory")
    }

    const comment=await Comment.findByIdAndUpdate(commentId,{
        $set:{
            content:newcontent
        }
    }, {new:true})

    if(!comment){
        throw new ApiError(400,"Something went wrong while updating the comment")
    }

    return res.status(201).json(new ApiResponse(200,comment,"Comment updated successfully"))
  // TODO: update a comment

});

const deleteComment = asyncHandler(async (req, res) => {

    const{commentId}=req.params
    if(!commentId){
        throw new ApiError(400,"Invalid delete comment Id")
    }
    // console.log(commentId);
    // const cid=new mongoose.Types.ObjectId(commentId)
    // console.log(req.user._id);
    const comment=await Comment.findOne({_id:commentId,owner:req.user?._id})
    // console.log(comment);
    if(!comment){
      throw new ApiError(400,"You can only delete your own comments")
    }
    const deletedComment=await Comment.findByIdAndDelete(commentId,{new:true})

    if(!deletedComment){
        throw new ApiError(400,"Some error occured while deleting the comment")
    }

    return res.status(201).json(200,new ApiResponse(200,deletedComment,"Comment deleted successfully"))
  // TODO: delete a comment
});

export { getVideoComments, addComment, updateComment, deleteComment };
