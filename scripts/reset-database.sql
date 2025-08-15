-- Reset Neon Database Script
-- This will drop all tables, functions, and reset the database to a clean state

-- Drop all tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS "AllianceChange" CASCADE;
DROP TABLE IF EXISTS "NameChange" CASCADE;
DROP TABLE IF EXISTS "PlayerSnapshot" CASCADE;
DROP TABLE IF EXISTS "Player" CASCADE;
DROP TABLE IF EXISTS "Snapshot" CASCADE;
DROP TABLE IF EXISTS "Upload" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop any remaining sequences
DROP SEQUENCE IF EXISTS "Player_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "Upload_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "User_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "Snapshot_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "PlayerSnapshot_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "NameChange_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "AllianceChange_id_seq" CASCADE;

-- Drop any custom types if they exist
DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "UploadStatus" CASCADE;

-- Clean up any remaining objects
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Reset ownership and permissions
GRANT ALL ON SCHEMA public TO neondb_owner;
GRANT ALL ON SCHEMA public TO public;