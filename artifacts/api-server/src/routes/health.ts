import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

/**
 * Health check endpoint
 * GET /healthz
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({
    status: "ok"
  });

  return res.json(data);
});

export default router;
