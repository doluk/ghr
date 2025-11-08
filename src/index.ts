#!/usr/bin/env node

/**
 * Main entry point for the ghr application
 */

import { Application } from './core/application';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Main execution
async function main() {
  try {
    const app = new Application();
    await app.run();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();
