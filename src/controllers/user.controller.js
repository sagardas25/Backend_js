import { ApiError } from "../utills/ApiError.js";
import { ApiResponse } from "../utills/ApiResponses.js";
import { asyncHandler } from "../utills/asyncHnadler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utills/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  //validation

  if (
    [fullName, email, username, password].some((fields) => fields?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with same username or email already exists");
  }

  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  const avatarLocalPath = req.files?.avatar[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(409, "avatar file does not exist");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  let coverImage = "";

  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    ApiError(500, "something went wrong during registering");
  }

  return res
     .status(201)
     .json(new ApiResponse(200, createdUser , "user registered succesfully"))



});

export { registerUser };
