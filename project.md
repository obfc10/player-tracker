# Player Data Tracking System - Web Application Development Prompt

## Project Overview
Convert an existing HTML-based player data tracking system into a full-stack web application with backend file processing, user authentication, and role-based access control.

## Current System Status
- **Existing**: Fully functional HTML/JavaScript application with Chart.js visualizations
- **Current Processing**: Local browser-based Excel file processing
- **Functionality**: Complete player tracking, progress analysis, alliance monitoring, and data export

## Data Structure Requirements

### Excel File Format
- **Filename Format**: `671_YYYYMMDD_HHMMutc.xlsx` (e.g., `671_20250810_2040utc.xlsx`)
- **File Structure**: 3 sheets - "Summary", "Top 10", "671" (main data)
- **Data Location**: Sheet "671" contains player records starting from row 2
- **Records Per File**: ~600 player records per snapshot

### Complete Column Structure (39 fields)
**Must implement ALL columns from Excel files:**

1. **Lord ID** - Unique player identifier
2. **Name** - Player display name
3. **Division** - Kingdom/server number
4. **Alliance ID** - Numerical alliance identifier
5. **Alliance Tag** - Alliance abbreviation
6. **Current Power** - Primary power metric
7. **Power** - Secondary power metric
8. **Merits** - Player merit points
9. **Units Killed** - Total enemy units eliminated
10. **Units Dead** - Player's unit losses
11. **Units Healed** - Medical/healing statistics
12. **T1 Kill Count** - Tier 1 unit kills
13. **T2 Kill Count** - Tier 2 unit kills
14. **T3 Kill Count** - Tier 3 unit kills
15. **T4 Kill Count** - Tier 4 unit kills
16. **T5 Kill Count** - Tier 5 unit kills
17. **Building Power** - Infrastructure power
18. **Hero Power** - Hero-related power
19. **Legion Power** - Legion/army power
20. **Tech Power** - Technology research power
21. **Victories** - Battle wins
22. **Defeats** - Battle losses
23. **City Sieges** - Siege participation
24. **Scouted** - Reconnaissance missions
25. **Helps Given** - Alliance assistance provided
26. **Gold** - Current gold resources
27. **Gold Spent** - Total gold expenditure
28. **Wood** - Current wood resources
29. **Wood Spent** - Total wood expenditure
30. **Ore** - Current ore resources
31. **Ore Spent** - Total ore expenditure
32. **Mana** - Current mana resources
33. **Mana Spent** - Total mana expenditure
34. **Gems** - Current gem resources
35. **Gems Spent** - Total gem expenditure
36. **Resources Given** - Resources donated to alliance
37. **Resources Given Count** - Number of resource donations
38. **City Level** - Player's city development level
39. **Faction** - Player's chosen faction

## Technical Requirements

### Backend Specifications
- **File Upload**: Secure Excel (.xlsx/.xls) file processing
- **Filename Parsing**: Extract timestamp from `671_YYYYMMDD_HHMMutc` format
- **Data Processing**: Parse Excel files, extract "671" sheet data starting from row 2
- **Database Storage**: Store historical snapshots with timestamp association
- **API Endpoints**: RESTful APIs for frontend data consumption
- **Authentication**: JWT-based user authentication system
- **Role Management**: Admin vs. Viewer access control

- **Frontend Requirements (Maintain Existing Features)**
- **Dashboard Tabs**: 
  - Overview (alliance distribution charts)
  - Players (searchable/sortable table with all 39 columns)
  - Progress (individual player tracking over time)
  - Leaderboard (customizable rankings)
  - Changes (period-over-period analysis)
  - Alliance Moves (alliance change tracking)
  - Name Changes (player name history)
  - **Player Cards** (comprehensive individual player profiles)

### Player Card System Requirements

#### Player Card Access Methods
- **Click from Players Table**: Click any player row to open their card
- **Search Integration**: Direct player card access from search results
- **Quick Access**: Player card links from all charts and tables
- **URL Sharing**: Direct links to specific player cards

#### Player Card Content Structure

**Header Section**:
- Current player name with name change history
- Lord ID and current alliance tag
- Current power ranking within alliance and kingdom
- Last seen date and activity status

**Statistics Dashboard** (organized in card sections):

1. **Power Breakdown Card**
   - Current Total Power (primary metric)
   - Power composition pie chart:
     - Building Power
     - Hero Power  
     - Legion Power
     - Tech Power
   - Power trend over time (line chart)

2. **Combat Statistics Card**
   - Units Killed vs Units Dead comparison
   - Kill breakdown by tier (T1-T5) in bar chart
   - Victories/Defeats ratio
   - Combat efficiency metrics
   - Units Healed statistics

