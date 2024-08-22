import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser=await User.findOne({
    // $or:[]
    $or:[{username},{email}]
  }) 

  if(existedUser){
    throw new ApiError(409,"Someone with this username/email already exists")
  }
  //alp=avatar local path
  //curl= cover local path url
  let alp=null;
  let clp=null;
  let curl="";
  
  if(req.files && Array.isArray(req.files.avatar) &&req.files.avatar && req.files.avatar.length>0){
    alp=req.files.avatar[0].path;
  }

  if(req.files && Array.isArray(req.files.coverImage) &&req.files.coverImage && req.files.coverImage.length>0){
    clp=req.files.coverImage[0].path;
  }

  // console.log(req.files)

  if(!alp){
    throw new ApiError(400,"Avatar file is required")
  }

  const avatar=await uploadOnCloudinary(alp)
  const cover=await uploadOnCloudinary(clp)

  
  if(clp && cover){
    curl=cover.url;
  }

  if(!avatar){
    throw new ApiError(400,"Avatar file is required")
  }

  const user=await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:curl,
    email,
    password,
    username: username.toLowerCase()
  })

  const createduser =await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if(!createduser){
    throw new ApiError(500,"Something went wrong while registering the user")
  }

  // return res.status(201).json({createduser}) This is also correct but not structured
  return res.status(201).json(
    new ApiResponse(200, createduser,"User registered successfully")
  )

});

export default registerUser;
