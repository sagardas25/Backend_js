import { ApiError } from "../utills/ApiError.js";
import { ApiResponse } from "../utills/ApiResponses.js";
import { asyncHandler } from "../utills/asyncHnadler.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utills/cloudinary.js";
import fs from "fs";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError("500", "something went wrong during token generation");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  //validation
  if (Object.keys(req.body).length === 0 || !req.body) {
    throw new ApiError(400, "body is empty....");
  }

  if (
    [fullName, email, username, password].some((fields) => fields?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  console.warn(req.files);
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

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

  let avatar;

  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log("uploaded avatar on cloudinary", avatar);
  } catch (error) {
    console.log("erro in uploading avatar : " + error);
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
      username: usename.toLowerCase(),
      email,
      password,
    });

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

  const options = {
    httpOnly: true,
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

export { registerUser , loginUser };
