import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { join } from "path";
import { config } from "./config";
import { authRoutes } from "./routes/auth";
import { pricingRoutes } from "./routes/pricing";
import { bookingRoutes } from "./routes/bookings";
import { driverRoutes } from "./routes/drivers";
import { couponRoutes } from "./routes/coupons";
import { reviewRoutes } from "./routes/reviews";
import { zoneRoutes } from "./routes/zones";
import { fixedRouteRoutes } from "./routes/fixedRoutes";
import { notificationRoutes } from "./routes/notifications";
import { vehicleRoutes } from "./routes/vehicles";
import { adminRoutes } from "./routes/admin";
import { uploadRoutes } from "./routes/upload";
import { eventsRoutes } from "./routes/events";
import { startBackgroundJobs } from "./services/jobs";
import { resolveSafeUploadPath } from "./lib/safeUploadPath";

const app = new Hono();

app.use("*", logger());

app.use(
  "/*",
  cors({
    origin: config.cors.origins,
    credentials: true,
  }),
);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.route("/auth", authRoutes);
app.route("/pricing", pricingRoutes);
app.route("/bookings", bookingRoutes);
app.route("/drivers", driverRoutes);
app.route("/coupons", couponRoutes);
app.route("/reviews", reviewRoutes);
app.route("/zones", zoneRoutes);
app.route("/fixed-routes", fixedRouteRoutes);
app.route("/notifications", notificationRoutes);
app.route("/vehicles", vehicleRoutes);
app.route("/admin", adminRoutes);
app.route("/upload", uploadRoutes);
app.route("/events", eventsRoutes);

// Serve uploaded files
const UPLOAD_DIR = join(import.meta.dir, "../uploads");

app.get("/uploads/:filename", async (c) => {
  const safePath = resolveSafeUploadPath(UPLOAD_DIR, c.req.param("filename"));
  if (!safePath) {
    return c.text("Not found", 404);
  }

  const file = Bun.file(safePath);
  if (!(await file.exists())) {
    return c.text("Not found", 404);
  }

  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

startBackgroundJobs();

// Startup diagnostics — make missing config visible immediately
console.log(
  "[Config] Email:",
  config.email.resendApiKey
    ? "Resend ✓"
    : "NOT CONFIGURED (set RESEND_API_KEY)",
);
console.log(
  "[Config] Push:",
  config.push.publicKey ? "VAPID ✓" : "NOT CONFIGURED (set VAPID keys)",
);
console.log("[Config] CORS origins:", config.cors.origins.join(", "));

export default {
  port: config.server.port,
  fetch: app.fetch,
};
