import { verifyjwt } from "../middlewares/auth.middleware.js"
import {Router} from "express"
import { createComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js"

const router = Router()

router.route("/:videoId/comments").post(verifyjwt,createComment);
router.route("/:videoId").get(getVideoComments);
router.route("/:commentId").post(verifyjwt,updateComment);
router.route("/:commentId").delete(verifyjwt,deleteComment);


export default router