import type { MutationCtx } from "../_generated/server";

/** Creates or updates the client record tied to a phone number. */
export async function upsertClientFromBooking(
  ctx: MutationCtx,
  args: { name: string; phone: string; email?: string; clerkUserId?: string },
) {
  const existing = await ctx.db
    .query("clients")
    .withIndex("by_phone", (q) => q.eq("phone", args.phone))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: args.name,
      email: args.email ?? existing.email,
      clerkUserId: args.clerkUserId ?? existing.clerkUserId,
    });
    return existing._id;
  }

  return await ctx.db.insert("clients", {
    name: args.name,
    phone: args.phone,
    email: args.email,
    clerkUserId: args.clerkUserId,
    strikes: 0,
    banned: false,
  });
}

const STRIKE_LIMIT = 5;

/** Adds a strike to the client matching this phone number, banning at the limit. */
export async function addStrike(ctx: MutationCtx, phone: string) {
  const existing = await ctx.db
    .query("clients")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .unique();
  if (!existing) return;
  const strikes = existing.strikes + 1;
  await ctx.db.patch(existing._id, {
    strikes,
    banned: strikes >= STRIKE_LIMIT,
  });
}
