import { Router } from "express";
import { healthcheck } from "../controllers/healthcheck.controllers.js";

const router = Router();

router.route("/").get(healthcheck)

//example
// router.route("/test").get(healthcheck)
// /api/v1/healthcheck/test


export default router


//this is created just to test the process if it is running correctly all the time