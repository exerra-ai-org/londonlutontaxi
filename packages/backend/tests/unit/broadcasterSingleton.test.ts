import { test, expect, describe, beforeAll } from "bun:test";

// Set env BEFORE importing config-dependent modules.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/taxi";
process.env.JWT_SECRET ??= "x".repeat(40);

describe("broadcaster — hot-reload safety", () => {
  test("subscribe/unsubscribe round-trip is observable through broadcastBookingEvent", async () => {
    const { subscribe, broadcastBookingEvent } =
      await import("../../src/services/broadcaster");

    const received: unknown[] = [];
    const unsub = subscribe(7, "customer", (e) => received.push(e));

    broadcastBookingEvent([7], {
      type: "booking_updated",
      bookingId: 1,
      status: "assigned",
    });

    expect(received).toHaveLength(1);
    expect((received[0] as { bookingId: number }).bookingId).toBe(1);

    unsub();
    broadcastBookingEvent([7], {
      type: "booking_updated",
      bookingId: 2,
      status: "assigned",
    });
    expect(received).toHaveLength(1); // still one — unsub worked
  });

  test("the connections Map is pinned to globalThis under non-production NODE_ENV", async () => {
    // In dev mode, re-importing the module should reuse the same registry
    // so SSE subscribers established before a hot-reload survive it.
    const mod = await import("../../src/services/broadcaster");
    const globalKey = (globalThis as Record<string, unknown>)
      .__broadcasterConnections;

    // The connections Map MUST exist on globalThis when not in production.
    expect(globalKey).toBeDefined();

    // And subscribing through the module must mutate that same Map.
    const sizeBefore = (globalKey as Map<unknown, unknown>).size;
    const unsub = mod.subscribe(9999, "customer", () => {});
    expect((globalKey as Map<unknown, unknown>).size).toBeGreaterThan(
      sizeBefore,
    );
    unsub();
  });
});

describe("broadcaster — event types added by realtime audit", () => {
  // Each new event type must round-trip through the broadcaster end to
  // end. Admins always observe every broadcast (fan-out) so we check
  // each new shape both via the explicit recipient path and via the
  // admin-fan-out path.

  test("incident_reported reaches admins even when recipient list is empty", async () => {
    const { subscribe, broadcastBookingEvent } =
      await import("../../src/services/broadcaster");

    const adminReceived: unknown[] = [];
    const customerReceived: unknown[] = [];
    const unsubAdmin = subscribe(101, "admin", (e) => adminReceived.push(e));
    const unsubCustomer = subscribe(102, "customer", (e) =>
      customerReceived.push(e),
    );

    broadcastBookingEvent([], {
      type: "incident_reported",
      bookingId: 5,
      incidentType: "emergency",
    });

    expect(adminReceived).toHaveLength(1);
    const ev = adminReceived[0] as {
      type: string;
      bookingId: number;
      incidentType: string;
    };
    expect(ev.type).toBe("incident_reported");
    expect(ev.bookingId).toBe(5);
    expect(ev.incidentType).toBe("emergency");
    // Customer who didn't trigger it must NOT receive it just because
    // they have an SSE connection open.
    expect(customerReceived).toHaveLength(0);

    unsubAdmin();
    unsubCustomer();
  });

  test("user_updated reaches the named user and admins, not unrelated users", async () => {
    const { subscribe, broadcastBookingEvent } =
      await import("../../src/services/broadcaster");

    const targetReceived: unknown[] = [];
    const otherReceived: unknown[] = [];
    const adminReceived: unknown[] = [];
    const unsub1 = subscribe(201, "customer", (e) => targetReceived.push(e));
    const unsub2 = subscribe(202, "customer", (e) => otherReceived.push(e));
    const unsub3 = subscribe(203, "admin", (e) => adminReceived.push(e));

    broadcastBookingEvent([201], { type: "user_updated", userId: 201 });

    expect(targetReceived).toHaveLength(1);
    expect(adminReceived).toHaveLength(1);
    expect(otherReceived).toHaveLength(0);
    expect((targetReceived[0] as { type: string; userId: number }).userId).toBe(
      201,
    );

    unsub1();
    unsub2();
    unsub3();
  });

  test("driver_profile_updated reaches the driver and admins", async () => {
    const { subscribe, broadcastBookingEvent } =
      await import("../../src/services/broadcaster");

    const driverReceived: unknown[] = [];
    const adminReceived: unknown[] = [];
    const unsub1 = subscribe(301, "driver", (e) => driverReceived.push(e));
    const unsub2 = subscribe(302, "admin", (e) => adminReceived.push(e));

    broadcastBookingEvent([301], {
      type: "driver_profile_updated",
      driverId: 301,
    });

    expect(driverReceived).toHaveLength(1);
    expect(adminReceived).toHaveLength(1);
    expect(
      (driverReceived[0] as { type: string; driverId: number }).driverId,
    ).toBe(301);

    unsub1();
    unsub2();
  });

  test("admin fan-out de-duplicates when an admin is also in the recipient list", async () => {
    const { subscribe, broadcastBookingEvent } =
      await import("../../src/services/broadcaster");

    // Same user has both an admin tab AND is named explicitly. The
    // broadcaster must not deliver the event twice on the same
    // connection.
    const received: unknown[] = [];
    const unsub = subscribe(401, "admin", (e) => received.push(e));

    broadcastBookingEvent([401], { type: "user_updated", userId: 401 });

    expect(received).toHaveLength(1);
    unsub();
  });
});
