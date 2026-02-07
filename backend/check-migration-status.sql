-- Quick check - Run this in Supabase SQL Editor
-- This will tell us what steps are complete

-- 1. Check if scope column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assumptions' AND column_name = 'scope'
        ) 
        THEN '✅ Scope column exists' 
        ELSE '❌ Need to run schema-updates.sql'
    END as scope_status;

-- 2. Check scope values
SELECT 
    scope,
    COUNT(*) as count,
    CASE 
        WHEN scope = 'UNIVERSAL' THEN '🌐 Shows on all decisions'
        WHEN scope = 'DECISION_SPECIFIC' THEN '📌 Decision-specific'
        ELSE '⚠️ NULL - needs migration'
    END as meaning
FROM assumptions
GROUP BY scope;

-- 3. Check which assumptions are unlinked
SELECT 
    id,
    description,
    scope,
    (SELECT COUNT(*) FROM decision_assumptions da WHERE da.assumption_id = a.id) as link_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM decision_assumptions da WHERE da.assumption_id = a.id) = 0 
        THEN '⚠️ UNLINKED - needs to be linked to a decision'
        ELSE '✅ Linked'
    END as status
FROM assumptions a
ORDER BY scope, description;

-- 4. Show all your decisions (you'll need these IDs to link assumptions)
SELECT id, title FROM decisions;
