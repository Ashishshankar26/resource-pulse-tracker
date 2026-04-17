import { Router } from "express";
import { body, validationResult } from "express-validator";
import {
  addReading,
  deleteReading,
  getAllReadings,
  seedDemoReadings,
  updateReading
} from "../services/reading-store.js";
import { demoAuth } from "../middleware/demo-auth.js";

const router = Router();

router.use(demoAuth);

router.get("/", async (_req, res, next) => {
  try {
    const readings = await getAllReadings();
    res.json({
      success: true,
      data: readings
    });
  } catch (error) {
    next(error);
  }
});

router.post("/seed-demo", async (req, res, next) => {
  try {
    const replaceExisting = req.query.replace === "true";
    const result = await seedDemoReadings({ replaceExisting });

    req.app.get("io")?.emit("reading:seeded", result);

    res.status(result.skipped ? 200 : 201).json({
      success: true,
      message: result.skipped
        ? "Demo readings skipped because data already exists"
        : "Demo readings added successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("resourceType").isIn(["water", "electricity"]),
    body("amount").isFloat({ gt: 0 }),
    body("cost").isFloat({ min: 0 }),
    body("unit").trim().notEmpty(),
    body("location").trim().notEmpty(),
    body("recordedAt").isISO8601(),
    body("notes").optional().trim().isLength({ max: 120 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const reading = await addReading(req.body);
      req.app.get("io")?.emit("reading:created", reading);

      res.status(201).json({
        success: true,
        message: "Reading saved successfully",
        data: reading
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  [
    body("resourceType").isIn(["water", "electricity"]),
    body("amount").isFloat({ gt: 0 }),
    body("cost").isFloat({ min: 0 }),
    body("unit").trim().notEmpty(),
    body("location").trim().notEmpty(),
    body("recordedAt").isISO8601(),
    body("notes").optional().trim().isLength({ max: 120 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const reading = await updateReading(req.params.id, req.body);

      if (!reading) {
        return res.status(404).json({
          success: false,
          message: "Reading not found"
        });
      }

      req.app.get("io")?.emit("reading:updated", reading);

      res.json({
        success: true,
        message: "Reading updated successfully",
        data: reading
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await deleteReading(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Reading not found"
      });
    }

    req.app.get("io")?.emit("reading:deleted", { id: req.params.id });

    res.json({
      success: true,
      message: "Reading deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

export default router;
