import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";


const uploadVideo = asyncHandler(async(req,res)=>{
  const {title,description} = req.body;
  if(!title || !description){
    throw new ApiError(400,"title and description is required!!");
  }

  const owner = req?.user?._id;
  if(!owner){
    throw new ApiError(400,"Invalid Request");
  }

  const existedVideo = await Video.findOne({
    $or: [{title},{description}]
  });

  if(existedVideo){
    throw new ApiError(400,"Video with this title or description already exists, please continue with another title or description!!");
  };

  const thumbnaillocalPath = req.files?.thumbnail?.[0]?.path;
  const videoFilelocalPath = req.files?.videoFile?.[0]?.path;
  if(!thumbnaillocalPath || !videoFilelocalPath){
    throw new ApiError(400,"thumbnail or videoFile is required");
  };

  const thumbnail = await uploadOnCloudinary(thumbnaillocalPath);
  const videoFile = await uploadOnCloudinary(videoFilelocalPath);

  if(!thumbnail || !videoFile){
    throw new ApiError(500,"Something Went Wrong while uploading files on cloudinary!!");
  }  
  
  const duration = videoFile.duration

  const video = await Video.create({
    title,
    description,
    duration,
    owner,
    thumbnail: thumbnail?.secure_url,
    videoFile: videoFile?.secure_url,
    thumbnailPublicId: thumbnail?.public_id,
    videoPublicId: videoFile?.public_id
  });

  const uploadedVideo = await Video.findById(video?._id);
  if(!uploadedVideo){
    throw new ApiError(500,"Something went wrong while uploading the video")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,"Video Uploaded Successfully",uploadedVideo))
  
})

const togglePublishStatus = asyncHandler(async(req,res)=>{
  const {videoId} = req.params;

  const video = await Video.findById(videoId);
  if(!video){
    throw new ApiError(404,"Video does not exists!!");
  }

  if(req.user._id.toString() !== video.owner.toString()){
    throw new ApiError(403,"Unauthorized Request, This video does not belongs to your channel!!")
  }

  video.isPublished = !video.isPublished;
  await video.save({validateBeforeSave:false});

  return res
  .status(200)
  .json(new ApiResponse(
    200,
    video.isPublished ? "Your Video is Published" : "Your Video is Unpublished",
    {"isPublished":video.isPublished}));
})

const getAllVideos = asyncHandler(async(req,res)=>{
  const aggregate = Video.aggregate([
    {
      $match: {
        isPublished: true
      }
    },
    {
      $sort:{
        createdAt: -1
      }
    }
  ]);

  const page = Math.max(1,parseInt(req.query.page,10) || 1);
  const limit = Math.min(50,Math.max(1,parseInt(req.query.limit,10) || 10))

  const result = await Video.aggregatePaginate(aggregate,{
    page,
    limit
  })

  return res
  .status(200)
  .json(new ApiResponse(200,"Successfully Fetched Videos",result))
})

const getVideoById = asyncHandler(async(req,res)=>{
  const {videoId} = req.params;
  const video = await Video.findById(videoId);;
  if(!video){
    throw new ApiError(400,"Video does not Exist!!");
  }

  if(video.isPublished === false){
    throw new ApiError(400,"This video is not available for the users!!");
  }

  return res
  .status(200)
  .json(new ApiResponse(200,"Video Fetched Successfully",video));

})

const getOwnerVideoById = asyncHandler(async(req,res)=>{
  const {videoId} = req.params;
  const video = await Video.findById(videoId);
  if(!video){
    throw new ApiError(404,"Video does not Exist!!");
  }

  if(req.user._id.toString() !== video.owner.toString()){
    throw new ApiError(403,"Unauthorized Request, This video does not belongs to your channel!!")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,"Video Fetched Successfully and you are the owner",video));
})

const updateVideoDetails = asyncHandler(async(req,res)=>{
  const {videoId} = req.params;
  const {title, description} = req.body;
  const video = await Video.findById(videoId);

  if(!video){
    throw new ApiError(404,"Video Does not Exist!!");
  }

  if(req.user._id.toString() !== video.owner.toString()){
    throw new ApiError(403,"Unauthorized Request, This video does not belongs to your channel!!")
  }

  const updateData = {};

  if (title !== undefined && !title.trim()) {
    throw new ApiError(400, "Title cannot be empty");
  }

  if (description !== undefined && !description.trim()) {
    throw new ApiError(400, "Description cannot be empty");
  }

  if (title !== undefined) {
    updateData.title = title.trim();
  }

  if (description !== undefined) {
    updateData.description = description.trim();
  }

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;

  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
      throw new ApiError(500, "Thumbnail upload failed");
    }

    updateData.thumbnail = thumbnail.secure_url;
    updateData.thumbnailPublicId = thumbnail.public_id;
  }

  if (videoFileLocalPath) {
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    if (!videoFile) {
      throw new ApiError(500, "Video upload failed");
    }

    updateData.videoFile = videoFile.secure_url;
    updateData.duration = videoFile.duration;
    updateData.videoPublicId = videoFile.public_id;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No data provided for update");
  }

  const updatedVideoDetails = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updateData
    },
    {
      new: true,
      runValidators: true
    }
  );

  return res
  .status(200)
  .json(new ApiResponse(200,"Video Details Updated!!",updatedVideoDetails))

})

const deleteVideo = asyncHandler(async(req,res)=>{
  const {videoId} = req.params;
  const video = await Video.findById(videoId);
  if(!video){
    throw new ApiError(404,"Video does not exist")
  }

  if(req.user._id.toString() !== video.owner.toString()){
    throw new ApiError(403,"Unauthorized Request, You cannot delete this video!!")
  }

  const deletedVideo = await deleteOnCloudinary(
    video.videoPublicId,
    "video"
  );

  if (!deletedVideo || deletedVideo.result !== "ok") {
    throw new ApiError(500, "Video deletion failed on Cloudinary");
  }

  const deletedThumbnail = await deleteOnCloudinary(
    video.thumbnailPublicId,
    "image"
  );

  if (!deletedThumbnail || deletedThumbnail.result !== "ok") {
    throw new ApiError(500, "Thumbnail deletion failed on Cloudinary");
  }

  await Video.findByIdAndDelete(video._id);

  return res
  .status(200)
  .json(new ApiResponse(200,"Video deleted Successfully",{}))

})

export{
  uploadVideo,
  togglePublishStatus,
  getAllVideos,
  getVideoById,
  getOwnerVideoById,
  updateVideoDetails,
  deleteVideo
}