-- ============================================
-- EUPHONY DATABASE SCHEMA
-- Run this in Neon SQL Editor to set up the database
-- ============================================

-- Drop existing tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS finalists CASCADE;
DROP TABLE IF EXISTS duets CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ============================================
-- FINALISTS TABLE
-- Stores all competition participants
-- ============================================
CREATE TABLE finalists (
    id SERIAL PRIMARY KEY,
    uuid_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    name TEXT NOT NULL,
    semester TEXT NOT NULL,
    department TEXT NOT NULL,
    track TEXT NOT NULL CHECK (track IN ('Eastern', 'Western')),
    round TEXT NOT NULL CHECK (round IN ('Duet', 'Solo')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_finalists_track_round ON finalists(track, round);
CREATE INDEX idx_finalists_uuid ON finalists(uuid_id);

-- ============================================
-- DUETS TABLE
-- Stores duet group information
-- ============================================
CREATE TABLE duets (
    id SERIAL PRIMARY KEY,
    duet_name TEXT NOT NULL,
    member1_id UUID REFERENCES finalists(uuid_id) ON DELETE CASCADE,
    member2_id UUID REFERENCES finalists(uuid_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOTES TABLE
-- Stores user votes with category tracking
-- ============================================
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    finalist_id INTEGER REFERENCES finalists(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('duet_eastern', 'duet_western', 'solo_eastern', 'solo_western')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Index for faster vote counting
CREATE INDEX idx_votes_finalist ON votes(finalist_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_category ON votes(category);

-- ============================================
-- ROLES TABLE
-- Stores user roles (admin/user)
-- ============================================
CREATE TABLE roles (
    user_id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    name TEXT,
    picture TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_email ON roles(email);

-- ============================================
-- SETTINGS TABLE
-- Stores voting status for each category
-- ============================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INITIAL SETTINGS DATA
-- All categories start disabled
-- ============================================
INSERT INTO settings (key, value) VALUES
    ('voting_duet_eastern', 'false'),
    ('voting_duet_western', 'false'),
    ('voting_solo_eastern', 'false'),
    ('voting_solo_western', 'false');

-- ============================================
-- SAMPLE DATA (Optional - Remove for production)
-- ============================================

-- Eastern Duet finalists (individual singers)
INSERT INTO finalists (name, semester, department, track, round, avatar_url) VALUES
    ('Rahul Sharma', 'S5', 'Computer Science', 'Eastern', 'Duet', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'),
    ('Priya Patel', 'S5', 'Computer Science', 'Eastern', 'Duet', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'),
    ('Amit Kumar', 'S3', 'Electronics', 'Eastern', 'Duet', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'),
    ('Neha Gupta', 'S3', 'Electronics', 'Eastern', 'Duet', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'),
    ('Vikram Singh', 'S7', 'Mechanical', 'Eastern', 'Duet', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'),
    ('Ananya Roy', 'S7', 'Mechanical', 'Eastern', 'Duet', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');

-- Western Duet finalists (individual singers)
INSERT INTO finalists (name, semester, department, track, round, avatar_url) VALUES
    ('John Smith', 'S5', 'Electrical', 'Western', 'Duet', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400'),
    ('Sarah Johnson', 'S5', 'Electrical', 'Western', 'Duet', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400'),
    ('Mike Wilson', 'S3', 'Civil', 'Western', 'Duet', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400'),
    ('Emma Davis', 'S3', 'Civil', 'Western', 'Duet', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400'),
    ('David Brown', 'S7', 'Computer Science', 'Western', 'Duet', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'),
    ('Lisa Anderson', 'S7', 'Computer Science', 'Western', 'Duet', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400');

-- Eastern Solo finalists
INSERT INTO finalists (name, semester, department, track, round, avatar_url) VALUES
    ('Rahul Sharma', 'S5', 'Computer Science', 'Eastern', 'Solo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'),
    ('Priya Patel', 'S3', 'Electronics', 'Eastern', 'Solo', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400'),
    ('Amit Kumar', 'S7', 'Mechanical', 'Eastern', 'Solo', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400');

-- Western Solo finalists
INSERT INTO finalists (name, semester, department, track, round, avatar_url) VALUES
    ('John Smith', 'S5', 'Electrical', 'Western', 'Solo', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400'),
    ('Sarah Johnson', 'S3', 'Civil', 'Western', 'Solo', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400'),
    ('Mike Wilson', 'S7', 'Computer Science', 'Western', 'Solo', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400');

-- ============================================
-- ADMIN SETUP
-- Add admin user (replace with your Google ID)
-- ============================================
-- INSERT INTO roles (user_id, email, role) VALUES
--     ('your-google-user-id-here', 'your-email@example.com', 'admin');
