class ApiError extends Error{
  constructor(message="Something went wrong", statusCode, errors=[]) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors,
    this.data = null,
    this.success = false
  }
}

export {ApiError};