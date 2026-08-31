export default {
  providers: [
    {
      // Set this in the Convex dashboard (or `npx convex env set CLERK_JWT_ISSUER_DOMAIN ...`)
      // It's the "Issuer" shown on your Clerk JWT template named "convex".
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
