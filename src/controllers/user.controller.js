import { asyncHandler2 } from "../utils/assyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import fs from "fs"
import jwt from "jsonwebtoken"


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


export const refreshAccessToken = asyncHandler2(async (req,res) =>
{
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incommingRefreshToken) new ApiError(401,"unothorized request")
    const decodedToken = await jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken._id)
    if(!user) throw new ApiError(401,"Invalid refresh token")
    if(incommingRefreshToken !== user?.refreshToken) throw new ApiError(401,"Invalid refresh token")
    const options = {
       httpOnly: true,
       secure: true
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    return res.json(200).
               cookie("accessToken",accessToken,options).
               cookie("refreshToken",refreshToken,options).
               json(
                new ApiResponse(200,{accessToken, refreshToken},"Access Token refreshed succesfully")
               )
})


export const changeUserPassword = asyncHandler2(async (req,res) => {
     const {oldPassword, newPassword} = req.body
     const user = User.findById(req.user?._id)
     if(!user) throw new ApiError(404,"User not found")
     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
     if(!isPasswordCorrect) throw new ApiError(401,"Password incorrect")
     user.password = newPassword
     await user.save({validateBeforeSave:false})
     return res.status(200).
                json(new ApiResponse(200,{},"Password changed succesfully"))

})


export const getCurrentUser = asyncHandler2(async (req,res) => {
    return res.status(200).
               json(new ApiResponse(200,req.user,"User fetched succesfully"))
})

export const updateAccountDetails = asyncHandler2(async (req,res) => {
    const {fullName, username, email} = req.body
    if(!fullName || !username || !email) throw new ApiError(400,"All fields are required")
    const user = User.findByIdAndUpdate(
                 req.user._id,
                 {
                    $set: {
                       fullName,
                       email,
                       username
                    }
                 },
                 {new:true}).select("-password -refreshToken")
    return res.status(200).
               json(new ApiResponse(200,user,"Account details updated succesfully"))
})

