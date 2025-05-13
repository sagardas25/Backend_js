import { Router } from "express";
import { logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

//multur middleware : upload.fields(...) is used to handle the  files. 
//it uploads the files correctly and made the files available in req.body or req.files in the controller
// after that controller performs the business logics
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

//secured route
router.route("/logout").post(verifyJwt, logoutUser);

export default router;
