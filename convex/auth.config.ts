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
      // Clerk domain from .env.local VITE_CLERK_PUBLISHABLE_KEY
      // The domain is extracted from the publishable key format: pk_test_{base64_domain}
      // For proper-feline-8.clerk.accounts.dev
      domain: "https://proper-feline-8.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
