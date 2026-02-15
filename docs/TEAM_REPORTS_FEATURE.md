# AI-Powered Team Member Reports

This feature enables organization leaders to generate comprehensive AI-powered performance reports for team members using Google Gemini LLM.

## Overview

Organization leads can generate detailed performance reports that analyze:
- **Decision-making patterns**: Lifecycle states, frequency trends, quality metrics
- **Assumptions & constraints usage**: Risk management effectiveness, validation practices
- **Collaboration metrics**: Conflict resolution, dependencies, team participation
- **Performance insights**: Response times, proactivity scores, invalidation rates

Reports are generated in Markdown format, displayed in a modal, and cached for 24 hours to reduce API costs.

## Features

### For Organization Leads
- **Generate Reports**: Click "Generate Report" button next to any team member on the Team page
- **AI Analysis**: Comprehensive analysis powered by Google Gemini 1.5 Flash
- **Markdown Display**: Beautiful formatted reports with syntax highlighting
- **Download**: Export reports as Markdown files for offline viewing
- **Smart Caching**: Reports cached for 24 hours (indicated with "Cached" badge)
- **Date Range**: Default 30-day analysis window

### Report Sections
1. **Executive Summary** - Overall assessment and key findings
2. **Decision-Making Patterns** - Analysis of decision quality and frequency
3. **Risk Management & Assumptions** - Assumption validation and risk handling
4. **Collaboration & Teamwork** - Team participation and conflict resolution
5. **Performance Highlights** - Key achievements and strengths
6. **Areas for Development** - Improvement opportunities
7. **Overall Rating & Conclusion** - Holistic assessment

## Setup Instructions

### 1. Database Migration

Run the migration to create the reports caching table:

```sql
-- Execute backend/migrations/012_add_team_member_reports.sql in Supabase
```

This creates:
- `team_member_reports` table for caching
- Row-Level Security policies (leads only)
- Automatic cleanup function for expired reports

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install the new `@google/generative-ai` package.

### 3. Get Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

**Free Tier Limits:**
- 15 requests per minute (RPM)
- 1 million tokens per minute (TPM)
- 1500 requests per day (RPD)

### 4. Configure Environment Variables

Add to `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5. Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install the new `react-markdown` package for rendering reports.

### 6. Restart Services

```bash
# Backend
cd backend
npm run dev

# Frontend (in separate terminal)
cd frontend
npm run dev
```

## Usage

1. **Login as Organization Lead**
2. **Navigate to Team Page** (sidebar menu)
3. **Click "Generate Report"** next to any team member
4. **Wait for AI generation** (typically 5-15 seconds)
5. **View the report** in the modal
6. **Optional**: Download as Markdown file

## Architecture

```
User clicks "Generate Report"
    ↓
TeamPage.jsx
    ↓
TeamMemberReportModal.jsx (displays loading)
    ↓
api.generateTeamMemberReport(userId)
    ↓
POST /api/reports/team-member
    ↓
ReportController.generateTeamMemberReport()
    ├─→ Check cache (team_member_reports table)
    │   └─→ If found and valid, return cached report ✅
    └─→ If not cached:
        ├─→ TeamReportDataAggregator.aggregateTeamMemberMetrics()
        │   └─→ Query decisions, assumptions, conflicts, etc.
        ├─→ LLMService.generateTeamMemberReport(metrics)
        │   └─→ Call Google Gemini API
        └─→ Cache report in database (expires in 24h)
```

## API Endpoints

### Generate Team Member Report
```
POST /api/reports/team-member
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "userId": "uuid-of-team-member",
  "startDate": "2024-01-01T00:00:00Z", // optional, defaults to 30 days ago
  "endDate": "2024-01-31T23:59:59Z"     // optional, defaults to now
}

Response:
{
  "report": "# Performance Report\n\n...",
  "generatedAt": "2024-01-31T12:00:00Z",
  "metricsSnapshot": {
    "totalDecisions": 15,
    "averageHealthSignal": 85,
    "riskManagementScore": 78,
    "proactivityScore": 82
  },
  "cached": false
}
```

**Permissions**: Only organization leads can generate reports

**Rate Limits**: Respects Google Gemini free tier limits (15 RPM, 1500 RPD)

**Caching**: Reports cached for 24 hours per user

## Database Schema

### team_member_reports Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Organization reference |
| user_id | UUID | Team member being reported on |
| generated_by | UUID | Lead who generated the report |
| report_markdown | TEXT | Full markdown report |
| start_date | TIMESTAMPTZ | Report period start |
| end_date | TIMESTAMPTZ | Report period end |
| generated_at | TIMESTAMPTZ | Generation timestamp |
| expires_at | TIMESTAMPTZ | Cache expiry (24h) |
| metrics_snapshot | JSONB | Quick metrics summary |

## Metrics Collected

### Decision Patterns
- Total decisions in period
- Lifecycle distribution (STABLE, UNDER_REVIEW, AT_RISK, INVALIDATED, RETIRED)
- Average health signal
- Frequency trend (increasing/stable/decreasing)
- Quality trend (improving/stable/declining)

### Assumptions Usage
- Total assumptions created
- Status distribution (VALID, SHAKY, BROKEN)
- Average validation time
- Risk management score (0-100)

### Collaboration Metrics
- Conflicts involved/resolved
- Violations detected
- Dependencies created
- Reviews performed

### Performance Insights
- Average time to decision
- Review frequency (per month)
- Invalidation rate
- Proactivity score (0-100)

## Troubleshooting

### "Failed to generate report"
- **Check Gemini API key** in backend `.env`
- **Verify API quota**: Check [Google AI Studio](https://aistudio.google.com/) for remaining quota
- **Check logs**: Look at backend console for detailed error messages

### Report loads slowly
- **Normal**: First-time generation takes 5-15 seconds
- **Cached**: Subsequent loads within 24h are instant
- **Network**: Gemini API response time varies (typically 3-10s)

### "Forbidden" error
- **Permission denied**: Only organization leads can generate reports
- **Check role**: Verify user role is 'lead' in database

### Cache not working
- **Check table**: Verify `team_member_reports` table exists
- **RLS policies**: Ensure RLS policies are correctly set up
- **Expiry**: Cache expires after 24 hours automatically

## Cost Management

- **Free Tier**: Google Gemini 1.5 Flash is free (15 RPM, 1500 RPD)
- **Caching**: 24-hour cache dramatically reduces API calls
- **Typical usage**: ~100-200 reports/month uses <10% of free quota
- **Monitoring**: Track usage at [Google AI Studio](https://aistudio.google.com/)

## Future Enhancements

Potential improvements:
- [ ] PDF export option
- [ ] Custom date range selector in UI
- [ ] Email report delivery
- [ ] Scheduled automatic reports
- [ ] Comparative reports (team member vs team average)
- [ ] Historical trend tracking
- [ ] Custom metrics configuration
- [ ] Multi-language support

## Security

- **RLS Policies**: Only organization leads can view/generate reports
- **API Key**: Stored securely in backend environment
- **Access Control**: Per-organization isolation
- **Cache**: Automatic cleanup of expired reports
- **Audit Trail**: `generated_by` field tracks report creators

## Performance

- **First Generation**: 5-15 seconds (LLM processing)
- **Cached Reports**: <100ms (database lookup)
- **Cache Duration**: 24 hours
- **Database Impact**: Minimal (lightweight JSONB metrics)
- **LLM Model**: Gemini 1.5 Flash (optimized for speed)

## Support

For issues or questions:
1. Check backend logs (`npm run dev` output)
2. Verify Gemini API key and quota
3. Review database migration status
4. Check browser console for frontend errors
