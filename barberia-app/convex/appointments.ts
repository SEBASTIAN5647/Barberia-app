import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { computeFreeSlots } from "./model/availability";
import { upsertClientFromBooking, addStrike } from "./model/clients";

const STATUS = v.union(
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("no_show"),
);

// ---------- availability ----------

export const availableSlots = query({
  args: { dateISO: v.string(), serviceId: v.id("services") },
  handler: async (ctx, { dateISO, serviceId }) => {
    const service = await ctx.db.get(serviceId);
    if (!service) return [];

    const settingsRow = await ctx.db
      .query("shopSettings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    const settings = settingsRow ?? { openTime: "09:00", closeTime: "19:00", slotStepMin: 30 };

    const dayAppts = await ctx.db
      .query("appointments")
      .withIndex("by_dateISO", (q) => q.eq("dateISO", dateISO))
      .collect();
    const existing = dayAppts
      .filter((a) => a.status === "confirmed" || a.status === "completed")
      .map((a) => ({ time24: a.time24, durationMin: a.durationMin }));

    const blocks = await ctx.db.query("blocks").collect();

    return computeFreeSlots({
      dateISO,
      durationMin: service.durationMin,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      slotStepMin: settings.slotStepMin,
      existing,
      blocks,
    });
  },
});

// ---------- booking ----------

export const create = mutation({
  args: {
    serviceId: v.id("services"),
    dateISO: v.string(),
    time24: v.string(),
    clientName: v.string(),
    clientPhone: v.string(),
    clientEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new Error("Servicio no encontrado");

    const identity = await ctx.auth.getUserIdentity();

    const client = await ctx.db
      .query("clients")
      .withIndex("by_phone", (q) => q.eq("phone", args.clientPhone))
      .unique();
    if (client?.banned) {
      throw new Error("Este número tiene demasiadas inasistencias. Contacta directamente a la barbería.");
    }

    // re-check the slot is still free (avoids a race between two bookings)
    const dayAppts = await ctx.db
      .query("appointments")
      .withIndex("by_dateISO", (q) => q.eq("dateISO", args.dateISO))
      .collect();
    const overlapping = dayAppts.some((a) => {
      if (a.status !== "confirmed" && a.status !== "completed") return false;
      const aStart = toMinutes(a.time24);
      const aEnd = aStart + a.durationMin;
      const bStart = toMinutes(args.time24);
      const bEnd = bStart + service.durationMin;
      return aStart < bEnd && bStart < aEnd;
    });
    if (overlapping) throw new Error("Ese horario ya no está disponible, elige otro.");

    await upsertClientFromBooking(ctx, {
      name: args.clientName,
      phone: args.clientPhone,
      email: args.clientEmail,
      clerkUserId: identity?.subject,
    });

    const depositRequired = (client?.strikes ?? 0) >= 3 && !client?.banned;

    return await ctx.db.insert("appointments", {
      clerkUserId: identity?.subject,
      clientName: args.clientName,
      clientPhone: args.clientPhone,
      clientEmail: args.clientEmail,
      serviceId: args.serviceId,
      serviceName: service.name,
      price: service.price,
      durationMin: service.durationMin,
      dateISO: args.dateISO,
      time24: args.time24,
      status: "confirmed",
      depositRequired,
      createdAt: Date.now(),
    });
  },
});

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ---------- client-facing ----------

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("appointments")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const cancel = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Debes iniciar sesión.");
    const appt = await ctx.db.get(id);
    if (!appt || appt.clerkUserId !== identity.subject) {
      throw new Error("No autorizado.");
    }
    await ctx.db.patch(id, { status: "cancelled" });
  },
});

export const reschedule = mutation({
  args: { id: v.id("appointments"), dateISO: v.string(), time24: v.string() },
  handler: async (ctx, { id, dateISO, time24 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Debes iniciar sesión.");
    const appt = await ctx.db.get(id);
    if (!appt || appt.clerkUserId !== identity.subject) {
      throw new Error("No autorizado.");
    }
    await ctx.db.patch(id, { dateISO, time24 });
  },
});

export const rate = mutation({
  args: { id: v.id("appointments"), rating: v.number() },
  handler: async (ctx, { id, rating }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Debes iniciar sesión.");
    const appt = await ctx.db.get(id);
    if (!appt || appt.clerkUserId !== identity.subject) {
      throw new Error("No autorizado.");
    }
    if (appt.status !== "completed") throw new Error("Solo puedes calificar citas completadas.");
    if (rating < 1 || rating > 5) throw new Error("Calificación inválida.");
    await ctx.db.patch(id, { rating });
  },
});

// ---------- admin ----------
// NOTE: these are not yet role-restricted -- see README "Pendiente: roles de
// admin" before shipping this beyond your own use.

export const listByDate = query({
  args: { dateISO: v.string() },
  handler: async (ctx, { dateISO }) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_dateISO", (q) => q.eq("dateISO", dateISO))
      .collect();
  },
});

export const listByStatus = query({
  args: { status: STATUS },
  handler: async (ctx, { status }) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  },
});

export const markCompleted = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "completed" });
  },
});

export const markNoShow = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const appt = await ctx.db.get(id);
    if (!appt) return;
    await ctx.db.patch(id, { status: "no_show" });
    await addStrike(ctx, appt.clientPhone);
  },
});

export const adminReschedule = mutation({
  args: { id: v.id("appointments"), dateISO: v.string(), time24: v.string() },
  handler: async (ctx, { id, dateISO, time24 }) => {
    await ctx.db.patch(id, { dateISO, time24 });
  },
});

export const adminCancel = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "cancelled" });
  },
});
