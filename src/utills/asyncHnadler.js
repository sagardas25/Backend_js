const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      next(err);
    });
  };
};

export {asyncHandler}


//asyncHandler is a utility that ensures any asynchronous operations  in your route handler are properly wrapped and 
//errors are automatically passed to next error handler
//without wrapping the operaions in try catch block again and again.