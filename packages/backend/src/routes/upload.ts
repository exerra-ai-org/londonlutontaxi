import { Hono } from "hono";
import { join } from "path";
import { authMiddleware } from "../middleware/auth";
import { ok, err } from "../lib/response";

export const uploadRoutes = new Hono();

const UPLOAD_DIR = join(import.meta.dir, "../../uploads");
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

uploadRoutes.post("/profile-picture", authMiddleware, async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return err(c, "Expected multipart/form-data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return err(c, "Missing file field", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return err(c, "Only JPEG, PNG, WebP, and GIF images are allowed", 400);
  }

  if (file.size > MAX_SIZE_BYTES) {
    return err(c, "File must be under 5 MB", 400);
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dest = join(UPLOAD_DIR, filename);

  await Bun.write(dest, file);

  const baseUrl = (
    process.env.APP_BASE_URL_BACKEND || "http://localhost:3000"
  ).replace(/\/$/, "");
  return ok(c, { url: `${baseUrl}/uploads/${filename}` });
});
