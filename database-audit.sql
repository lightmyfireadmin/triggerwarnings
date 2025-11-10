-- =====================================================
-- COMPREHENSIVE DATABASE SCHEMA AUDIT
-- Run this in Supabase SQL Editor to get complete schema info
-- =====================================================

-- 1. ALL TABLES WITH COLUMNS
SELECT
  '=== TABLES & COLUMNS ===' as section,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. PRIMARY KEYS
SELECT
  '=== PRIMARY KEYS ===' as section,
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 3. FOREIGN KEYS & RELATIONSHIPS
SELECT
  '=== FOREIGN KEYS ===' as section,
  tc.table_name as from_table,
  kcu.column_name as from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. UNIQUE CONSTRAINTS
SELECT
  '=== UNIQUE CONSTRAINTS ===' as section,
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. CHECK CONSTRAINTS
SELECT
  '=== CHECK CONSTRAINTS ===' as section,
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 6. INDEXES
SELECT
  '=== INDEXES ===' as section,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
SELECT
  '=== RLS POLICIES ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. CUSTOM TYPES & ENUMS
SELECT
  '=== CUSTOM TYPES ===' as section,
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 9. CUSTOM FUNCTIONS
SELECT
  '=== FUNCTIONS ===' as section,
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- 10. TRIGGERS
SELECT
  '=== TRIGGERS ===' as section,
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 11. ROLES & GRANTS
SELECT
  '=== TABLE GRANTS ===' as section,
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- 12. SEQUENCES
SELECT
  '=== SEQUENCES ===' as section,
  sequence_schema,
  sequence_name,
  data_type,
  start_value,
  minimum_value,
  maximum_value,
  increment,
  cycle_option
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 13. TABLE STATISTICS (row counts)
SELECT
  '=== TABLE STATISTICS ===' as section,
  schemaname,
  relname as table_name,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 14. CURRENT SCHEMA VERSION (if using migrations)
SELECT
  '=== SCHEMA VERSION ===' as section,
  version,
  description,
  installed_on
FROM public.schema_migrations
ORDER BY installed_on DESC
LIMIT 10;

-- Note: If schema_migrations table doesn't exist, this will error - that's expected

-- 15. SUMMARY
SELECT
  '=== SUMMARY ===' as section,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public') as total_columns,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_rls_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f') as total_functions;
