import { Router } from "express";
import { registerUser,loginUser,logoutUser } from "../controllers/userController.js";
import {upload} from "../middleware/multerMiddleware.js";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = Router();
router.route("/register").post(
    upload.fields([
        {name: 'avatar', maxCount: 1},
        {name: 'cover', maxCount: 1}
    ]),
    registerUser
)

router.route("/login").post(loginUser);

// secured Routes
router.route("/logout").post(verifyJWT,logoutUser);

export default router;