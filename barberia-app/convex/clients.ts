import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clients").collect();
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("clients")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const setBanned = mutation({
  args: { id: v.id("clients"), banned: v.boolean() },
  handler: async (ctx, { id, banned }) => {
    await ctx.db.patch(id, { banned });
  },
});
