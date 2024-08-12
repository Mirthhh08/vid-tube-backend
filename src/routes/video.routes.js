import Router from "express"
import { upload } from "../middleware/multer.middleware.js"
import { verifyJWT } from "../middleware/auth.middleware.js"
import { deleteVideo, getAllVideos, getVideoById, togglePublishStatus, updateVideo, uploadVideo } from "../controllers/video.controller.js";

const router = Router();

// router.use()

router.route("/").get(getAllVideos)

router.route("/upload").post(
    verifyJWT,
    upload.fields(
        [
            {
                name: "video",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]
    ),
    uploadVideo
)

router.route("/watch/:videoId").get(verifyJWT, getVideoById)

router.route("/update/:videoId").patch(verifyJWT, upload.single("thumbnail"), updateVideo)

router.route("/delete/:videoId").delete(verifyJWT, deleteVideo)

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus)

export default router