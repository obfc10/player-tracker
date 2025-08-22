# Player Tracker - Codebase Overview

## Project Summary

**Player Tracker** is a comprehensive Next.js 14 application designed for tracking game player data across time through Excel file uploads. It provides advanced analytics, leaderboards, and administrative tools for managing player performance in Kingdom 671.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, NextAuth authentication  
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS with Radix UI components
- **Charts**: Recharts & Chart.js for data visualization
- **File Processing**: ExcelJS for .xlsx file parsing

### Core Architecture Patterns
- **Repository Pattern**: Data access layer abstraction
- **Service Layer**: Business logic separation
- **Component-Based UI**: Modular React components
- **API-First Design**: RESTful API routes for all data operations

## 📊 Core Data Model

### Primary Entities

#### 🎮 Players (`Player`)
- **Identifier**: `lordId` (unique game ID)
- **Tracking**: Name changes, alliance moves, realm status
- **Relationships**: Snapshots, name/alliance history, event participation

#### 📸 Snapshots (`Snapshot`) 
- **Purpose**: Point-in-time data captures from Excel uploads
- **Format**: 39 fields per player (power, merits, resources, combat stats)
- **Naming**: `671_YYYYMMDD_HHMMutc.xlsx` format

#### 📈 Player Snapshots (`PlayerSnapshot`)
- **Data**: Complete player stats per snapshot (39 fields)
- **Metrics**: Power, merits, resources, combat performance
- **Storage**: String format for large numbers (BigInt support)

#### 👥 Users (`User`)
- **Roles**: ADMIN, VIEWER with different access levels
- **Authentication**: Credential-based with bcrypt hashing
- **Status**: PENDING, APPROVED, REJECTED workflow

#### 🏆 Seasons (`Season`)
- **Purpose**: Time-based data organization
- **Management**: Start/end dates, active season tracking
- **Analytics**: Season-specific performance analysis

## 🗂️ Project Structure

### `/src/app/` - Next.js App Router
```
├── api/                    # API Routes
│   ├── upload/            # Excel file processing
│   ├── players/           # Player data endpoints
│   ├── merits/            # Merit analytics
│   ├── leaderboard/       # Rankings and leaderboards
│   ├── auth/              # Authentication routes
│   └── admin/             # Administrative functions
├── dashboard/             # Main application pages
│   ├── overview/          # Dashboard summary
│   ├── players/           # Player management
│   ├── merits/            # Merit analytics
│   ├── leaderboard/       # Rankings display
│   ├── upload/            # File upload interface
│   └── admin/             # Admin tools
└── auth/                  # Authentication pages
```

### `/src/components/` - React Components
```
├── ui/                    # Base UI components (buttons, cards, etc.)
├── charts/                # Data visualization components
├── business/              # Domain-specific components
├── leaderboard/           # Ranking and competition components
├── upload/                # File processing components
├── player-detail/         # Player profile components
└── providers.tsx          # React context providers
```

### `/src/lib/` - Core Libraries
```
├── db.ts                  # Database connection (Prisma)
├── auth.ts                # Authentication configuration
├── alliance-config.ts     # Alliance management settings
├── export.ts              # Data export functionality
├── formatting.ts          # Number and date formatting
└── error-handler.ts       # Global error handling
```

### `/src/services/` - Business Logic
```
├── ExcelProcessingService.ts    # File parsing and validation
├── PlayerAnalyticsService.ts    # Performance calculations
├── ChangeDetectionService.ts    # Name/alliance change tracking
├── PlayerService.ts             # Player data operations
└── CacheService.ts              # Performance optimization
```

## 🚀 Key Features

### 📊 Analytics & Reporting
- **Merit Analytics**: Advanced merit tracking with efficiency calculations
- **Progress Tracking**: Historical performance analysis
- **Alliance Analysis**: Team-based performance metrics
- **Export System**: CSV/Excel data export functionality

### 📈 Data Visualization
- **Interactive Charts**: Recharts-based visualizations
- **Performance Metrics**: Merit trends, power distribution
- **Comparative Analysis**: Player vs alliance performance
- **Historical Trends**: Time-based progression tracking

### 🏆 Leaderboards & Rankings
- **Merit Rankings**: Top performers by merit accumulation
- **Alliance Leaderboards**: Team-based competitions
- **Progress Tracking**: Growth and improvement metrics
- **Filtering**: Alliance-specific and time-based views

### 📁 File Processing
- **Excel Upload**: Automated .xlsx file processing
- **Data Validation**: Schema validation and error handling
- **Batch Processing**: 50-row transaction batches for performance
- **Change Detection**: Automatic name/alliance change tracking

### 👨‍💼 Administration
- **User Management**: Role-based access control
- **Season Management**: Time period organization
- **Data Maintenance**: Database cleanup and optimization
- **System Monitoring**: Health checks and diagnostics

