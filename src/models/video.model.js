import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudinary url
      required: [true, "Video File is required"],
    },

    thumbnail: {
      type: String, // cloudinary url
      required: [true, "thumbnail is required"],
    },
    title: {
      type: String,
      required: [true, "title is required"],
    },
    description: {
      type: String,
      required: [true, "description is required"],
    },
    views: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      required: ture,
    },
    isPublished: {
      type: Boolean,
      required: ture,
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


videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema);
