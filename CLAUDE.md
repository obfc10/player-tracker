# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs on http://localhost:3000)
- **Build for production**: `npm run build`
- **Start production server**: `npm run start`
- **Lint code**: `npm run lint`

## Database Commands

- **Generate Prisma client**: `npm run prisma:generate`
- **Push schema changes**: `npm run prisma:push`
- **Run migrations**: `npm run prisma:migrate`
- **Seed database**: `npm run prisma:seed` (creates admin user: admin@example.com / admin123)

## Architecture Overview

This is a Next.js 14 application for tracking player data from Excel uploads, built with:

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with NextAuth for authentication
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: Radix UI primitives with custom styling

### Core Data Model

The application centers around tracking game players across time snapshots:

- **Players**: Identified by `lordId`, track name/alliance changes over time
- **Snapshots**: Point-in-time data captures from Excel uploads (39 fields per player)
- **Uploads**: File processing tracking with user attribution and status
- **Users**: Admin/viewer roles for access control

### Key Components

- **Excel Processing**: Handles 39-column player data files with format `671_YYYYMMDD_HHMMutc.xlsx`
- **Change Detection**: Automatically tracks name and alliance changes between snapshots
- **Batch Processing**: Processes large datasets in 50-row transactions for performance
- **Authentication**: Credential-based auth with bcrypt password hashing

### File Structure

- `src/app/api/upload/route.ts`: Excel file processing and data ingestion
- `src/lib/auth.ts`: NextAuth configuration with credentials provider
- `src/lib/db.ts`: Prisma client setup with global instance management
- `prisma/schema.prisma`: Complete database schema with relationships and indexes
- `scripts/seed.js`: Database seeding script for admin user creation

### Data Processing Notes

- Large numbers (power, resources) stored as strings to handle BigInt values
- Column mapping handles 39 specific fields from game export format
- Automatic worksheet detection tries kingdom number, "671", "Data", or third sheet
- Name/alliance change detection compares against most recent snapshot