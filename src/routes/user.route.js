import { Router } from "express";
import  {logOutUser, loginUser,  registerUser,refreshAccessToken}  from "../controllers/user.controller.js";
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

export default router