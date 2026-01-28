-- Delete duplicate upper-body in-season sessions
-- Keep the most recent one (bac6d0a4-44e9-42ca-b360-902f3bd53d13)
-- Delete the other 3 duplicates

-- Soft delete (set is_active to false) for the duplicate sessions
UPDATE solo_sessions
SET is_active = false
WHERE id IN (
  '059b6660-3913-4868-8d61-c82f353bf38c',
  '4747c54b-f3da-4496-9105-085d74a8980d',
  '3808cc3e-83a6-40f8-af95-087bc2fbe4d8'
)
AND skill = 'upper-body'
AND period = 'in-season'
AND (sub_skill IS NULL OR sub_skill = '');

-- Verify the update
SELECT 
  id, 
  skill, 
  period, 
  sub_skill, 
  is_active, 
  created_at
FROM solo_sessions
WHERE skill = 'upper-body' 
  AND period = 'in-season'
  AND (sub_skill IS NULL OR sub_skill = '')
ORDER BY created_at DESC;