### 🔍 Search & Discovery
- **Global Search**: Multi-entity search functionality
- **Player Lookup**: Advanced player filtering
- **Alliance Filtering**: Team-based data views
- **Historical Search**: Time-based data queries

## 🔧 Development Commands

### Core Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Code linting
```

### Database Operations
```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:push        # Push schema changes
npm run prisma:migrate     # Run migrations
npm run prisma:seed        # Seed database (creates admin user)
```

### Utilities
```bash
npm run diagnose          # System diagnostics
npm run deploy:db         # Database deployment
```

## 🎯 Core Business Logic

### Excel Processing Workflow
1. **File Upload**: User uploads Excel file via dashboard
2. **Validation**: Format and schema validation
3. **Parsing**: Extract 39 fields per player
4. **Change Detection**: Compare with previous snapshots
5. **Batch Insert**: Process in 50-row transactions
6. **Notification**: Update upload status

### Merit Analytics Engine
- **Raw Calculations**: Merit totals and rankings
- **Efficiency Metrics**: Merit per power ratios
- **Growth Analysis**: Historical progression tracking
- **Percentile Rankings**: Kingdom-wide performance context
- **Alliance Aggregation**: Team-based merit summaries

### Authentication Flow
- **Credential-based**: Username/password authentication
- **Role-based Access**: ADMIN vs VIEWER permissions
- **Session Management**: NextAuth session handling
- **Security**: bcrypt password hashing, CSRF protection

## 📋 Data Processing Notes

### Large Number Handling
- **Storage**: Strings used for BigInt values (power, resources)
- **Display**: Formatted with K/M suffixes (1.2M, 500K)
- **Calculations**: JavaScript number conversion for analytics

### Excel File Format
- **Naming**: `671_YYYYMMDD_HHMMutc.xlsx`
- **Columns**: 39 specific fields per player
- **Worksheets**: Auto-detection of "671", "Data", or third sheet
- **Validation**: Schema enforcement and error reporting

### Change Detection Algorithm
1. **Historical Comparison**: Compare against most recent snapshot
2. **Name Changes**: Track player name modifications
3. **Alliance Moves**: Monitor alliance tag changes
4. **Timestamps**: Record detection time for audit trails

## 🔐 Security Features

### Authentication & Authorization
- **NextAuth Integration**: Secure session management
- **Role-based Access**: Granular permission system
- **Password Security**: bcrypt hashing with salt
- **Session Validation**: API route protection

### Data Protection
- **Input Validation**: Comprehensive data sanitization
- **SQL Injection Prevention**: Prisma ORM protection
- **File Upload Security**: Validation and type checking
- **Error Handling**: Secure error messages

## 🎨 UI/UX Features

### Design System
- **Tailwind CSS**: Utility-first styling approach
- **Radix UI**: Accessible component primitives
- **Dark Theme**: Professional dark color scheme
- **Responsive Design**: Mobile-optimized layouts

### User Experience
- **Loading States**: Progressive loading indicators
- **Error Boundaries**: Graceful error handling
- **Real-time Updates**: Dynamic data refreshing
- **Export Tools**: One-click data downloads

## 📈 Performance Optimizations

### Backend Optimizations
- **Database Indexing**: Strategic index placement
- **Batch Processing**: Transaction-based data insertion
- **Connection Pooling**: Optimized database connections
- **Caching Layer**: Strategic data caching

### Frontend Optimizations
- **Code Splitting**: Automated route-based splitting
- **Component Memoization**: React optimization patterns
- **Lazy Loading**: Deferred component loading
- **Bundle Optimization**: Tree shaking and minification

## 🧪 Testing & Quality Assurance

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code style enforcement
- **Error Boundaries**: Component-level error handling
- **Logging System**: Comprehensive application logging

### Monitoring
- **Health Checks**: System status endpoints
- **Error Tracking**: Centralized error logging
- **Performance Monitoring**: Response time tracking
- **Database Health**: Connection status monitoring

## 📝 Recent Improvements

### Latest Features
- **Enhanced Export System**: Improved CSV/Excel generation
- **Global Search**: Multi-entity search functionality
- **Mobile Optimization**: Responsive design improvements
- **Alliance Analytics**: Advanced team performance metrics

### Architecture Enhancements
- **Error Handling**: Comprehensive error boundary system
- **Loading States**: Improved user feedback systems
- **Code Organization**: Modular service architecture
- **Performance**: Optimized database queries and caching

## 🔮 Future Considerations

### Planned Enhancements
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Machine learning insights
- **API Rate Limiting**: Enhanced security measures
- **Audit Logging**: Complete action tracking

### Scalability Preparations
- **Microservices**: Service decomposition planning
- **CDN Integration**: Static asset optimization
- **Database Sharding**: Large-scale data handling
- **Monitoring**: Advanced observability tools

---

*This codebase overview provides a comprehensive understanding of the Player Tracker application architecture, features, and implementation details. For specific implementation guidance, refer to CLAUDE.md and the individual service documentation.*