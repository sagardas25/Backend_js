import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {

    subscriber: {
      type: Schema.type.ObjectId,  //channels I am subscribed to
      ref: "User",
    },
    channel: {
      type: Schema.type.ObjectId,  // channels who has subscribed me 
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
