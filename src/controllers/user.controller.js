import {asyncHandler2} from "../utils/assyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import fs from "fs";

export const registerUser = asyncHandler2( async (req, res) => {
    // get user details 
    const { fullName, email, username, password } = req.body

    // validation
    if([fullName, email, username, password].some((field) => 
    {
        field?.trim() === ""
    }))
    {
        throw new ApiError(400, "All fields are required");  
    }

    //user already exists or not..
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser) throw new ApiError(409, "user already exists")

    //handle images
    const avatarLocalPath = Array.isArray(req.files?.avatar) ? req.files?.avatar[0]?.path : "";
    const coverImageLocalPath = Array.isArray(req.files?.coverImage) ? req.files?.coverImage[0]?.path : "";
    if(!avatarLocalPath) 
    {
        await fs.unlinkSync(coverImageLocalPath) // remove the locally saved temporary file as the upload operation got failed
        throw new ApiError(409, "avatar required")
    }

    //upload on clodinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = (coverImageLocalPath) ? await uploadOnCloudinary(coverImageLocalPath) : ""

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) throw new ApiError(500, "error in registering user")
    
    //send response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered succesfully")
    )

})

