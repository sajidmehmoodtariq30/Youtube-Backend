// Using Promise
const asyncHandler = (requestHandler) => async (req, res, next) => {
    return Promise.resolve(requestHandler(req, res, next)).catch((err) =>
        next(err)
    );
};

export default asyncHandler;

// Using try catch block
/*
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(error.code || 500).json({
            message: error.message || "Something went wrong",
        });
    }
};
*/
