import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, "username is required"],
    trim: true,
    index: true,
    lowercase: true,
    unique: true,
  },
  email: {
    type: String,
    required: [true, "email is required"],
    trim: true,
    lowercase: true,
    unique: true,
  },
  fullName: {
    type: String,
    required: [true, "full name is required"],
    trim: true,
    index: true,
  },
  avatar: {
    type: String,
    required: [true, "avatar is required"],
  },
  coverImage: {
    type: String,
  },

  password: {
    type: String,
    required: [true, "password is required"],
  },

  watchHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
  ],
},

{

  timestamps : true 


}


);

export const User = mongoose.models("User", userSchema);
