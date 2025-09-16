# Facebook Auth Integration Guide (NextAuth + Facebook)

This guide explains how Facebook Login is implemented in this project and how to integrate the same pattern into another website built with Next.js and NextAuth.

## Overview

- Uses NextAuth (App Router) with the Facebook provider
- Requests page-related scopes for Page access and messaging
- Stores Facebook access token in the NextAuth JWT and exposes it on the session
- Exchanges short-lived tokens for long-lived tokens (when needed)

Flow summary:
1) User clicks “Continue with Facebook” → `signIn('facebook')`
2) Facebook OAuth → redirect back to `GET/POST /api/auth/callback/facebook`
3) NextAuth stores tokens in JWT; session callback exposes `session.accessToken`
4) Server routes use `getToken` to read the token and call the Graph API

## Code Locations

- NextAuth handler: `app/api/auth/[...nextauth]/route.ts`
- Login page (triggers sign-in): `app/login/page.tsx`
- Session provider wrapper: `components/auth-provider.tsx`
- Example API usage of token: `app/api/pages/route.ts`, `app/api/messages/route.ts`

## Environment Variables

Set these in your target site’s `.env` (or host env):

```
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_CONFIG_ID=your_optional_facebook_login_config_id

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_strong_random_string
```

Notes:
- `FACEBOOK_CONFIG_ID` is optional; remove it if you don’t use a Facebook Login configuration.
- In production, set `NEXTAUTH_URL` to your live domain (e.g., `https://your-domain.com`).

## Facebook App Setup

1) Create a Facebook app at https://developers.facebook.com/
2) Add the “Facebook Login” product to your app.
3) In Facebook Login → Settings, add the Valid OAuth Redirect URI for both dev and prod:
   - Dev: `http://localhost:3000/api/auth/callback/facebook`
   - Prod: `https://your-domain.com/api/auth/callback/facebook`
4) If you need Page data or messaging, request these scopes via App Review for production users:
   - `pages_show_list`, `pages_read_engagement`, `pages_messaging`, `pages_messaging_subscriptions`
   - While in development mode, only users with roles (Admin/Developer/Tester) can authorize these scopes.

## NextAuth Configuration

Create the NextAuth route handler in your project (App Router):

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import FacebookProvider from 'next-auth/providers/facebook';

async function refreshAccessToken(token: any) {
  try {
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${token.accessToken}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const refreshedTokens = await response.json();
    if (!response.ok) throw refreshedTokens;
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

const handler = NextAuth({
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'pages_show_list pages_read_engagement pages_messaging pages_messaging_subscriptions',
          // Remove if not using a Facebook Login configuration
          config_id: process.env.FACEBOOK_CONFIG_ID,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at; // seconds since epoch
      }
      if (Date.now() < (token.accessTokenExpires as number) * 1000) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  pages: { signIn: '/login' },
});

export { handler as GET, handler as POST };
```

Key points:
- The `jwt` callback stores Facebook tokens in the NextAuth JWT.
- The `session` callback exposes `session.accessToken` for the client.
- The `refreshAccessToken` helper attempts to exchange for a longer-lived token using `fb_exchange_token`.

## UI: Triggering Sign-In

Wrap your app with the `SessionProvider` and add a sign-in button:

```tsx
// components/auth-provider.tsx
'use client';
import { SessionProvider } from 'next-auth/react';
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

```tsx
// app/login/page.tsx (excerpt)
'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleFacebookLogin = async () => {
    const result = await signIn('facebook', { callbackUrl: '/dashboard', redirect: false });
    if (result?.url) window.location.href = result.url;
  };

  // ...render button that calls handleFacebookLogin
}
```

## Using the Access Token on the Server

Server routes read the token with `getToken` and use it for Graph API calls:

```ts
// app/api/pages/route.ts (excerpt)
import { getToken } from 'next-auth/jwt';

export async function GET(req: Request) {
  const token = await getToken({ req: req as any });
  if (!token?.accessToken) return new Response('Unauthorized', { status: 401 });

  const resp = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category,fan_count,picture.type(large),access_token&access_token=${token.accessToken}`
  );
  // ...
}
```

The same pattern is used in `app/api/messages/route.ts` to fetch a Page token and optionally Page conversations/messages (requires approved permissions).

## Redirect URIs to Configure in Facebook

Add these to Facebook Login → Settings → Valid OAuth Redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/facebook`
- Production: `https://your-domain.com/api/auth/callback/facebook`

Do not use the “direct dialog” test link in production; rely on NextAuth’s provider flow.

## Permissions and Review

Requested scopes in this setup:
- `pages_show_list`, `pages_read_engagement` (list/select Pages)
- `pages_messaging`, `pages_messaging_subscriptions` (read/send messages)

For production access beyond app roles, submit for App Review and provide screencasts and test user instructions per Facebook’s policy.

## Troubleshooting

- Callback URL not allowed: ensure exact URL is in Facebook app’s Valid OAuth Redirect URIs.
- Missing `session.accessToken`: check NextAuth callbacks and that `NEXTAUTH_SECRET` is set.
- Token expired: the refresh flow exchanges a short-lived token; verify your app is in Live mode and the exchange endpoint returns `access_token` and `expires_in`.
- Permission errors (200/10/190): add the proper scopes, add your user as a Tester/Developer, or complete App Review.

## Porting to Another Site (Checklist)

1) Install deps: `npm i next-auth`
2) Copy the NextAuth route handler (adjust scopes as needed)
3) Wrap your app with `SessionProvider`
4) Add a login page/button calling `signIn('facebook')`
5) Configure `.env` with Facebook and NextAuth variables
6) Add redirect URIs to your Facebook app (dev + prod)
7) Verify login locally, then deploy and update `NEXTAUTH_URL`

That’s it — your other Next.js site should now authenticate users via Facebook and expose `session.accessToken` for server-side Graph API calls.

