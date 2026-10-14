import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo, getAllVideos, getOwnerVideoById, getVideoById, togglePublishStatus, updateVideoDetails, uploadVideo } from "../controllers/video.controller.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import multer from "multer";
import { updateAccountDetails } from "../controllers/user.controller.js";


const router = Router();

router.route("/upload-video").post(
  verifyjwt,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1
    },
    {
      name: "videoFile",
      maxCount:1
    }
  ]),
  uploadVideo
);

router.route("/:videoId/toggle/publish").patch(verifyjwt,togglePublishStatus);
router.route("/").get(verifyjwt,getAllVideos);
router.route("/:videoId").get(getVideoById);
router.route("/:videoId/owner").get(verifyjwt,getOwnerVideoById);
router.route("/:videoId/update-details").patch(
  verifyjwt,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1
    },
    {
      name: "videoFile",
      maxCount: 1
    }
  ]),
  updateVideoDetails
)
router.route("/:videoId/delete").delete(verifyjwt,deleteVideo);

export default router;