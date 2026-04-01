-- One-time migration: enforce one vote per user per category.
-- Run this against an existing database where votes table already exists.

BEGIN;

-- If duplicates already exist for the same user/category, keep the earliest row.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, category
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM votes
)
DELETE FROM votes v
USING ranked r
WHERE v.id = r.id
  AND r.rn > 1;

-- Drop old uniqueness constraint if present (usually votes_user_id_finalist_id_key).
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname
    INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'votes'
      AND con.contype = 'u'
      AND con.conname = 'votes_user_id_finalist_id_key';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add required constraint for one vote per category.
ALTER TABLE votes
ADD CONSTRAINT votes_user_id_category_key UNIQUE (user_id, category);

COMMIT;
