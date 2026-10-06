import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";



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

export {registerUser};