import { asyncHandler2 } from "../utils/assyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import fs from "fs";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "something wrong while generating token")
    }
}

export const registerUser = asyncHandler2(async (req, res) => {
    // get user details 
    const { fullName, email, username, password } = req.body

    //handle images
    const avatarLocalPath = Array.isArray(req.files?.avatar) ? req.files?.avatar[0]?.path : "";
    const coverImageLocalPath = Array.isArray(req.files?.coverImage) ? req.files?.coverImage[0]?.path : "";
    if (!avatarLocalPath) {
        if(coverImageLocalPath) await fs.unlinkSync(coverImageLocalPath) // remove the locally saved temporary file as the upload operation got failed
        throw new ApiError(409, "avatar required")
    }

    // validation
    if ([fullName, email, username, password].some((field) => {
        field?.trim() === ""
    })) {
        if(coverImageLocalPath) await fs.unlinkSync(coverImageLocalPath) // remove the locally saved temporary file as the upload operation got failed
        if(avatarLocalPath) await fs.unlinkSync(avatarLocalPath) // remove the locally saved temporary file as the upload operation got failed
        throw new ApiError(400, "All fields are required");
    }

    
    //user already exists or not..
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) 
    {
        if(coverImageLocalPath) await fs.unlinkSync(coverImageLocalPath) // remove the locally saved temporary file as the upload operation got failed
        if(avatarLocalPath) await fs.unlinkSync(avatarLocalPath) // remove the locally saved temporary file as the upload operation got failed
        throw new ApiError(409, "user already exists")
    }

    //upload on clodinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = (coverImageLocalPath) ? await uploadOnCloudinary(coverImageLocalPath) : ""

    const user = await User.create({
        fullName,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) throw new ApiError(500, "error in registering user")

    //send response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered succesfully")
    )

})

export const loginUser = asyncHandler2( async (req, res) => {
    //recieve username/email and password and cookies
    //if access token validate it and send response else  
    //check if userername exist 
    //check the password is correct or not
    //create access and refresh token 
    //send cookies

    const {email, username, password} = req.body
    if (!username || !email) throw new ApiError(400, "username or email missing")
    if (!password) throw new ApiError(400, "password missing")
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!existedUser) throw ApiError(404, "user does not exist")
    const isPasswordCorrect = await existedUser.isPasswordCorrect(password)
    if (!isPasswordCorrect) throw ApiError(401, "password incorrect")
    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(existedUser._id)
    const loggedInUser = await User.findById(existedUser._id).select(
        "-password -refreshToken"
    )
    // console.log(accessToken, "  vhvh  ", refreshToken)
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).
        cookie("accessToken", accessToken, options).
        cookie("refreshToken", refreshToken, options).
        json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "user logged in succesfully"
            )
        )

})

export const logoutUser = asyncHandler2(async (req, res) => {
    const userId = req.user._id
    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).
        clearCookie("accessToken", options).
        clearCookie("refreshToken", options).
        json(
            new ApiResponse(200, {}, "user logged out")
        )
})

