# Quick Setup Guide - AI-Powered Team Reports

Follow these steps to enable the team member report generation feature:

## Step 1: Run Database Migration

1. Open your Supabase SQL Editor
2. Copy and paste the contents of `backend/migrations/012_add_team_member_reports.sql`
3. Execute the SQL script
4. Verify success message in output

## Step 2: Get Google Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key" 
4. Copy the generated key

**Note:** The free tier includes:
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per minute

## Step 3: Install Backend Dependencies

```bash
cd backend
npm install
```

This installs the `@google/generative-ai` package.

## Step 4: Configure Backend Environment

Add to your `backend/.env` file:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

## Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install
```

This installs the `react-markdown` package for report rendering.

## Step 6: Restart Services

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Step 7: Test the Feature

1. Login as an **Organization Lead**
2. Navigate to **Team** page (sidebar)
3. Click **"Generate Report"** button next to any team member
4. Wait ~5-15 seconds for AI generation
5. View the comprehensive performance report
6. Click **Download** to save as Markdown file

## Verification Checklist

- [ ] Database migration executed successfully
- [ ] `team_member_reports` table exists in Supabase
- [ ] Gemini API key added to backend `.env`
- [ ] Backend dependencies installed (`@google/generative-ai`)
- [ ] Frontend dependencies installed (`react-markdown`)
- [ ] Both services running without errors
- [ ] Logged in as organization lead
- [ ] "Generate Report" button visible on Team page
- [ ] Report generates successfully
- [ ] Report displays in modal with formatting
- [ ] Download button works

## Troubleshooting

### Cannot see "Generate Report" button
- Must be logged in as **Organization Lead** (not regular member)
- Check user role in database: `SELECT role FROM users WHERE id = 'your-user-id'`

### "Failed to generate report" error
- Verify `GEMINI_API_KEY` is set correctly in `backend/.env`
- Check backend logs for detailed error
- Verify Gemini API key is valid at https://aistudio.google.com

### Backend won't start
- Run `npm install` in backend folder again
- Check for TypeScript errors: `npm run build`
- Verify all environment variables are set

### Report shows loading forever
- Check backend is running on port 3001
- Check browser console for network errors
- Verify API key has remaining quota at Google AI Studio

## What Happens Next

Once setup is complete:

1. **First request**: Takes 5-15 seconds (generates fresh report)
2. **Cached requests**: Instant (valid for 24 hours)
3. **Reports automatically expire**: After 24 hours, next request generates fresh report
4. **No maintenance needed**: Automatic cleanup of expired reports

## Support

If you encounter issues:
1. Check both terminal outputs (backend & frontend)
2. Review browser console (F12)
3. Verify database migration completed
4. Check Gemini API quota and key validity
5. Review logs in `docs/TEAM_REPORTS_FEATURE.md` for detailed troubleshooting

## Next Steps

- Generate reports for all team members to test
- Monitor Gemini API usage at https://aistudio.google.com
- Explore report insights to understand team performance
- Download reports for offline analysis

---

**Estimated setup time:** 10-15 minutes

**Feature ready!** 🎉
