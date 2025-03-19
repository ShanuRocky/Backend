const asyncHandler1 = (requestHandler) => async (req, res, next) => {
     try {
        await requestHandler(req, res, next)
     } catch (error) {
        res.status(error.code || 400).json({
            success: false,
            message: error.message
        })
     }
}

const asyncHandler2 = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) =>  next(err))
    }
}

export {asyncHandler1, asyncHandler2}
