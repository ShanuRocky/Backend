import { Router } from "express";
import { registerUser, 
    loginUser, 
    logoutUser , 
    refreshAccessToken , 
    changeUserPassword,
    updateAccountDetails,
    getCurrentUser,
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const userRouter = Router()

userRouter.route("/register").post(
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

userRouter.route("/login").post(loginUser)
userRouter.route("/refresh-token").post(refreshAccessToken)

//protected routes

userRouter.route("/logout").post(verifyJWT, logoutUser)
userRouter.route("/change-Password").patch(verifyJWT, changeUserPassword)
userRouter.route("/profile").get(verifyJWT, getCurrentUser)
userRouter.route("/update-account-details").patch(verifyJWT, updateAccountDetails)


export default userRouter