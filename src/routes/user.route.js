import { Router } from "express";
import  {logOutUser, 
        loginUser,
        registerUser,
        refreshAccessToken,
        chnageCurrentUserPassword,
        getCurrentUser, 
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchHistory}  from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([{
        name:"avatar",
    },
    {
        name: "coverImage",
    }]),
    registerUser)

    // router.route('/your-endpoint').post(endpoint)

router.route("/login").post(loginUser)


//secured Routes
router.route("/logout").post(verifyJWT ,logOutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT,chnageCurrentUserPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-details").patch(verifyJWT,updateAccountDetails)

router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/update-coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

route.route("/history").get(verifyJWT,getWatchHistory)

export default router