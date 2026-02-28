/**
 * Convex Auth Configuration for Clerk Integration
 * Story 10.2: Configures Clerk as the authentication provider
 *
 * This file tells Convex which auth providers to accept JWTs from.
 * The domain should match your Clerk instance's issuer URL.
 *
 * @see https://docs.convex.dev/auth/clerk
 */

export default {
  providers: [
    {
      domain: process.env.CLERK_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
