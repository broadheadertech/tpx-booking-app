/**
 * Version Configuration
 * This file is automatically updated by deploy.js
 * Do not manually edit the version number
 */

export const APP_VERSION = '1.0.3';
export const LAST_DEPLOY = '2025-10-18';
export const VERSION_INFO = {
  version: APP_VERSION,
  lastDeploy: LAST_DEPLOY,
  environment: import.meta.env.MODE || 'development'
};

export default APP_VERSION;
