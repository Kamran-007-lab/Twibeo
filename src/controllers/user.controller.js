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
  const alp=req.files?.avatar[0]?.path;
  const clp=req.files?.coverImage[0]?.path;

  if(!alp){
    throw new ApiError(400,"Avatar file is required")
  }

  const avatar=await uploadOnCloudinary(alp)
  const cover=await uploadOnCloudinary(clp)

  if(!avatar){
    throw new ApiError(400,"Avatar file is required")
  }

  const user=await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:cover?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createduser = User.findById(user._id).select(
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
