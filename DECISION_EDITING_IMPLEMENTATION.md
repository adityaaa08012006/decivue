# Decision Editing & Enhanced Version Tracking - Implementation Summary

## Overview

Implemented comprehensive decision editing with approval workflow and enhanced version history tracking. This includes:

1. **Decision Editing with Role-Based Workflow**
   - Team members can request edits (requires approval)
   - Team leads can edit directly (no approval needed)
   - All edits tracked in version history

2. **Enhanced Version History**
   - Shows edit requests and approvals
   - Displays conflict resolutions (assumption & decision)
   - Shows lock/unlock governance events
   - Complete audit trail of all decision changes

## Architecture

### Backend (Already Existed in Migration 027)

The governance system from migration 027 already provides:

- `can_edit_decision()` - Check if user can edit
- `request_edit_approval()` - Submit edit request
- `resolve_edit_request()` - Approve/reject edits
- `governance_audit_log` table tracking all governance events

### New Migration 029 - Enhanced Version History

**File**: `backend/migrations/029_enhance_version_history.sql`

**Changes**:

1. Updated `get_decision_version_history()` function to include:
   - Edit governance events (requested, approved, rejected)
   - Lock/unlock events
   - Conflict resolutions (from migration 026)

2. Created `pending_edit_requests` view for easy querying of pending approvals

### Frontend Components

#### 1. Edit Decision Modal

**File**: `frontend/src/components/EditDecisionModal.jsx`

**Features**:

- Form to edit title, description, category
- Mandatory edit reason field (min 10 characters)
- Different behavior for members vs leads:
  - **Team Members**: Shows "Submit for Approval" button, calls `api.requestEditApproval()`
  - **Team Leads**: Shows "Apply Changes" button, calls `api.updateDecision()`
- Real-time change detection
- Changed fields summary

#### 2. Decision Monitoring Updates

**File**: `frontend/src/components/DecisionMonitoring.jsx`

**Changes**:

- Added Edit button next to Lock button
- Edit button disabled for:
  - Retired decisions
  - Locked decisions (unless user is team lead)
- Button tooltip indicates approval requirement for members

#### 3. Version History Modal Updates

**File**: `frontend/src/components/DecisionVersionsModal.jsx`

**Changes**:

- Added icons for new event types:
  - `edit_requested` - Edit icon (yellow)
  - `edit_approved` - CheckCircle icon (green)
  - `edit_rejected` - XCircle icon (red)
  - `assumption_conflict_resolved` - Shield icon (purple)
  - `decision_conflict_resolved` - Shield icon (purple)
- Enhanced rendering logic to display:
  - Edit request justifications
  - Proposed changes (JSON preview)
  - Conflict resolution details (type, action, notes)
  - Governance lock/unlock justifications

## API Endpoints (Already Existed)

All endpoints already existed in backend:

```javascript
// Check if user can edit
api.checkEditPermission(decisionId, justification);

// Request edit approval (for members)
api.requestEditApproval(decisionId, justification, proposedChanges);

// Approve/reject edit request (for leads)
api.resolveEditRequest(auditId, approved, reviewerNotes);

// Get pending approvals (for leads)
api.getPendingApprovals();

// Get governance audit log
api.getGovernanceAudit(decisionId);
```

## Database Schema

### governance_audit_log Table (From Migration 027)

```sql
- id: UUID
- decision_id: UUID
- organization_id: UUID
- action: TEXT (edit_requested, edit_approved, edit_rejected, decision_locked, decision_unlocked)
- requested_by: UUID
- approved_by: UUID
- justification: TEXT
- new_state: JSONB (proposed changes)
- resolved_at: TIMESTAMPTZ
- metadata: JSONB
```

### decision_versions Table (From Migration 026)

```sql
- id: UUID
- decision_id: UUID
- version_number: INTEGER
- change_type: TEXT (now includes conflict resolution types)
- change_summary: TEXT
- changed_fields: JSONB
- changed_by: UUID
- review_comment: TEXT
- metadata: JSONB (includes conflict details)
```

## Version History Event Types

### 1. Regular Decision Changes

- `created` - Decision first created
- `field_updated` - Fields changed
- `lifecycle_changed` - Lifecycle state changed

### 2. Governance Events (Migration 029)

- `governance_lock` - Decision locked by team lead
- `governance_unlock` - Decision unlocked by team lead
- `edit_requested` - Member requested edit (pending approval)
- `edit_approved` - Team lead approved edit request
- `edit_rejected` - Team lead rejected edit request

### 3. Conflict Resolutions (Migration 026)

- `assumption_conflict_resolved` - Assumption conflict resolved
- `decision_conflict_resolved` - Decision conflict resolved

### 4. Reviews

- `manual_review` - Decision manually reviewed

