import { ApiError } from "../utils/ApiError.js"
import { asyncHandler2 } from "../utils/assyncHandler.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler2(async (req, res, next) =>
{
    const token = req?.cookies?.accessToken || req.header("Authorization").replace("Bearer ", "")
    if(!token) throw new ApiError(401,"unothorized request")
    const decodedInformation = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decodedInformation?._id).select("-password -refreshToken")

    if(!user) throw new ApiError(401, "Invalid Access Token")
        req.user = user
    next()
})