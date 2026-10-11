import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async(user_id)=>{
  try {
    const user = await User.findById(user_id);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    return {accessToken,refreshToken};

  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating the access and refresh token!!");
  }

}

const registerUser = asyncHandler(async(req,res)=>{
  //get user details from frontend
  //validate the details like email password etc
  //check if user already exist 
  //check for the avatar and coverimage 
  //upload images to cloudinary, check for avatar
  //create user object- save the entry in db
  //remove password and refreshtoken from the response of the db
  //check if the user is created
  //send res

  const {username,email,fullName,password} = req.body;

  if([username,email,fullName,password].some((field)=>field?.trim()==="")){
    throw new ApiError(401,"All fields are Required!!")
  }
  

  const existedUser = await User.findOne({
    $or: [{username},{email}]
  })

  if(existedUser){
    throw new ApiError(409,"User already exists")
  }
  
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  // let coverImageLocalPath;
  // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar local file is required");
  }

  
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!avatar){
    throw new ApiError(400,"Avatar file is required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.secure_url,
    coverImage: coverImage?.secure_url || "",
    password
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")
  if(!createdUser){ 
    throw new ApiError(500,"Something went wrong while regestering the user")
  }

  res.status(201).json(new ApiResponse(200,"User created Successfully",createdUser))
})

const loginUser = asyncHandler(async(req,res)=>{
  //req.body--> data
  //check username or email in database
  //find the user
  //check password
  //generate the access and refresh token
  //send them in cookies
  //send response successfully registered

  const {username, email, password} = req.body;

  if(!(username || email)){
    throw new ApiError(401,"Username or email is required!!");
  }
  if(!password){
    throw new ApiError(401,"password is required");
  }

  const user = await User.findOne({
    $or: [{username},{email}]
  });

  if(!user){
    throw new ApiError(400,"No User Found, Please Register!!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if(!isPasswordValid){
    throw new ApiError(402,"Incorrect Password");
  }

  const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(200,"User LoggedIn Successfully",{user: loggedInUser,accessToken,refreshToken})
  )


})

const logoutUser = asyncHandler(async(req,res)=>{
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {refreshToken: undefined}
    },
    {
      new:true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,"User LoggedOut Succcessfully!!",{}))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized Request!!");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id);
    if(!user){
      throw new ApiError(401,"Invalid Refresh Token!!");
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
       throw new ApiError(402,"Refresh Token is not correct or expired!!");
    }
  
    const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id);
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(new ApiResponse(201,"Access Token Refreshed",{accessToken,"refreshToken": newRefreshToken}))
  } catch (error) {
    throw new ApiError(401,"Invalid Refresh Token!!")
  }
})

const changePassword = asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword,confirmPassword} = req.body;

  if(!(oldPassword && newPassword)){
    throw new ApiError(400,"Old and New Password is Required!!");
  }

  if(newPassword !== confirmPassword){
    throw new ApiError(400,"password is not matched");
  }

  const user = await User.findById(req.user?._id)
  
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if(!isPasswordValid){
    throw new ApiError(401,"Your Old password is invalid!!");
  }

  user.password = newPassword;  
  await user.save({validateBeforeSave:false});

  return res
  .status(200)
  .json(new ApiResponse(201,"Password Changed Successfully",{}));
});

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(new ApiResponse(200,"Current User Fetched",req?.user))
});

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {username,email,fullName} = req.body;
  if(!username && !email && !fullName){
    throw new ApiError(401,"Atleast one field is required!!");
  }

  const updataData = {};

  if(username) updataData.username = username;
  if(email) updataData.email = email;
  if(fullName) updataData.fullName = fullName;

  const user = User.findByIdAndUpdate(req?.user?._id,{$set:updataData},{new:true}).select("-password -refreshToken");

  return res
  .status(201)
  .json(new ApiResponse(201,"Account Details Updated Successfully",user));
});

const updateUserAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar File is Required!!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar){
    throw new ApiError(401,"There was some error while uploading Avatar Image");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set:{avatar: avatar?.secure_url}
    },
    {new:true}).select("-password -refreshToken");

  return res
  .status(200)
  .json(new ApiResponse(200,"Avatar is Updated Successfully",user));
});

const updateUserCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path;
  if(!coverImageLocalPath){
    throw new ApiError(400,"Cover Image File is Required!!");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage){
    throw new ApiError(401,"There was some error while uploading Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set:{coverImage: coverImage?.secure_url}
    },
    {new:true}).select("-password -refreshToken");

  return res
  .status(200)
  .json(new ApiResponse(200,"Cover Image is Updated Successfully",user));
});

const getUserChannelProfile = asyncHandler(async(req,res)=>{
  const {username} = req.params;
  if(!username){
    throw new ApiError(400,"Something Went Wrong, Username is Missing!!")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username:username.toLowerCase()
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "Subscribers"
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscribers",
        as: "SubscribedTo"
      }
    },
    {
      $addFields:{
        subscribersCount:{
          $size: "$Subscribers"
        },
        subscribeToCount:{
          $size: "$SubscribedTo"
        },
        isSubscribed:{
          $cond: {
            if:{$in:[req.user?._id,"$Subscribers.subscribers"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        username: 1,
        email: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribeToCount: 1,
        isSubscribed: 1
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(400,"Channel Does Not Exist!!");
  }

  return res
  .status(200)
  .json(new ApiResponse(200,"Channel Fetched Successfully",channel[0]));
})

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup:{
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
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
            $addFields:{
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ]);

  return res
  .status(200)
  .json(new ApiResponse(200,"Watch History Fetched Successfully!!",user[0].watchHistory))
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};