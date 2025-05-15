import { ApiError } from "../utills/ApiError.js";
import { ApiResponse } from "../utills/ApiResponses.js";
import { asyncHandler } from "../utills/asyncHnadler.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utills/cloudinary.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import { log } from "console";

// used in "loginUser" and "refreshAccessToken" 
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    //validateBeforeSave: false --> disables schema validation,
    //only updating one field and don’t want to trigger full validation
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError("500", "something went wrong during token generation");
  }
};


const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
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
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refressToken", options)
    .json(new ApiResponse(200, {}, "user logged out succesfully"));
});



const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  //validation

  // checks if the body is empty 
  if (Object.keys(req.body).length === 0 || !req.body) {
    throw new ApiError(400, "body is empty....");
  }

  if (
    [fullName, email, username, password].some((fields) => fields?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  console.warn(req.files);
  // fetching file paths located in local server which are uploaded via multur in routes section 
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  //delete the uploaded files in local server in case of existed user
  //even if user exists file will be uploaded in local server
  // beacause it uploads the files way before checking the exixted user
  if (existedUser) {
    fs.unlink(avatarLocalPath, (err) => {
      if (err) {
        console.log(
          "error in deleting avatar in case of existing avatar" + err
        );
      }
    });
    fs.unlink(coverImageLocalPath, (err) => {
      if (err) {
        console.log(
          "error in deleting avatar in case of existing cover image" + err
        );
      }
    });
    throw new ApiError(409, "user with same username or email already exists");
  }

  if (!avatarLocalPath) {
    throw new ApiError(409, "avatar file does not exist");
  }

  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // let coverImage = "";
  // if (coverImageLocalPath) {
  //   coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // }


  // uploading avatar and cover image from local server 
  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log("uploaded avatar on cloudinary", avatar);
  } catch (error) {
    console.log("error in uploading avatar : " + error);
    throw new ApiError(500, "something went wrong during uploading avatar");
  }

  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("uploaded coverImage on cloudinary", coverImage);
  } catch (error) {
    console.log("error in uploading coverImage : " + error);
    throw new ApiError(500, "something went wrong during uploading coverImage");
  }

  try {
    const user = await User.create({
      fullName,
      avatar: avatar?.url,
      coverImage: coverImage?.url || "",
      username: username.toLowerCase(),
      email,
      password,
    });


    // extra fail safe
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "something went wrong during registering");
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "user registered succesfully"));
  } catch (error) {
    console.log("user creation failed , error : " + error);

    console.log(avatar);
    console.log(coverImage);

    // deleting the files from cloudinary in case of failed user creation 
    //the files will be uploaded in case other failure in registraion
    if (avatar) {
      console.log("deleted avatar from cloudinary");
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      console.log("deleted cover Image from cloudinary");
      await deleteFromCloudinary(coverImage.public_id);
    }

    throw new ApiError(
      500,
      "something went wrong during registering so deleted files from cloudinary"
    );
  }
});


const loginUser = asyncHandler(async (req, res) => {
  // get data from body
  const { username, email, password } = req.body;

  //validation
  if (!email || !username) {
    throw new ApiError("500", "email and username are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError("500", "user not found");
  }

  //validate password

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError("500", "incorrect password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedInUser) {
  }

  //The options are used when setting cookies
  const options = {
    //Ensures the cookie cannot be accessed or modified via JavaScript in the browser
    //cookie is accesible only to server
    httpOnly: true,
    //Ensures the cookie is only sent over HTTPS connections
    // production sets secure to true i'e HTTPS
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refressToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,

        { user: loggedInUser, accessToken, refreshToken },

        "user logged in succesfully"
      )
    );
});



const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required...");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token...");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token...");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refressToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "access token refreshed succesfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, "something went wrong during refreshing token...");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incorrect..");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password updated succesfully.."));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current User Dtails"));
});

const updateAcoountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(401, "full name and email is required");
  }

  const user = User.findByIdAndUpdate(
    req.user?.id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated succesfully"));
});

const chnageUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(401, "File is requied");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(401, "something went wrong while uploading avatar");
  }

  const user = User.findByIdAndUpdate(
    req.user?.id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated succesfully"));
});

const chnageUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(401, "File is requied");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(401, "something went wrong while uploading cover Image");
  }

  const user = User.findByIdAndUpdate(
    req.user?.id,
    {
      $set: {
        avatar: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover Image updated succesfully"));
});

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAcoountDetails,
  chnageUserAvatar,
  chnageUserCoverImage,
};