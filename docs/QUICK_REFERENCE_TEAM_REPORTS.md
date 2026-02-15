# Quick Reference - Team Member Reports

## 🚀 Generate a Report

```javascript
// Frontend API call
const report = await api.generateTeamMemberReport(userId);

// With custom date range
const report = await api.generateTeamMemberReport(
  userId, 
  '2024-01-01T00:00:00Z',  // startDate
  '2024-01-31T23:59:59Z'   // endDate
);
```

## 📝 API Endpoint

```http
POST /api/reports/team-member
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid",
  "startDate": "2024-01-01T00:00:00Z",  // optional
  "endDate": "2024-01-31T23:59:59Z"     // optional
}
```

## 🗄️ Database Query

```sql
-- Find all cached reports
SELECT user_id, generated_at, expires_at 
FROM team_member_reports 
WHERE organization_id = 'your-org-id'
AND expires_at > NOW();

-- Manually cleanup expired reports
DELETE FROM team_member_reports 
WHERE expires_at < NOW();

-- Get report for specific user
SELECT report_markdown, metrics_snapshot, cached
FROM team_member_reports
WHERE organization_id = 'org-id'
AND user_id = 'user-id'
AND expires_at > NOW()
ORDER BY generated_at DESC
LIMIT 1;
```

## 🎨 UI Integration

```jsx
// TeamPage.jsx - Add report button
{currentUser?.role === 'lead' && (
  <button onClick={() => handleGenerateReport(member)}>
    <FileText size={16} />
    Generate Report
  </button>
)}

// Show modal
{selectedUserForReport && (
  <TeamMemberReportModal
    user={selectedUserForReport}
    onClose={handleCloseReportModal}
  />
)}
```

## 🔑 Environment Variables

```env
# Backend .env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## 📦 Required Packages

```json
// Backend package.json
"@google/generative-ai": "^0.21.0"

// Frontend package.json  
"react-markdown": "^9.0.1"
```

## 🔒 Permissions

| Role | Can Generate | Can View |
|------|-------------|----------|
| Lead | ✅ Yes | ✅ Yes |
| Member | ❌ No | ❌ No |

## 📊 Metrics Structure

```typescript
interface TeamMemberMetrics {
  userId: string;
  userName: string;
  dateRange: { start: Date; end: Date };
  
  decisionPatterns: {
    totalDecisions: number;
    lifecycleDistribution: { STABLE, UNDER_REVIEW, AT_RISK, INVALIDATED, RETIRED };
    averageHealthSignal: number;
    frequencyTrend: "increasing" | "stable" | "decreasing";
    qualityTrend: "improving" | "stable" | "declining";
  };
  
  assumptionsUsage: {
    totalAssumptionsCreated: number;
    assumptionStatusDistribution: { VALID, SHAKY, BROKEN };
    averageValidationTime: number;
    riskManagementScore: number;
  };
  
  collaborationMetrics: {
    conflictsInvolved: number;
    conflictsResolved: number;
    violationsDetected: number;
    dependenciesCreated: number;
    reviewsPerformed: number;
  };
  
  performanceInsights: {
    averageTimeToDecision: number;
    reviewFrequency: number;
    invalidationRate: number;
    proactivityScore: number;
  };
}
```

## ⚡ Cache Info

- **Duration**: 24 hours
- **Key**: `organization_id` + `user_id`
- **Auto-cleanup**: Yes (via RLS policies)
- **Indicator**: "Cached" badge in UI

## 🐛 Debug Commands

```bash
# Check backend logs
cd backend && npm run dev

# Test Gemini connection
curl -X POST http://localhost:3001/api/reports/team-member \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id"}'

# View database table
psql> SELECT * FROM team_member_reports LIMIT 5;

# Check API quota
# Visit: https://aistudio.google.com/app/apikey
```

## 📈 Performance Benchmarks

| Scenario | Time |
|----------|------|
| First generation | 5-15s |
| Cached report | <100ms |
| Database query | <50ms |
| LLM API call | 3-10s |
| Markdown render | <50ms |

## 🎯 Common Use Cases

```javascript
// 1. Generate report for current period (default 30 days)
await api.generateTeamMemberReport(userId);

// 2. Generate quarterly report
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
await api.generateTeamMemberReport(userId, threeMonthsAgo, new Date());

// 3. Check if report is cached
const report = await api.generateTeamMemberReport(userId);
console.log(report.cached); // true or false

// 4. Download report
const blob = new Blob([report.report], { type: 'text/markdown' });
const url = URL.createObjectURL(blob);
// ... create download link
```

## 🚨 Error Handling

```javascript
try {
  const report = await api.generateTeamMemberReport(userId);
} catch (error) {
  if (error.message.includes('Forbidden')) {
    // User is not an organization lead
    alert('Only leads can generate reports');
  } else if (error.message.includes('quota')) {
    // Gemini API quota exceeded
    alert('Daily report limit reached. Try again tomorrow.');
  } else {
    // Generic error
    alert('Failed to generate report. Please try again.');
  }
}
```

## 📚 Related Files

- **Migration**: `backend/migrations/012_add_team_member_reports.sql`
- **LLM Service**: `backend/src/services/llm-service.ts`
- **Aggregator**: `backend/src/services/team-report-data-aggregator.ts`
- **Controller**: `backend/src/api/controllers/report-controller.ts`
- **Frontend Modal**: `frontend/src/components/TeamMemberReportModal.jsx`
- **API Service**: `frontend/src/services/api.js`

## 💡 Tips

1. **Cache Strategy**: Generate reports on-demand, not scheduled
2. **Date Range**: Stick to 30-90 days for meaningful insights
3. **API Quota**: Monitor at https://aistudio.google.com
4. **Performance**: First load is slow, subsequent loads instant
5. **Storage**: Markdown files are lightweight (~5-10KB)

---

For complete documentation, see `docs/TEAM_REPORTS_FEATURE.md`
