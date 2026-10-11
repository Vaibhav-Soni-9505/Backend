import { Router } from "express";
import { changePassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1
    },
    {
      name: "coverImage",
      maxCount: 1
    }
  ]),
  registerUser
)

router.route("/login").post(loginUser);

//secured Routes
router.route("/logout").post(verifyjwt,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyjwt,changePassword);
router.route("/current-user").get(verifyjwt,getCurrentUser);
router.route("/update-account-details").patch(verifyjwt,updateAccountDetails);
router.route("/update-avatar").patch(verifyjwt,upload.single("avatar"),updateUserAvatar);
router.route("/update-coverImage").patch(verifyjwt,upload.single("coverImage"),updateUserCoverImage)
router.route("/channel/:username").get(verifyjwt,getUserChannelProfile);
router.route("/watch-History").get(verifyjwt,getWatchHistory);
export default router