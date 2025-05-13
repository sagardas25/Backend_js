//Provide a consistent error structure including status codes, messages, error arrays, and stack traces.
class ApiError extends Error {
  constructor(
    statusCode,
    message = "something went wrong",
    stack = "",
    errors = []
  ) {
    super(message),
      (this.statusCode = statusCode),
      (this.data = null),
      (this.message = message),
      (this.success = false),
      (this.errors = errors);

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export { ApiError };
