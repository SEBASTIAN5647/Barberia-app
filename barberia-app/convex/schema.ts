import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  services: defineTable({
    name: v.string(),
    price: v.number(), // Lempiras
    durationMin: v.number(),
    active: v.boolean(),
    order: v.number(),
  }).index("by_order", ["order"]),

  appointments: defineTable({
    // who
    clerkUserId: v.optional(v.string()), // set if the client was signed in when booking
    clientName: v.string(),
    clientPhone: v.string(),
    clientEmail: v.optional(v.string()),

    // what
    serviceId: v.id("services"),
    serviceName: v.string(), // snapshot at booking time
    price: v.number(), // snapshot at booking time
    durationMin: v.number(), // snapshot at booking time

    // when
    dateISO: v.string(), // "2026-09-04"
    time24: v.string(), // "14:30"

    // state
    status: v.union(
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
    depositRequired: v.boolean(),
    rating: v.optional(v.number()), // 1-5, set after "completed"

    createdAt: v.number(),
  })
    .index("by_dateISO", ["dateISO"])
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_clientPhone", ["clientPhone"])
    .index("by_status", ["status"]),

  blocks: defineTable({
    title: v.string(),
    // one-off block: set dateISO. recurring block: set recurrence + weekday.
    recurrence: v.union(v.literal("none"), v.literal("weekly"), v.literal("daily")),
    dateISO: v.optional(v.string()), // required when recurrence = "none"
    weekday: v.optional(v.number()), // 0=domingo..6=sabado, required when recurrence = "weekly"
    startTime: v.string(), // "00:00"
    endTime: v.string(), // "23:59"
  }),

  clients: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    strikes: v.number(),
    banned: v.boolean(),
  })
    .index("by_phone", ["phone"])
    .index("by_clerkUserId", ["clerkUserId"]),

  shopSettings: defineTable({
    key: v.string(), // singleton row, key = "main"
    openTime: v.string(), // "09:00"
    closeTime: v.string(), // "19:00"
    slotStepMin: v.number(), // 30
  }).index("by_key", ["key"]),
});
