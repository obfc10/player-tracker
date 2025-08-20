#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Player Tracker Diagnostics\n');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, type = 'info') {
  const color = {
    error: colors.red,
    success: colors.green,
    warning: colors.yellow,
    info: colors.blue,
  }[type] || colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✓ ${description}`, 'success');
  } else {
    log(`✗ ${description} - File not found: ${filePath}`, 'error');
  }
  return exists;
}

function checkEnvVar(varName, required = true) {
  const exists = !!process.env[varName];
  if (exists) {
    log(`✓ ${varName} is set`, 'success');
  } else if (required) {
    log(`✗ ${varName} is not set`, 'error');
  } else {
    log(`⚠ ${varName} is not set (optional)`, 'warning');
  }
  return exists;
}

function runCommand(command, description) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    log(`✓ ${description}`, 'success');
    return { success: true, output };
  } catch (error) {
    log(`✗ ${description} - ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function checkDatabaseConnection() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    log('Testing database connection...', 'info');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    log('✓ Database connection successful', 'success');
    return true;
  } catch (error) {
    log(`✗ Database connection failed: ${error.message}`, 'error');
    return false;
  }
}

async function runDiagnostics() {
  console.log('1. Checking Environment Variables\n');
  const envVars = {
    DATABASE_URL: checkEnvVar('DATABASE_URL'),
    NEXTAUTH_SECRET: checkEnvVar('NEXTAUTH_SECRET'),
    NEXTAUTH_URL: checkEnvVar('NEXTAUTH_URL'),
    NODE_ENV: checkEnvVar('NODE_ENV', false),
  };

  console.log('\n2. Checking Required Files\n');
  const files = {
    '.env': checkFile('.env', '.env file'),
    'package.json': checkFile('package.json', 'package.json'),
    'prisma/schema.prisma': checkFile('prisma/schema.prisma', 'Prisma schema'),
    'next.config.mjs': checkFile('next.config.mjs', 'Next.js config'),
    'tsconfig.json': checkFile('tsconfig.json', 'TypeScript config'),
  };

  console.log('\n3. Checking Dependencies\n');
  const deps = runCommand('npm ls --depth=0', 'NPM dependencies');

  console.log('\n4. Checking Prisma\n');
  const prismaGenerate = runCommand('npx prisma generate', 'Prisma client generation');
  
  if (envVars.DATABASE_URL) {
    const dbConnected = await checkDatabaseConnection();
    
    if (dbConnected) {
      console.log('\n5. Checking Database Schema\n');
      runCommand('npx prisma db pull --print', 'Database schema introspection');
    }
  } else {
    log('⚠ Skipping database checks - DATABASE_URL not set', 'warning');
  }

  console.log('\n6. Checking TypeScript\n');
  const tsCheck = runCommand('npx tsc --noEmit', 'TypeScript compilation');

  console.log('\n7. Checking ESLint\n');
  const eslintCheck = runCommand('npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0', 'ESLint');

  console.log('\n8. Checking Build\n');
  if (envVars.DATABASE_URL) {
    log('Running build check...', 'info');
    const buildCheck = runCommand('npm run build', 'Next.js build');
  } else {
    log('⚠ Skipping build check - DATABASE_URL not set', 'warning');
  }

  console.log('\n9. System Information\n');
  log(`Node.js: ${process.version}`, 'info');
  log(`Platform: ${process.platform}`, 'info');
  log(`Architecture: ${process.arch}`, 'info');
  log(`Current Directory: ${process.cwd()}`, 'info');

  console.log('\n10. Common Issues Check\n');
  
  // Check for common issues
  if (!envVars.DATABASE_URL) {
    log('⚠ DATABASE_URL not set - Database features will not work', 'warning');
    log('  Solution: Set DATABASE_URL in .env file', 'info');
  }

  if (!envVars.NEXTAUTH_SECRET) {
    log('⚠ NEXTAUTH_SECRET not set - Authentication may not work properly', 'warning');
    log('  Solution: Generate a secret with: openssl rand -base64 32', 'info');
  }

  if (!files['.env']) {
    log('⚠ No .env file found - Using default values', 'warning');
    log('  Solution: Copy .env.example to .env and update values', 'info');
  }

  // Check for port conflicts
  try {
    execSync('lsof -i :3000', { encoding: 'utf8' });
    log('⚠ Port 3000 is already in use', 'warning');
    log('  Solution: Stop the other process or use a different port', 'info');
  } catch {
    log('✓ Port 3000 is available', 'success');
  }

  console.log('\n✅ Diagnostics Complete\n');
}

// Run diagnostics
runDiagnostics().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});