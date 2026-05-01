import { Hono } from "hono";
import { and, eq, gte, inArray, sql, avg, count } from "drizzle-orm";
import {
  inviteUserSchema,
  driverProfileSchema,
  updateUserSchema,
} from "shared/validation";
import type { LiveDriver } from "shared/types";
import { db } from "../db/index";
import {
  users,
  driverProfiles,
  driverPresence,
  driverAssignments,
  bookings,
  reviews,
} from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import { ok, err } from "../lib/response";
import { generateAuthToken } from "../lib/tokens";
import { sendInvitationEmail } from "../services/email";

// A driver counts as "live" if presence was pinged within this window.
const LIVE_WINDOW_MS = 2 * 60 * 1000;

export const adminRoutes = new Hono();

adminRoutes.use("*", authMiddleware, requireRole("admin"));

// Invite a new driver or admin
adminRoutes.post("/invite", async (c) => {
  const body = await c.req.json();
  const parsed = inviteUserSchema.safeParse(body);
  if (!parsed.success)
    return err(c, "Invalid input", 400, parsed.error.flatten());

  const { email, name, role } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0)
    return err(c, "An account with this email already exists", 409);

  const { raw, hash } = generateAuthToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const [user] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      name,
      role,
      invitationToken: hash,
      invitationTokenExpiresAt: expiresAt,
    })
    .returning();

  await sendInvitationEmail(normalizedEmail, raw, name, role);

  return ok(c, {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// Get full driver profile (admin)
adminRoutes.get("/drivers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return err(c, "Invalid ID", 400);

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      profilePictureUrl: users.profilePictureUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) return err(c, "Driver not found", 404);

  const [profile] = await db
    .select()
    .from(driverProfiles)
    .where(eq(driverProfiles.driverId, id));

  const [ratings] = await db
    .select({ avg: avg(reviews.rating), total: count(reviews.id) })
    .from(reviews)
    .where(eq(reviews.driverId, id));

  return ok(c, {
    driver: {
      ...user,
      profile: profile ?? null,
      avgRating: ratings.avg ? Number(Number(ratings.avg).toFixed(1)) : null,
      totalReviews: ratings.total,
    },
  });
});

// Update any user's name/phone (admin)
adminRoutes.patch("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return err(c, "Invalid ID", 400);

  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success)
    return err(c, "Invalid input", 400, parsed.error.flatten());

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.phone !== undefined)
    updates.phone = parsed.data.phone?.trim() || null;

  if (Object.keys(updates).length === 0)
    return err(c, "Nothing to update", 400);

  const [user] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();
  if (!user) return err(c, "User not found", 404);

  return ok(c, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
    },
  });
});

// Update driver vehicle/profile (admin)
adminRoutes.put("/drivers/:id/profile", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return err(c, "Invalid ID", 400);

  const body = await c.req.json();
  const parsed = driverProfileSchema.safeParse(body);
  if (!parsed.success)
    return err(c, "Invalid input", 400, parsed.error.flatten());

  const { profilePictureUrl, ...profileFields } = parsed.data;

  if (profilePictureUrl !== undefined) {
    await db.update(users).set({ profilePictureUrl }).where(eq(users.id, id));
  }

  await db
    .insert(driverProfiles)
    .values({ driverId: id, ...profileFields })
    .onConflictDoUpdate({
      target: driverProfiles.driverId,
      set: profileFields,
    });

  const [profile] = await db
    .select()
    .from(driverProfiles)
    .where(eq(driverProfiles.driverId, id));
  return ok(c, { profile });
});

// Live drivers feed for the admin map. Returns drivers whose presence
// was pinged inside LIVE_WINDOW_MS, with their latest coords plus an
// active booking summary if they're currently on a ride.
adminRoutes.get("/drivers/live", async (c) => {
  const cutoff = new Date(Date.now() - LIVE_WINDOW_MS);

  const liveRows = await db
    .select({
      driverId: driverPresence.driverId,
      isOnDuty: driverPresence.isOnDuty,
      lastSeenAt: driverPresence.lastSeenAt,
      lat: driverPresence.lastLat,
      lon: driverPresence.lastLon,
      name: users.name,
      phone: users.phone,
    })
    .from(driverPresence)
    .innerJoin(users, eq(driverPresence.driverId, users.id))
    .where(
      and(
        eq(driverPresence.isOnDuty, true),
        gte(driverPresence.lastSeenAt, cutoff),
      ),
    );

  if (liveRows.length === 0) return ok(c, { drivers: [] as LiveDriver[] });

  const driverIds = liveRows.map((r) => r.driverId);

  const profiles = await db
    .select()
    .from(driverProfiles)
    .where(inArray(driverProfiles.driverId, driverIds));
  const profileById = new Map(profiles.map((p) => [p.driverId, p]));

  // Find each driver's currently-active booking, if any. A driver should
  // only have one active assignment at a time, but if multiple ever leak
  // through we pick the most "in-progress" one via status priority.
  const ACTIVE_STATUSES = [
    "assigned",
    "en_route",
    "arrived",
    "in_progress",
  ] as const;
  const activeAssignments = await db
    .select({
      driverId: driverAssignments.driverId,
      bookingId: bookings.id,
      status: bookings.status,
      pickupAddress: bookings.pickupAddress,
      dropoffAddress: bookings.dropoffAddress,
      pickupLat: bookings.pickupLat,
      pickupLon: bookings.pickupLon,
      dropoffLat: bookings.dropoffLat,
      dropoffLon: bookings.dropoffLon,
      customerName: users.name,
      scheduledAt: bookings.scheduledAt,
    })
    .from(driverAssignments)
    .innerJoin(bookings, eq(driverAssignments.bookingId, bookings.id))
    .innerJoin(users, eq(bookings.customerId, users.id))
    .where(
      and(
        inArray(driverAssignments.driverId, driverIds),
        eq(driverAssignments.isActive, true),
        inArray(bookings.status, [...ACTIVE_STATUSES]),
      ),
    );

  const STATUS_PRIORITY: Record<string, number> = {
    in_progress: 4,
    arrived: 3,
    en_route: 2,
    assigned: 1,
  };
  const activeByDriver = new Map<number, (typeof activeAssignments)[number]>();
  for (const row of activeAssignments) {
    const existing = activeByDriver.get(row.driverId);
    if (
      !existing ||
      (STATUS_PRIORITY[row.status] ?? 0) >
        (STATUS_PRIORITY[existing.status] ?? 0)
    ) {
      activeByDriver.set(row.driverId, row);
    }
  }

  const drivers: LiveDriver[] = liveRows
    .filter((r) => r.lat != null && r.lon != null && r.lastSeenAt != null)
    .map((r) => {
      const active = activeByDriver.get(r.driverId);
      const profile = profileById.get(r.driverId) ?? null;
      return {
        driverId: r.driverId,
        name: r.name,
        phone: r.phone,
        vehicle: profile,
        lat: r.lat as number,
        lon: r.lon as number,
        lastSeenAt: (r.lastSeenAt as Date).toISOString(),
        isOnDuty: r.isOnDuty,
        activeBooking: active
          ? {
              id: active.bookingId,
              status: active.status,
              pickupAddress: active.pickupAddress,
              dropoffAddress: active.dropoffAddress,
              pickupLat: active.pickupLat,
              pickupLon: active.pickupLon,
              dropoffLat: active.dropoffLat,
              dropoffLon: active.dropoffLon,
              customerName: active.customerName,
              scheduledAt: active.scheduledAt.toISOString(),
            }
          : null,
      };
    });

  return ok(c, { drivers });
});
