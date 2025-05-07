import { ApiResponse } from "../utills/ApiResponses.js";
import { ApiError } from "../utills/ApiError.js";
import { asyncHandler } from "../utills/asyncHnadler.js";

const healthcheck = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, "OK", "healthcheck passes"));
});

export { healthcheck };
