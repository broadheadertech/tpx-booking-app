#!/usr/bin/env node

/**
 * Deploy Script
 * Automatically increments version and deploys to Convex
 * Usage: node scripts/deploy.js [--major|--minor|--patch]
 * 
 * Default behavior: Increments patch version (e.g., 1.0.0 -> 1.0.1)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version increment type from command line args
const args = process.argv.slice(2);
const versionType = args[0] || '--patch'; // Default to patch version

// File paths
const versionFilePath = path.join(__dirname, '../src/config/version.js');
const packageJsonPath = path.join(__dirname, '../package.json');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║          🚀 DEPLOYING TipunoX BARBERSHOP APPLICATION 🚀          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

try {
  // Step 1: Read current version
  console.log('📖 Reading current version...');
  let versionContent = fs.readFileSync(versionFilePath, 'utf8');
  const versionMatch = versionContent.match(/export const APP_VERSION = '(\d+\.\d+\.\d+)'/);
  
  if (!versionMatch) {
    throw new Error('Could not find version in version.js');
  }

  const currentVersion = versionMatch[1];
  console.log(`   Current version: v${currentVersion}`);

  // Step 2: Parse and increment version
  console.log(`\n📝 Incrementing ${versionType.replace('--', '')} version...`);
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  if (versionType === '--major') {
    newVersion = `${major + 1}.0.0`;
  } else if (versionType === '--minor') {
    newVersion = `${major}.${minor + 1}.0`;
  } else { // default to patch
    newVersion = `${major}.${minor}.${patch + 1}`;
  }

  console.log(`   New version: v${newVersion}`);

  // Step 3: Update version.js
  console.log('\n✏️  Updating version.js...');
  const now = new Date();
  const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const updatedVersionContent = versionContent
    .replace(
      /export const APP_VERSION = '\d+\.\d+\.\d+'/,
      `export const APP_VERSION = '${newVersion}'`
    )
    .replace(
      /export const LAST_DEPLOY = '\d{4}-\d{2}-\d{2}'/,
      `export const LAST_DEPLOY = '${dateString}'`
    );

  fs.writeFileSync(versionFilePath, updatedVersionContent, 'utf8');
  console.log('   ✓ version.js updated');

  // Step 4: Update package.json
  console.log('\n📦 Updating package.json...');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log('   ✓ package.json updated');

  // Step 5: Run convex deploy
  console.log('\n🌐 Deploying to Convex...');
  try {
    const output = execSync('npx convex deploy --yes', { encoding: 'utf8' });
    console.log('   ✓ Convex deployment completed');
    if (output) {
      console.log('\n📋 Convex Output:');
      console.log(output);
    }
  } catch (error) {
    console.error('   ✗ Convex deployment failed:');
    console.error(error.message);
    throw error;
  }

  // Step 6: Success message
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ DEPLOYMENT SUCCESSFUL! ✅               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Deployment Summary:');
  console.log(`   • Old Version: v${currentVersion}`);
  console.log(`   • New Version: v${newVersion}`);
  console.log(`   • Deploy Date: ${dateString}`);
  console.log(`   • Files Updated: version.js, package.json`);
  console.log(`   • Backend: Convex ✓`);
  console.log('\n✨ Your application is now live! ✨\n');

} catch (error) {
  console.error('\n╔════════════════════════════════════════════════════════════════╗');
  console.error('║                    ❌ DEPLOYMENT FAILED! ❌                   ║');
  console.error('╚════════════════════════════════════════════════════════════════╝\n');
  console.error('Error:', error.message);
  process.exit(1);
}
