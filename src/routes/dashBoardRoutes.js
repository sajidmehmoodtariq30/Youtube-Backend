import { Router } from 'express';
import {
    getChannelStats,
    getChannelVideos,
} from "../controllers/dashBoardController.js"
import {verifyJWT} from "../middleware/authMiddleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;