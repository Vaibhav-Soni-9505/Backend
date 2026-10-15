import mongoose,{Schema} from "mongoose";

const videoViewSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true
    },

    viewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {timestamps: true}
);

videoViewSchema.index(
  { video: 1, viewer: 1 },
  { unique: true }
);

export const VideoView = mongoose.model("VideoView",videoViewSchema);