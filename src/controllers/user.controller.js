import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const at = user.generateAccessToken();
    const rt = user.generateRefreshToken();

    user.refreshToken = rt;
    await user.save({ validateBeforeSave: false });
    return { at, rt };
  } catch (error) {
    throw new ApiError(
      500,
      "Something wnet wrong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    // $or:[]
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "Someone with this username/email already exists");
  }
  //alp=avatar local path
  //curl= cover local path url
  let alp = null;
  let clp = null;
  let curl = "";

  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar &&
    req.files.avatar.length > 0
  ) {
    alp = req.files.avatar[0].path;
  }

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage &&
    req.files.coverImage.length > 0
  ) {
    clp = req.files.coverImage[0].path;
  }

  // console.log(req.files)

  if (!alp) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(alp);
  const cover = await uploadOnCloudinary(clp);

  if (clp && cover) {
    curl = cover.url;
  }

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: curl,
    email,
    password,
    username: username.toLowerCase(),
  });

  const createduser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createduser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // return res.status(201).json({createduser}) This is also correct but not structured
  return res
    .status(201)
    .json(new ApiResponse(200, createduser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!email) {
    throw new ApiError(400, "email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "Please sign up before trying to log in");
  }

  // vp=valid password

  const vp = await user.isPasswordCorrect(password);

  if (!vp) {
    throw new ApiError(404, "Invalid user credentials");
  }

  const { at, rt } = await generateAccessRefreshToken(user._id);

  //To not send password to the user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpsOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", at, options)
    .cookie("refreshToken", rt, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: at,
          refreshToken: rt,
        },
        "User logged in sucessfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpsOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //irt=incoming refresh token

  const irt = req.cookies.refreshToken || req.body.refreshToken;

  if (!irt) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(irt, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (irt !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { at, rt } = await generateAccessRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", at, options)
      .cookie("refreshToken", rt, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: at,
            refreshToken: rt,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  //ipc
  const ipc = await user.isPasswordCorrect(oldPassword);

  if (!ipc) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //alp=avatar local path
  const alp = req.file?.path;
  if (!alp) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(alp);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading Avatar");
  }
  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");
  return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //clp=avatar local path
  const clp = req.file?.path;
  if (!clp) {
    throw new ApiError(400, "Cover file is missing");
  }
  const cover = await uploadOnCloudinary(clp);

  if (!cover.url) {
    throw new ApiError(400, "Error while uploading Cover image");
  }
  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: cover.url,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200,user,"Cover image updated successfully"))
});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
};
// export loginUser;
