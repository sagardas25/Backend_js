import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAcoountDetails,
  changeUserAvatar,
  changeUserCoverImage,
  getWatchHistory,
  getUserChannelProfile
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

//multur middleware : upload.fields(...) is used to handle the  files.
//it uploads the files correctly and made the files available in req.body or req.files in the controller
// after that controller performs the business logics

//unsecured routes
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),

  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

//secured route
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/update-account").patch(verifyJwt, updateAcoountDetails);
router.route("/ch/:username").get(verifyJwt, getUserChannelProfile);
router.route("/avatar").patch(verifyJwt,upload.single("avatar") ,changeUserAvatar);
router.route("/cover-image").patch(verifyJwt,upload.single("coverImage") ,changeUserCoverImage);
router.route("/history").get(verifyJwt, getWatchHistory);


export default router;
