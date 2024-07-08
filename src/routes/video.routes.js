import Router from "express"
import { upload } from "../middleware/multer.middleware.js"
import { verifyJWT } from "../middleware/auth.middleware.js"
import { deleteVideo, getVideoById, togglePublishStatus, updateVideo, uploadVideo } from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT)

router.route("/upload").post(

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

router.route("/watch/:videoId").get(getVideoById)

router.route("/update/:videoId").patch(upload.single("thumbnail"), updateVideo)

router.route("/delete/:videoId").delete(deleteVideo)

router.route("/toggle/publish/:videoId").patch(togglePublishStatus)

export default router