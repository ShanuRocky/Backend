import {asyncHandler2} from "../utils/assyncHandler.js"

export const registerUser = asyncHandler2( async (req, res) => {
    res.status(200).json({
        message: "ok"
    })
})

