const asyncHandler = (requestHandler) => {
    return  async (req, res, next) => {
        try {
            await Promise.resolve(requestHandler(req, res, next))
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message || "Internal Server Error"
            })
        }

    }
}


// const asyncHandler = (fn) => async (req , res , next) => {
//     try {

//     } catch (error) {
//         res.status(req.status || 500).json({
//             error : error

//         })
//     }
//  }

export default asyncHandler