3. **Resource Management Card**
   - Current resources (Gold, Wood, Ore, Mana, Gems)
   - Total spent vs current holdings
   - Resource spending efficiency analysis
   - Resource donation history (Resources Given)

4. **Activity & Engagement Card**
   - Helps Given trend over time
   - City Sieges participation
   - Scouting missions completed
   - Alliance contribution metrics
   - City Level progression

5. **Alliance History Card**
   - Complete alliance movement timeline
   - Time spent in each alliance
   - Power changes during alliance transitions
   - Alliance loyalty indicators

6. **Historical Timeline**
   - Interactive timeline showing all data points
   - Major milestone markers (power thresholds, alliance changes)
   - Comparative analysis against kingdom averages

#### Interactive Features
- **Time Range Selector**: View data for specific periods
- **Comparison Mode**: Compare player against alliance/kingdom averages
- **Export Options**: Export player card as PDF or detailed CSV
- **Share Function**: Generate shareable player profile links
- **Mobile Optimization**: Responsive design for mobile viewing

#### Performance Metrics Calculations
- **Growth Rates**: Power, merits, combat stats over time
- **Efficiency Scores**: Resource usage, combat effectiveness
- **Activity Levels**: Based on helps given, participation metrics
- **Alliance Impact**: Contribution to alliance statistics

- **Interactive Features**:
  - Search by player name or Lord ID
  - Alliance filtering
  - Sortable columns
  - Click-to-drill-down functionality
  - Chart.js visualizations
  - Data export capabilities
  - **Player Card System** (detailed individual player profiles)

### User Role Requirements

#### Admin Users
- **File Management**: Upload new Excel data files
- **User Management**: Create/manage viewer accounts
- **Data Control**: Delete/modify historical data
- **System Access**: Full dashboard functionality including player cards
- **Export Rights**: Download complete datasets and player profiles
- **Player Card Admin**: Access to all player cards and historical data

#### Viewer Users
- **Read-Only Access**: View all dashboard tabs, charts, and player cards
- **Search/Filter**: Use all search and filtering features
- **Limited Export**: Basic chart/table exports, player card PDFs
- **Player Card Access**: View any player card with full historical data
- **No File Upload**: Cannot add new data
- **No User Management**: Cannot create accounts

## Technical Implementation Preferences

### Deployment Options (in order of preference)
1. **No-Code Solution**: Airtable + interface builder, Retool, or Bubble
2. **Low-Code Backend**: Firebase/Supabase + React/Vue frontend
3. **Full Development**: Node.js/Python backend + modern frontend framework

### Key Requirements
- **Plug-and-Play**: Minimal technical maintenance
- **Scalable**: Support multiple concurrent users
- **Secure**: Proper authentication and file upload security
- **Fast**: Quick data loading and chart rendering
- **Mobile-Friendly**: Responsive design

## Data Processing Specifications

### File Processing Logic
```
1. Parse filename: 671_YYYYMMDD_HHMMutc.xlsx
2. Extract timestamp and kingdom ID
3. Read "671" sheet starting from row 2
4. Map all 39 columns to database fields
5. Store as timestamped snapshot
6. Update player historical records
7. Trigger frontend data refresh
```

### Historical Data Management
- Track player name changes over time
- Monitor alliance movements and changes
- Calculate period-over-period statistics
- Maintain complete audit trail of all uploads

## Success Metrics
- **Functionality**: 100% feature parity with existing HTML system
- **Performance**: Dashboard loads in <3 seconds
- **Usability**: Intuitive admin file upload process
- **Security**: Secure user authentication and role enforcement
- **Reliability**: 99%+ uptime with automated backups

## Budget and Timeline
- **Budget Range**: $500-$5000 (depending on solution complexity)
- **Timeline**: 2-4 weeks for implementation
- **Maintenance**: <$50/month ongoing costs preferred

## Deliverables Required
1. **Technical Architecture**: Complete system design document
2. **Implementation Plan**: Step-by-step development roadmap
3. **User Documentation**: Admin and viewer user guides
4. **Deployment Guide**: Production setup instructions
5. **Maintenance Manual**: Ongoing support requirements

## Additional Considerations
- **Data Migration**: Preserve ability to import historical Excel files
- **Backup Strategy**: Automated data backups and recovery
- **Error Handling**: Graceful handling of malformed Excel files
- **Logging**: Comprehensive audit logs for file uploads and user actions
- **API Documentation**: Complete API specification for future integrations

Would you prefer a specific implementation approach (no-code, low-code, or full development) with detailed technical specifications?