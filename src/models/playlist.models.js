import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
    },

    description: {
      type: String,
      required: [true, "description is required"],
    },

    videos: {
      type: Schema.type.ObjectId,
      ref: "Video",
    },

    owner: {
      type: Schema.type.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const PLaylist = mongoose.model("PLaylist", playlistSchema);
