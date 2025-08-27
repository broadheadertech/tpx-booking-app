# Convex Integration Guide for DevBulletin

A comprehensive guide to understanding and implementing the Convex backend integration in the DevBulletin project.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Authentication System](#authentication-system)
7. [Project Management](#project-management)
8. [API Routes](#api-routes)
9. [Frontend Integration](#frontend-integration)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Next Steps](#next-steps)

## Overview

### What is Convex?

Convex is a full-stack TypeScript platform that provides:
- **Real-time database** with automatic syncing
- **Serverless functions** for backend logic
- **Built-in authentication** and user management
- **Type-safe APIs** with automatic code generation
- **Real-time subscriptions** for live data updates

### Why Convex for DevBulletin?

- **No separate backend needed** - Functions run on Convex's infrastructure
- **Real-time by default** - Perfect for community features and live updates
- **TypeScript-first** - Full type safety from database to frontend
- **Scalable** - Handles growth automatically
- **Developer-friendly** - Great DX with hot reloading and debugging

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed
- **npm or yarn** package manager
- **Next.js 13+** project (App Router)
- **TypeScript** configured
- **Basic understanding** of React and Next.js

## Installation & Setup

### Step 1: Install Convex

```bash
npm install convex
```

### Step 2: Initialize Convex

```bash
npx convex dev
```

This command will:
- Prompt you to create a Convex account (or login)
- Create a new project
- Generate configuration files
- Set up environment variables

### Step 3: Environment Variables

After initialization, you'll have a `.env.local` file with:

```env
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

**Important:** Never commit these to version control!

## Project Structure

Our Convex integration follows this structure:

```
project-root/
├── convex/                 # Convex backend code
│   ├── _generated/         # Auto-generated files (don't edit)
│   │   ├── api.d.ts
│   │   ├── api.js
│   │   ├── dataModel.d.ts
│   │   ├── server.d.ts
│   │   └── server.js
│   ├── schema.ts          # Database schema definition
│   └── services/          # Business logic functions
│       ├── auth.ts        # Authentication services
│       └── projects.ts    # Project management services
├── app/
│   ├── api/               # Next.js API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── projects/      # Project endpoints
│   └── ...
├── lib/
│   ├── auth-context.tsx   # React authentication context
│   └── ...
└── .env.local             # Environment variables
```

### Key Directories Explained

- **`convex/`** - All backend code lives here
- **`convex/_generated/`** - Auto-generated TypeScript types and API definitions
- **`convex/services/`** - Our custom business logic functions
- **`app/api/`** - Next.js API routes that connect frontend to Convex
- **`lib/`** - Frontend utilities and context providers

## Database Schema

### Schema Definition (`convex/schema.ts`)

Our schema defines the structure of all database tables:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for authentication
  users: defineTable({
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    isVerified: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"]),

  // Projects table
  projects: defineTable({
    title: v.string(),
    description: v.string(),
    authorId: v.id("users"),
    category: v.string(),
    status: v.union(
      v.literal("Draft"), 
      v.literal("Published"), 
      v.literal("Archived")
    ),
    tags: v.array(v.string()),
    techStack: v.array(v.string()),
    likes: v.number(),
    views: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

  // ... other tables
});
```

### Key Schema Concepts

- **`defineTable()`** - Creates a table with typed fields
- **`v.string()`, `v.number()`, etc.** - Field type validators
- **`v.optional()`** - Makes fields optional
- **`v.id("tableName")`** - References to other tables
- **`.index()`** - Creates database indexes for efficient queries

### Supported Field Types

```typescript
v.string()           // Text data
v.number()           // Numeric data
v.boolean()          // True/false
v.array(v.string())  // Array of strings
v.optional(v.string()) // Optional field
v.union(v.literal("A"), v.literal("B")) // Enum-like values
v.id("users")        // Reference to users table
```

## Authentication System

### Authentication Service (`convex/services/auth.ts`)

Our authentication system provides:

#### User Registration

```typescript
export const registerUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    // ... other fields
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      // ... other fields
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create session
    const sessionToken = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: Date.now(),
    });

    return { userId, sessionToken, user: { /* user data */ } };
  },
});
```

#### User Login

```typescript
export const loginUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Create new session
    const sessionToken = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      createdAt: Date.now(),
    });

    return { userId: user._id, sessionToken, user };
  },
});
```

#### Session Verification

```typescript
export const getCurrentUser = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Find valid session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null; // Invalid or expired session
    }

    // Get user data
    const user = await ctx.db.get(session.userId);
    return user;
  },
});
```

### Key Authentication Concepts

- **Mutations** - Functions that modify data (create, update, delete)
- **Queries** - Functions that read data (no modifications)
- **Sessions** - Token-based authentication with expiration
- **Indexes** - Used for efficient database lookups

## Project Management

### Project Service (`convex/services/projects.ts`)

#### Creating Projects

```typescript
export const createProject = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    techStack: v.array(v.string()),
    // ... other fields
  },
  handler: async (ctx, args) => {
    // Verify user session
    const session = await verifySession(ctx, args.sessionToken);
    
    // Create project
    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      authorId: session.userId,
      category: args.category,
      status: "Draft",
      tags: args.tags,
      techStack: args.techStack,
      likes: 0,
      views: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { projectId };
  },
});
```

#### Querying Projects

```typescript
export const getProjects = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    category: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("newest"),
      v.literal("popular"),
      v.literal("views")
    )),
  },
  handler: async (ctx, args) => {
    let projects;

    // Apply filters and sorting
    if (args.category) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .collect();
    } else {
      const sortBy = args.sortBy || "newest";
      switch (sortBy) {
        case "popular":
          projects = await ctx.db
            .query("projects")
            .withIndex("by_likes")
            .order("desc")
            .collect();
          break;
        case "newest":
        default:
          projects = await ctx.db
            .query("projects")
            .withIndex("by_created_at")
            .order("desc")
            .collect();
          break;
      }
    }

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 20;
    return projects.slice(offset, offset + limit);
  },
});
```

## API Routes

### Next.js API Integration

We use Next.js API routes to connect our frontend to Convex:

#### Authentication Route (`app/api/auth/login/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Call Convex function
    const result = await convex.mutation(api.services.auth.loginUser, {
      email,
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    response.cookies.set('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

#### Projects Route (`app/api/projects/route.ts`)

```typescript
// GET /api/projects
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const sortBy = searchParams.get('sortBy');

  const projects = await convex.query(api.services.projects.getProjects, {
    category,
    sortBy,
  });

  return NextResponse.json({ projects });
}

// POST /api/projects
export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  
  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const projectData = await request.json();
  
  const result = await convex.mutation(api.services.projects.createProject, {
    sessionToken,
    ...projectData,
  });

  return NextResponse.json(result);
}
```

### API Route Patterns

- **GET** - Retrieve data (queries)
- **POST** - Create new data (mutations)
- **PATCH/PUT** - Update existing data (mutations)
- **DELETE** - Remove data (mutations)

## Frontend Integration

### Authentication Context (`lib/auth-context.tsx`)

```typescript
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  // ... other fields
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    setUser(data.user);
  };

  // ... other methods

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Using the Auth Context

```typescript
"use client";

import { useAuth } from '@/lib/auth-context';

export default function LoginForm() {
  const { user, login, logout, loading } = useAuth();
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email);
      // User is now logged in
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (user) {
    return (
      <div>
        <p>Welcome, {user.name}!</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Testing

### Demo Page

We've created a demo page at `/demo` to test the integration:

```typescript
// Visit http://localhost:3001/demo
// Features:
// - User registration and login
// - Session management
// - Error handling
// - Success feedback
```

### Testing Checklist

- [ ] User can register with email and name
- [ ] User can login with existing email
- [ ] Session persists across page refreshes
- [ ] User can logout successfully
- [ ] Invalid sessions are handled gracefully
- [ ] Error messages are displayed properly

### Manual Testing Steps

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Visit the demo page:**
   ```
   http://localhost:3001/demo
   ```

3. **Test registration:**
   - Click "Switch to Register"
   - Enter email and name
   - Click "Register"
   - Verify success message and user info display

4. **Test logout:**
   - Click "Logout"
   - Verify return to login form

5. **Test login:**
   - Enter the same email
   - Click "Login"
   - Verify successful login

## Troubleshooting

### Common Issues

#### 1. "Cannot find module '../_generated/server'"

**Cause:** Convex hasn't generated the API files yet.

**Solution:**
```bash
npx convex dev --once
```

#### 2. "IndexNameReserved" Error

**Cause:** Using reserved index names like `by_creation_time`.

**Solution:** Use different names like `by_created_at`.

#### 3. "Invalid or expired session"

**Cause:** Session token is missing or expired.

**Solution:** 
- Check if cookies are being set properly
- Verify session token in browser dev tools
- Ensure session hasn't expired

#### 4. CORS Issues

**Cause:** Frontend and backend on different domains.

**Solution:** Convex handles CORS automatically, but ensure you're using the correct CONVEX_URL.

#### 5. TypeScript Errors

**Cause:** Generated types are out of sync.

**Solution:**
```bash
npx convex dev --once
# or
npx convex codegen
```

### Debug Tips

1. **Check Convex Dashboard:**
   - Visit your Convex dashboard
   - Monitor function calls and errors
   - Check database contents

2. **Use Console Logs:**
   ```typescript
   console.log('Debug info:', { user, session });
   ```

3. **Check Network Tab:**
   - Monitor API calls in browser dev tools
   - Verify request/response data

4. **Verify Environment Variables:**
   ```bash
   echo $NEXT_PUBLIC_CONVEX_URL
   ```

### Getting Help

- **Convex Documentation:** https://docs.convex.dev
- **Convex Discord:** https://convex.dev/community
- **GitHub Issues:** Create issues in your repository

## Next Steps

### Immediate Improvements

1. **Real-time Features:**
   ```typescript
   // Use Convex subscriptions for live updates
   const projects = useQuery(api.services.projects.getProjects, {});
   ```

2. **File Uploads:**
   ```typescript
   // Add file storage for project images
   const uploadUrl = await convex.mutation(api.files.generateUploadUrl);
   ```

3. **Advanced Queries:**
   ```typescript
   // Add full-text search
   const results = await ctx.db
     .query("projects")
     .withSearchIndex("search_projects", (q) => 
       q.search("title", searchTerm)
     )
     .collect();
   ```

### Advanced Features

1. **Real-time Collaboration**
2. **Push Notifications**
3. **Advanced Analytics**
4. **Multi-tenant Architecture**
5. **Caching Strategies**

### Performance Optimization

1. **Pagination Implementation**
2. **Query Optimization**
3. **Index Strategy**
4. **Caching Layer**

## Conclusion

This Convex integration provides:

- ✅ **Type-safe backend** with automatic code generation
- ✅ **Real-time capabilities** for live updates
- ✅ **Scalable architecture** that grows with your app
- ✅ **Developer-friendly** setup and debugging
- ✅ **Production-ready** authentication and data management

---

**Happy coding! 🚀**

For questions or issues, refer to the troubleshooting section or check the Convex documentation.