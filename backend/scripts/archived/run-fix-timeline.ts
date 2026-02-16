import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

const fixSQL = `
DROP FUNCTION IF EXISTS get_decision_change_timeline(UUID);

CREATE OR REPLACE FUNCTION get_decision_change_timeline(p_decision_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_time TIMESTAMPTZ,
  event_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dv.id AS event_id,
    'version'::TEXT AS event_type,
    dv.changed_at AS event_time,
    jsonb_build_object(
      'version_number', dv.version_number,
      'change_type', dv.change_type,
      'change_summary', dv.change_summary,
      'changed_fields', dv.changed_fields,
      'changed_by', dv.changed_by,
      'user_name', u.full_name
    ) AS event_data
  FROM decision_versions dv
  LEFT JOIN users u ON dv.changed_by = u.id
  WHERE dv.decision_id = p_decision_id
  
  UNION ALL
  
  SELECT 
    drc.id AS event_id,
    'relation'::TEXT AS event_type,
    drc.changed_at AS event_time,
    jsonb_build_object(
      'relation_type', drc.relation_type,
      'action', drc.action,
      'relation_description', drc.relation_description,
      'reason', drc.reason,
      'changed_by', drc.changed_by,
      'user_name', u.full_name
    ) AS event_data
  FROM decision_relation_changes drc
  LEFT JOIN users u ON drc.changed_by = u.id
  WHERE drc.decision_id = p_decision_id
  
  UNION ALL
  
  SELECT 
    eh.id AS event_id,
    'evaluation'::TEXT AS event_type,
    eh.evaluated_at AS event_time,
    jsonb_build_object(
      'old_health_signal', eh.old_health_signal,
      'new_health_signal', eh.new_health_signal,
      'old_lifecycle', eh.old_lifecycle,
      'new_lifecycle', eh.new_lifecycle,
      'change_explanation', eh.change_explanation,
      'triggered_by', eh.triggered_by
    ) AS event_data
  FROM evaluation_history eh
  WHERE eh.decision_id = p_decision_id
  
  ORDER BY event_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function fixTimelineFunction() {
  console.log('🔧 Fixing get_decision_change_timeline function...\n');
  console.log('Note: You need to run this SQL in Supabase SQL Editor:\n');
  console.log('='.repeat(80));
  console.log(fixSQL);
  console.log('='.repeat(80));
  console.log('\nOr copy the SQL from scripts/fix-timeline-function.sql');
}

fixTimelineFunction();
