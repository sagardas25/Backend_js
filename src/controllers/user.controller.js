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
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";

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

//It is the logout controller
// It sets the refresh token undefined so user can't say logged in
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

// it is controller so that refresh token can be refreshed after the defined interval for security purpose
const refreshAccessToken = asyncHandler(async (req, res) => {
  // existing refresh token comes from the body or the cookie
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required...");
  }

  try {
    // decoding the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // fetching user by the token
    const user = await User.findById(decodedToken?._id);

    // user validation
    if (!user) {
      throw new ApiError(401, "Invalid refresh token...");
    }

    // validating if the decoded token matches with the refresh token of user
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token...");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    // generating  acces token and new refresh token
    // renaming refresh token as newRefreshToken in local scope
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

// below these are the curd operations provided to user
const changeCurrentPassword = asyncHandler(async (req, res) => {
  //Destructures the old and new passwords from the request body
  //(i.e., the input sent by the client, usually from a password change form).
  const { oldPassword, newPassword } = req.body;
  // getting user
  const user = await User.findById(req.user?._id);

  //validating password
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incorrect..");
  }

  // setting password as the new password given by the user
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
  // giving options to change full Name and email
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(401, "full name and email is required");
  }

  // this is an mongoose query for updating data fields
  const user = await User.findByIdAndUpdate(
    req.user?.id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken"); // Fetch all fields except password and refreshToken due to security reasons

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated succesfully"));
});

const changeUserAvatar = asyncHandler(async (req, res) => {
  // getting the avatar uploaded by the user
  const avatarLocalPath = req.file?.path;

  //validating the path
  if (!avatarLocalPath) {
    throw new ApiError(401, "File is requied");
  }

  //uploading it to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(401, "something went wrong while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?.id,
    {
      $set: {
        //the key is part of DB (user schema) which takes a string as defined
        avatar: avatar.url,
      },
    },
    { new: true } //ensures the updated user object is returned
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated succesfully"));
});

const changeUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(401, "File is requied");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(401, "something went wrong while uploading cover Image");
  }

  const user = await User.findByIdAndUpdate(
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

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(401, "username is required...");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },

    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "subcriber",
        as: "subscribedTo",
      },
    },

    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        subscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber "] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        subscriberCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log("channel data : " + channel);

  if (!channel?.length) {
    throw new ApiError(401, "Channel not found...");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "channel Profile created Succesfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "Video",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
      },
    },

    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0]?.watchHistory, "channel Profile created Succesfully")
  );


});

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAcoountDetails,
  changeUserAvatar,
  changeUserCoverImage,
  getWatchHistory,
  getUserChannelProfile
};
