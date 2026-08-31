import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("blocks").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    recurrence: v.union(v.literal("none"), v.literal("weekly"), v.literal("daily")),
    dateISO: v.optional(v.string()),
    weekday: v.optional(v.number()),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blocks", args);
  },
});

export const remove = mutation({
  args: { id: v.id("blocks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
