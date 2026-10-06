import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model";


export const verifyjwt = asyncHandler(async(req,_,next)=>{
  try {
    const token = req.cookie.accessToken || req.header("Authorization")?.replace("Bearer ","");
  
    if(!token){
      throw new ApiError(401,"Unauthorized Request!!")
    }
  
    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
  
    if(!user){
      //Important Discussion about frontend
      throw new ApiError(401,"Invalid Access Token!!")
    }
  
    req.user = user;
    next()
  } catch (error) {
    throw new ApiError(400,error?.message || "Invalid Access Token!!")
  }
})