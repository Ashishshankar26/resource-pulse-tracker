import { Router } from "express";
import { getAllReadings } from "../services/reading-store.js";
import { buildAnalytics } from "../utils/analytics.js";
import { demoAuth } from "../middleware/demo-auth.js";

const router = Router();

router.use(demoAuth);

router.get("/summary", async (_req, res, next) => {
  try {
    const readings = await getAllReadings();
    const analytics = buildAnalytics(readings);
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

export default router;
