# Barbershop Deployment Guide

## Overview

This guide explains how to use the new automatic deployment and versioning system for Barbershop.

## Quick Start

### One-Command Deployment

Deploy your changes with automatic version incrementing:

```bash
npm run deploy
```

This will:
1. ✅ Increment patch version (1.0.0 → 1.0.1)
2. ✅ Update `src/config/version.js`
3. ✅ Update `package.json`
4. ✅ Update deployment date
5. ✅ Run `npx convex deploy`
6. ✅ Show deployment summary

## Deployment Options

### 1. Patch Version (Bug Fixes)
**Use when**: Fixing bugs or making minor improvements

```bash
npm run deploy
# or
npm run deploy:patch
# Example: 1.0.0 → 1.0.1
```

### 2. Minor Version (New Features)
**Use when**: Adding new features or functionality

```bash
npm run deploy:minor
# Example: 1.0.0 → 1.1.0
```

### 3. Major Version (Breaking Changes)
**Use when**: Making breaking changes or major updates

```bash
npm run deploy:major
# Example: 1.0.0 → 2.0.0
```

### 4. Direct Script Usage

```bash
node scripts/deploy.js              # Default (patch)
node scripts/deploy.js --patch      # Explicit patch
node scripts/deploy.js --minor      # Minor version
node scripts/deploy.js --major      # Major version
```

## Version Display

The app version is displayed in the **bottom-right corner** of the login page:

```
v8.1.2.1
Barbershop
```

This automatically updates after each deployment.

## Files Modified by Deploy Script

### Automatically Updated:
- `src/config/version.js` - Version and deploy date
- `package.json` - Version field

### No Manual Updates Needed!
The script handles all version management automatically.

## Versioning Scheme

Barbershop uses **Semantic Versioning**:

```
MAJOR.MINOR.PATCH
  1  .  0  .  0

- MAJOR: Breaking changes (1.0.0)
- MINOR: New features (1.1.0)
- PATCH: Bug fixes (1.0.1)
```

Examples:
- `1.0.0` → `1.0.1`: Fixed a bug
- `1.0.0` → `1.1.0`: Added new booking feature
- `1.0.0` → `2.0.0`: Complete redesign

## Deployment Workflow

```
┌─────────────────────────────────────────────────────┐
│ 1. Make code changes                                │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 2. Test locally (npm run dev)                       │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 3. Commit changes (git commit -m "message")         │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 4. Run deployment (npm run deploy)                  │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ✅ Version incremented                              │
│ ✅ Files updated                                    │
│ ✅ Convex deployed                                  │
│ ✅ Live in production                               │
└─────────────────────────────────────────────────────┘
```

## Example Deployment Session

```bash
$ npm run deploy

╔════════════════════════════════════════════════════════════════╗
║          🚀 DEPLOYING TipunoX BARBERSHOP APPLICATION 🚀          ║
╚════════════════════════════════════════════════════════════════╝

📖 Reading current version...
   Current version: v8.1.2.0

📝 Incrementing patch version...
   New version: v8.1.2.1

✏️  Updating version.js...
   ✓ version.js updated

📦 Updating package.json...
   ✓ package.json updated

🌐 Deploying to Convex...
   ✓ Convex deployment completed

╔════════════════════════════════════════════════════════════════╗
║                    ✅ DEPLOYMENT SUCCESSFUL! ✅               ║
╚════════════════════════════════════════════════════════════════╝

📊 Deployment Summary:
   • Old Version: v8.1.2.0
   • New Version: v8.1.2.1
   • Deploy Date: 2024-10-18
   • Files Updated: version.js, package.json
   • Backend: Convex ✓

✨ Your application is now live! ✨
```

## Checking Current Version

### In Code
```javascript
import { APP_VERSION } from '@/config/version'
console.log('Current version:', APP_VERSION) // 1.0.1
```

### In Browser
Visit `http://localhost:3000/auth/login` and look at the bottom-right corner.

### In Files
Check `src/config/version.js` or `package.json`

## Troubleshooting

### Error: "Could not find version in version.js"
- Make sure `src/config/version.js` exists
- Check that the version format is correct: `export const APP_VERSION = '1.0.0'`

### Error: "Convex deployment failed"
- Ensure you have Convex CLI installed: `npm install -g convex`
- Check internet connection
- Verify Convex credentials are configured

### Version Not Updating
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Reload the page
- Check `src/config/version.js` was updated

## Best Practices

### When to Deploy

✅ **DO Deploy When:**
- Features are tested and working
- Bug fixes are verified
- Code review is complete
- Ready for production

❌ **DON'T Deploy When:**
- Code is not tested
- Features are incomplete
- There are unresolved conflicts
- Waiting for approvals

### Versioning Best Practices

1. **Be Consistent**: Use semantic versioning always
2. **Document Changes**: Update git commit messages
3. **Test First**: Always test before deploying
4. **One Deploy Per Change Set**: Don't mix unrelated changes
5. **Tag Releases**: Use git tags for major releases

## Advanced Usage

### Custom Version Format
The deploy script reads from `src/config/version.js`. To use a custom version:

Edit `src/config/version.js`:
```javascript
export const APP_VERSION = '1.2.3';
```

Then run: `npm run deploy`

### Automated Deployments
You can integrate the deploy script into CI/CD:

```yaml
# Example GitHub Action
- name: Deploy Barbershop
  run: npm run deploy
```

## Version History

Track all versions in your git history:

```bash
git log --oneline --grep="Deploying"
```

Or check the git tags:

```bash
git tag -l
```

## Support

For issues or questions:
- Check the troubleshooting section above
- Review script output for error details
- Check Convex dashboard for deployment status

---

**Last Updated:** 2024-10-18
**Current Version:** 1.0.0
**Script Version:** 1.0
