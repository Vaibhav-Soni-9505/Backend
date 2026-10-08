import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

export {registerUser,loginUser,logoutUser,refreshAccessToken};