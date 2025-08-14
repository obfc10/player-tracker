#!/usr/bin/env node

/**
 * Database deployment script for production
 * Run this after setting up your production database
 */

const { execSync } = require('child_process');

console.log('🚀 Deploying database schema to production...');

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Push schema to database
  console.log('🗄️  Pushing schema to database...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  // Seed database with initial data
  console.log('🌱 Seeding database...');
  execSync('node scripts/seed.js', { stdio: 'inherit' });

  console.log('✅ Database deployment completed successfully!');
} catch (error) {
  console.error('❌ Database deployment failed:', error.message);
  process.exit(1);
}