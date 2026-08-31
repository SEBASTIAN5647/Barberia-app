import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("services")
      .withIndex("by_order")
      .collect();
    return all.filter((s) => s.active);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("services").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    durationMin: v.number(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("services").collect();
    const order = all.length ? Math.max(...all.map((s) => s.order)) + 1 : 0;
    return await ctx.db.insert("services", { ...args, active: true, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    durationMin: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { active: false });
  },
});
