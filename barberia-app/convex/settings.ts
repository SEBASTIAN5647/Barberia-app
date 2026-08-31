import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULTS = { openTime: "09:00", closeTime: "19:00", slotStepMin: 30 };

export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("shopSettings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    return row ?? { key: "main", ...DEFAULTS };
  },
});

export const update = mutation({
  args: {
    openTime: v.optional(v.string()),
    closeTime: v.optional(v.string()),
    slotStepMin: v.optional(v.number()),
  },
  handler: async (ctx, patch) => {
    const row = await ctx.db
      .query("shopSettings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, patch);
    } else {
      await ctx.db.insert("shopSettings", { key: "main", ...DEFAULTS, ...patch });
    }
  },
});
