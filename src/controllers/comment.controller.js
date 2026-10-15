import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose from "mongoose"



const createComment = asyncHandler(async(req,res)=>{
  const {videoId} = req.params;
  const {content} = req.body;
  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findOne({_id:videoId,isPublished: true});
  if(!video){
    throw new ApiError(404,"video does not exist");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Content is required to comment!!");
  }

  const comment = await Comment.create(
    {
      content,
      video: videoId,
      owner: req.user._id
    }
  );
  if(!comment){
    throw new ApiError(400,"Something went wrong while creating comment!!")
  }

  return res
  .status(201)
  .json(new ApiResponse(201,"Comment Created Successfully!!",comment));
})

const getVideoComments = asyncHandler(async(req,res)=>{
  const {videoId} = req.params;
  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findOne({_id:videoId,isPublished:true});
  if(!video){
    throw new ApiError(404,"Video does not exist");
  }

  const aggregate = Comment.aggregate([
    {
      $match:{
        video: new mongoose.Types.ObjectId(videoId),
      }
    },
    {
      $sort: {
        createdAt: -1
      }
    },
    {
      $lookup:{
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails"
        }
      }
    },
    {
      $project:{
        ownerDetails: 0
      }
    }
  ]);


  const page = Math.max(1,parseInt(req.query.page,10) || 1);
  const limit = Math.min(50,Math.max(1,parseInt(req.query.limit,10) || 10));

  const result = await Comment.aggregatePaginate(aggregate,{
    page,
    limit
  });


  return res
  .status(200)
  .json(new ApiResponse(200,"Video Comments Fetched Successfully!!",result))
})

const updateComment = asyncHandler(async(req,res)=>{
  const {commentId} = req.params;
  const {content} = req.body;
  if(!mongoose.isValidObjectId(commentId)){
    throw new ApiError(400,"Invalid Comment Id");
  }

  const comment = await Comment.findById(commentId);
  if(!comment){
    throw new ApiError(404,"No Comment Found");
  }

  if(comment.owner.toString() !== req.user._id.toString()){
    throw new ApiError(403,"Unautorized Request, you are not allowed to update this comment");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Content is required to update!!");
  }

  comment.content = content.trim();
  await comment.save();

  return res
  .status(200)
  .json(new ApiResponse(200,"Comment Updated Successfully!!",comment))
});

const deleteComment = asyncHandler(async(req,res)=>{
  const {commentId} = req.params;
  if(!mongoose.isValidObjectId(commentId)){
    throw new ApiError(400,"Invalid Comment Id");
  }

  const comment = await Comment.findById(commentId);
  if(!comment){
    throw new ApiError(404,"No Comment Found");
  }

  if(comment.owner.toString() !== req.user._id.toString()){
    throw new ApiError(403,"Forbidden Request, you are not allowed to delete this comment");
  }

  const result = await Comment.findByIdAndDelete(comment._id);
  if(!result){
    throw new ApiError(404,"Something went wrong while deleting the comment")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,"Comment deleted Successfully!!",{}))

})

export {
  createComment,
  getVideoComments,
  updateComment,
  deleteComment
}