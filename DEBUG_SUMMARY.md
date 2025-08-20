# Player Tracker Debug Summary

## Debugging Infrastructure Added

I've implemented a comprehensive debugging system for the Player Tracker application. Here's what has been added:

### 1. Enhanced Logging System

#### Authentication Logging (`src/lib/auth.ts`)
- Logs all authentication attempts with username
- Tracks database connection status during auth
- Logs user approval status checks
- Tracks JWT token creation and session callbacks
- Provides detailed error logging with stack traces

#### Database Connection Logging (`src/lib/db.ts`)
- Logs Prisma client creation attempts
- Verifies DATABASE_URL existence
- Implements connection testing on startup
- Provides detailed error logging for connection failures
- Adds Prisma query logging in development mode

#### Session Provider Logging (`src/components/providers.tsx`)
- Tracks SessionProvider mounting
- Logs session storage and cookie status
- Integrates with error tracking system

#### Home Page Logging (`src/app/page.tsx`)
- Logs session status changes
- Tracks authentication redirects
- Implements timeout detection for session loading
- Shows debug components in development mode

### 2. Error Tracking System (`src/lib/error-tracker.ts`)

A global error tracking system that:
- Catches unhandled errors and promise rejections
- Intercepts console.error calls
- Tracks fetch errors automatically
- Maintains a rolling log of last 100 errors
- Categorizes errors by type (error, warning, info)
- Provides error summaries by source

### 3. Debug Components

#### System Status Component (`src/components/debug/SystemStatus.tsx`)
Displays real-time:
- Client session status
- Environment variables status
- Database connection status
- Server authentication status
- Last check timestamp

#### Error Display Component (`src/components/debug/ErrorDisplay.tsx`)
Shows:
- Total error counts by type
- Error breakdown by source
- Recent error logs with timestamps
- Ability to clear error history

### 4. Debug Endpoints

#### System Check API (`src/app/api/debug/system-check/route.ts`)
Provides:
- Environment variable verification
- Database connection testing
- Authentication session checking
- Prisma client status

### 5. Debug Dashboard (`src/app/debug/page.tsx`)

A comprehensive debug page featuring:
- Session information display
- Environment variable listing
- Database connection testing
- API endpoint testing
- Error trigger buttons for testing
- Performance metrics display
- Integration of all debug components

### 6. Diagnostics Script (`scripts/diagnose.js`)

Run with: `npm run diagnose`

Checks:
- Environment variables
- Required files
- NPM dependencies
- Prisma configuration
- Database connection
- TypeScript compilation
- ESLint issues
- Build process
- Port availability
- Common issues with solutions

## How to Use the Debug System

### 1. Run Diagnostics
```bash
npm run diagnose
```
This will check your entire setup and report any issues.

### 2. View Debug Dashboard
Navigate to `/debug` in your browser to see the comprehensive debug dashboard.

### 3. Monitor Errors
The error tracking system automatically captures all errors. View them in:
- The ErrorDisplay component (top-right corner in development)
- The browser console (prefixed with [ErrorTracker])

### 4. Check System Status
The SystemStatus component (bottom-right corner in development) shows:
- Current authentication status
- Database connection health
- Environment configuration

### 5. Test API Endpoints
Use the debug dashboard to test various API endpoints and see response times and data.

## Common Issues Detected

Based on the debugging infrastructure, here are the most likely issues:

### 1. Authentication/Session Issues
- **Problem**: Session loading timeout after 5 seconds
- **Cause**: Missing NEXTAUTH_SECRET or database connection issues
- **Solution**: Ensure NEXTAUTH_SECRET is set and database is accessible

### 2. Database Connection Issues
- **Problem**: "DATABASE_URL environment variable is not set" error
- **Cause**: Missing or incorrect DATABASE_URL in .env
- **Solution**: Set proper DATABASE_URL in .env file

### 3. Build Errors
- **Problem**: Build fails with database-related errors
- **Cause**: Build process tries to connect to database
- **Solution**: The build.sh script handles this gracefully

### 4. Session Persistence
- **Problem**: Users getting logged out unexpectedly
- **Cause**: Session token issues or cookie problems
- **Solution**: Check NEXTAUTH_URL matches your domain

## Next Steps

To diagnose specific issues:

1. Run `npm run diagnose` to check system health
2. Start the dev server and check browser console for errors
3. Visit `/debug` to run interactive tests
4. Check the error tracker for any captured errors
5. Review the system status component for real-time health

The debugging infrastructure will help identify and track down any issues in the application. All major components now have comprehensive logging that will aid in troubleshooting.