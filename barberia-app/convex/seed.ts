import { mutation } from "./_generated/server";

/**
 * Run once after `npx convex dev` is up:
 *   npx convex run seed:run
 * Safe to run more than once -- it skips anything that already exists.
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existingServices = await ctx.db.query("services").collect();
    if (existingServices.length === 0) {
      const seedServices = [
        { name: "Corte clásico", price: 150, durationMin: 30 },
        { name: "Corte + barba", price: 220, durationMin: 45 },
        { name: "Diseño / fade", price: 200, durationMin: 45 },
        { name: "Barba y cejas", price: 120, durationMin: 20 },
        { name: "Corte niño", price: 120, durationMin: 30 },
      ];
      for (let i = 0; i < seedServices.length; i++) {
        await ctx.db.insert("services", { ...seedServices[i], active: true, order: i });
      }
    }

    const existingSettings = await ctx.db.query("shopSettings").collect();
    if (existingSettings.length === 0) {
      await ctx.db.insert("shopSettings", {
        key: "main",
        openTime: "09:00",
        closeTime: "19:00",
        slotStepMin: 30,
      });
    }

    const existingBlocks = await ctx.db.query("blocks").collect();
    if (existingBlocks.length === 0) {
      await ctx.db.insert("blocks", {
        title: "Cerrado los domingos",
        recurrence: "weekly",
        weekday: 0,
        startTime: "00:00",
        endTime: "23:59",
      });
    }

    return "ok";
  },
});