## Testing Instructions

### 1. Apply Migration 029

```bash
cd backend
npx tsx scripts/apply-migration-029.ts
npx tsx scripts/verify-migration-029.ts
```

### 2. Test Edit Workflow as Team Member

1. Login as a regular team member (not a lead)
2. Go to Decision Monitoring
3. Click the Edit button on any decision
4. Modify title, description, or category
5. Provide edit reason (minimum 10 characters)
6. Click "Submit for Approval"
7. Check version history - should show "Edit Requested" event

### 3. Test Edit Approval as Team Lead

1. Login as a team lead
2. Go to Dashboard
3. Check "Pending Approvals" section
4. Should see the edit request from step 2
5. Click "Approve" button
6. Provide reviewer notes (optional)
7. Check the decision - changes should be applied
8. Check version history - should show "Edit Approved" event

### 4. Test Direct Edit as Team Lead

1. Login as a team lead
2. Go to Decision Monitoring
3. Click Edit button on any decision
4. Modify fields and provide reason
5. Click "Apply Changes"
6. Changes should apply immediately
7. Check version history - should show "Field Updated" event

### 5. Test Conflict Resolution Tracking

**Assumption Conflict:**

1. Create two conflicting assumptions
2. Run conflict detection
3. Resolve the conflict (choose resolution action)
4. Check version history of affected decisions
5. Should see "Assumption Conflict Resolved" event with details

**Decision Conflict:**

1. Create two conflicting decisions
2. Run conflict detection
3. Resolve the conflict
4. Check version history of affected decisions
5. Should see "Decision Conflict Resolved" event with details

### 6. Test Lock/Unlock Tracking

1. Login as team lead
2. Lock a decision (provide reason)
3. Check version history - should show "Decision Locked" with justification
4. Unlock the decision
5. Check version history - should show "Decision Unlocked"

## UI Features

### Edit Button States

- **Enabled (Members)**: "Edit decision (requires approval)"
- **Enabled (Leads)**: "Edit decision (direct - no approval needed)"
- **Disabled (Retired)**: "Cannot edit retired decisions"
- **Disabled (Locked)**: "Decision is locked (team lead access only)"

### Edit Modal Behavior

- Shows info banner explaining approval requirement
- Yellow banner for members: "Your edit request will be sent to a team lead"
- Blue banner for leads: "Your changes will be applied immediately"
- Real-time validation of edit reason (min 10 chars)
- Shows changed fields summary before submission

### Version History Display

- **Edit Requested**: Yellow badge, shows justification and proposed changes
- **Edit Approved**: Green badge, shows reviewer and proposed changes
- **Edit Rejected**: Red badge, shows rejection reason
- **Conflict Resolved**: Purple badge, shows conflict type and resolution
- **Lock/Unlock**: Gray/green badges, shows justification

## Benefits

1. **Full Audit Trail**: Every change tracked with who, when, why
2. **Governance Control**: Leads have oversight of all edits
3. **Conflict Visibility**: Conflict resolutions clearly documented
4. **Role-Based Access**: Members need approval, leads don't
5. **Transparency**: Complete history visible to all team members

## Future Enhancements

1. **Batch Edit Approval**: Approve multiple edits at once
2. **Edit Diff View**: Visual diff of proposed vs current values
3. **Comment Thread**: Discussion on edit requests
4. **Edit Templates**: Common edit patterns for quick application
5. **Rollback**: Revert to previous version
6. **Compare Versions**: Side-by-side comparison of any two versions

## Files Modified/Created

### Backend

- `backend/migrations/029_enhance_version_history.sql` (NEW)
- `backend/scripts/apply-migration-029.ts` (NEW)
- `backend/scripts/verify-migration-029.ts` (NEW)

### Frontend

- `frontend/src/components/EditDecisionModal.jsx` (NEW)
- `frontend/src/components/DecisionMonitoring.jsx` (MODIFIED)
- `frontend/src/components/DecisionVersionsModal.jsx` (MODIFIED)

### Existing Infrastructure Used

- `backend/migrations/027_adaptive_review_and_governance.sql` (governance system)
- `backend/migrations/026_add_review_and_conflict_tracking.sql` (conflict tracking)
- `backend/src/api/controllers/decision-controller.ts` (edit endpoints)
- `frontend/src/services/api.js` (API methods)

## Conclusion

The implementation leverages existing governance infrastructure while adding comprehensive version history tracking. All decision changes, edit requests, approvals, and conflict resolutions are now visible in a unified timeline, providing complete transparency and auditability.

**Status**: ✅ Implementation complete, ready for testing
**Migration**: Ready to apply (029_enhance_version_history.sql)
**Frontend**: Edit button and modal integrated
**Backend**: Using existing governance APIs from migration 027
