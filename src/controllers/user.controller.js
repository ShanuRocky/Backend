import {asyncHandler2} from "../utils/assyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

export const registerUser = asyncHandler2( async (req, res) => {
    // get user details 
    const { fullName, email, userName, password } = req.body

    // validation
    if([fullName, email, userName, password].some((field) => 
    {
        field?.trim() === ""
    }))
    {
        throw new ApiError(400, "All fields are required");  
    }

    //user already exists or not..
    const existedUser = User.findOne({
        $or: [{userName}, {email}]
    })
    if(existedUser) throw new ApiError(409, "user already exists")

    //handle images
    const avatarLocalPath = req.files?.avatar[0]?.path ;
    const coverImageLocalPath = req.files?.coverImage[0]?.path ;
    if(!avatarLocalPath) throw new ApiError(409, "avatar required")

    //upload on clodinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(409, "avatar required")

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshTocken "
    )

    if(!createdUser) throw new ApiError(500, "error in registering user")
    
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered succesfully")
    )

})

