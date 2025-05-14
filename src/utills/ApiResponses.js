//This class helps ensure that every successful HTTP response from your Express API follows a consistent format
class ApiResponse {
  constructor(statusCode, data, message = "success") {
    (this.statusCode = statusCode),
      (this.data = data),
      (this.message = message),
      (this.success = statusCode < 400);
  }
}

export { ApiResponse };
