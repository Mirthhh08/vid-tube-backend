const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
            .catch((err) => next(err))
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