-- ============================================
-- COMPLETE SCHOOL MANAGEMENT SYSTEM SCHEMA
-- GHS NAWAKALAY (BARIKOT)
-- ============================================
-- VERSION HISTORY:
--   v2.0  Initial enhanced schema
--   v2.1  Added fine columns to attendance (fine_amount, fine_reason, fine_paid,
--         fine_paid_at), added is_farm_master to class_assignments,
--         added 'absence_fine' to fees.fee_type
--   v2.2  Added absence_reason to attendance
--         (leave/sick/unauthorized/suspended/other, default 'leave')
--   v2.3  Added class_teacher_id to classes (primary class teacher / farm master)
--         Added teacher_subjects table for subject→teacher assignments per class
--   v2.4  Added password column to users (custom auth — no Supabase Auth used,
--         default 'password123')
--         Added UNIQUE(user_id, start_date) on leave_requests for teacher
--         daily attendance upsert from principal dashboard
--         Added indexes: idx_classes_teacher, idx_attendance_fine,
--         idx_attendance_class_date
--   v2.5  Principal dashboard: Student Attendance tab (mark all classes) and
--         Teacher Attendance tab (daily register via leave_requests)
--         TeacherDashboard now resolves assigned class via class_teacher_id
--         (not class_assignments). Teacher login uses users table password.
--   v2.6  Student photo upload via Cloudflare R2.
--         Uses existing users.avatar_url column (no schema change needed).
--         Upload API: POST /api/upload (folder=students → R2 students/ prefix).
--         ImageUpload component: instant local preview, uploads to R2 on select,
--         capture="environment" on mobile opens camera directly.
-- ============================================

-- Drop existing tables in correct order (respecting foreign keys)
-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS marks CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS teacher_subjects CASCADE;
DROP TABLE IF EXISTS class_assignments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS exam_schedules CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;


-- ============================================
-- 1. USERS TABLE (extends Supabase Auth)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('principal', 'teacher', 'farm_master', 'student', 'parent')),
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  -- v2.4: plain-text password for custom auth (no Supabase Auth)
  --       default 'password123' for demo/new accounts
  password TEXT DEFAULT 'password123',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. PARENTS TABLE (for parent-student relationship)
-- ============================================
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  occupation TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. SUBJECTS TABLE (master list of subjects)
-- ============================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default subjects
INSERT INTO subjects (name, code, description) VALUES
  ('Mathematics', 'MATH101', 'Core Mathematics'),
  ('Science', 'SCI101', 'General Science'),
  ('English', 'ENG101', 'English Language & Literature'),
  ('Urdu', 'URD101', 'Urdu Language'),
  ('Islamiat', 'ISL101', 'Islamic Studies'),
  ('Computer Science', 'CS101', 'Computer Fundamentals'),
  ('Physics', 'PHY101', 'Physics'),
  ('Chemistry', 'CHE101', 'Chemistry'),
  ('Biology', 'BIO101', 'Biology'),
  ('Pakistan Studies', 'PST101', 'Pakistan Studies');

-- ============================================
-- 4. CLASSES TABLE
-- ============================================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level INT CHECK (grade_level BETWEEN 1 AND 12),
  description TEXT,
  -- v2.3: primary class teacher (farm master of this class)
  class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. SECTIONS TABLE
-- ============================================
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_number TEXT,
  capacity INT DEFAULT 30,
  current_strength INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class_id, name)
);

-- ============================================
-- 6. STUDENTS TABLE (enhanced)
-- ============================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  roll_number TEXT NOT NULL,
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  parent_id UUID REFERENCES parents(id),
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  medical_info TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class_id, roll_number)
);

-- ============================================
-- 7. TEACHER SUBJECT ASSIGNMENTS
--    Which teacher teaches which subject in which class.
--    section_id is nullable — assignment can be class-wide or section-specific.
-- ============================================
CREATE TABLE teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,  -- nullable: class-wide if null
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, section_id, subject_id)
);

-- ============================================
-- 8. CLASS ASSIGNMENTS (legacy - keeping for compatibility)
-- ============================================
CREATE TABLE class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  subject TEXT,
  -- v2.1: marks this teacher as the farm master (class incharge) for this class
  is_farm_master BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, section_id)
);

-- ============================================
-- 9. ATTENDANCE TABLE (enhanced)
-- ============================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'half_day', 'holiday')),
  marked_by UUID REFERENCES users(id),
  remarks TEXT,
  check_in_time TIME,
  check_out_time TIME,
  -- v2.1: absence fine fields — imposed when student is marked absent
  fine_amount  DECIMAL(10,2) DEFAULT 0,
  fine_reason  TEXT,
  fine_paid    BOOLEAN DEFAULT false,
  fine_paid_at TIMESTAMP,
  -- v2.2: reason for absence, default 'leave'
  absence_reason TEXT CHECK (absence_reason IN ('leave', 'sick', 'unauthorized', 'suspended', 'other')) DEFAULT 'leave',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ============================================
-- 10. MARKS TABLE (enhanced)
-- ============================================
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  subject_name TEXT, -- Denormalized for quick access
  marks_obtained DECIMAL(5,2),
  total_marks DECIMAL(5,2),
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_marks > 0 THEN (marks_obtained / total_marks * 100)
      ELSE 0
    END
  ) STORED,
  grade TEXT CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F')),
  exam_type TEXT CHECK (exam_type IN ('quiz', 'midterm', 'final', 'assignment', 'test')),
  term TEXT CHECK (term IN ('first', 'second', 'third', 'final')),
  academic_year TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 11. FEES TABLE
-- ============================================
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  -- v2.1: added 'absence_fine' type
  fee_type TEXT CHECK (fee_type IN ('tuition', 'admission', 'exam', 'library', 'sports', 'transport', 'absence_fine')),
  amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check')),
  transaction_id TEXT,
  status TEXT CHECK (status IN ('paid', 'pending', 'overdue', 'partial')) DEFAULT 'pending',
  receipt_number TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 12. EXAM SCHEDULES TABLE
-- ============================================
CREATE TABLE exam_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  exam_type TEXT CHECK (exam_type IN ('quiz', 'midterm', 'final', 'assignment')),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 13. ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT CHECK (target_role IN ('all', 'principal', 'teacher', 'farm_master', 'student', 'parent')),
  target_class_id UUID REFERENCES classes(id),
  posted_by UUID REFERENCES users(id),
  is_important BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 14. EVENTS TABLE (calendar)
-- ============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  target_roles TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 15. LEAVE REQUESTS TABLE (for teachers/staff)
-- v2.4: added UNIQUE(user_id, start_date) to support daily teacher
--       attendance upsert from principal dashboard
-- ============================================
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  leave_type TEXT CHECK (leave_type IN ('sick', 'casual', 'annual', 'emergency')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  -- v2.4: one record per teacher per day for attendance tracking
  UNIQUE(user_id, start_date)
);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert users (with fixed UUIDs for consistency)
INSERT INTO users (id, email, name, role, phone) VALUES
  (gen_random_uuid(), 'principal@school.com', 'Dr. Sarah Johnson', 'principal', '+1234567890'),
  (gen_random_uuid(), 'teacher@school.com', 'Mr. John Davis', 'teacher', '+1234567891'),
  (gen_random_uuid(), 'farm@school.com', 'Mr. Mike Wilson', 'farm_master', '+1234567892'),
  (gen_random_uuid(), 'student@school.com', 'Alice Brown', 'student', '+1234567893');

-- Insert classes
INSERT INTO classes (name, grade_level, description) VALUES
  ('Grade 10', 10, 'High School - Grade 10'),
  ('Grade 9', 9, 'High School - Grade 9'),
  ('Grade 8', 8, 'Middle School - Grade 8');

-- Insert sections
INSERT INTO sections (class_id, name, room_number, capacity) VALUES
  ((SELECT id FROM classes WHERE name = 'Grade 10'), 'A', '101', 30),
  ((SELECT id FROM classes WHERE name = 'Grade 10'), 'B', '102', 30),
  ((SELECT id FROM classes WHERE name = 'Grade 9'), 'A', '201', 28);

-- Insert sample student record (linking to user)
DO $$
DECLARE
  student_user_id UUID;
  student_class_id UUID;
  student_section_id UUID;
BEGIN
  -- Get the student user ID
  SELECT id INTO student_user_id FROM users WHERE email = 'student@school.com';
  -- Get class and section IDs
  SELECT id INTO student_class_id FROM classes WHERE name = 'Grade 10' LIMIT 1;
  SELECT id INTO student_section_id FROM sections WHERE name = 'A' AND class_id = student_class_id LIMIT 1;
  
  -- Insert student record
  INSERT INTO students (user_id, roll_number, class_id, section_id, parent_name, parent_phone, address)
  VALUES (student_user_id, '101', student_class_id, student_section_id, 'Mr. & Mrs. Brown', '+1234567899', '123 School Street');
END $$;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
-- NOTE: This app uses custom auth (localStorage session, no Supabase Auth).
-- auth.uid() is always NULL so role-based policies below are replaced by
-- permissive "Allow all" policies run directly in Supabase.
-- The policies below are kept for documentation only.
-- 
-- ACTUAL POLICIES APPLIED IN SUPABASE (run these manually):
--   CREATE POLICY "Allow all" ON users            FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON students         FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON classes          FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON sections         FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON subjects         FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON attendance       FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON fees             FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON teacher_subjects FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON class_assignments FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON leave_requests   FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all" ON marks            FOR ALL USING (true) WITH CHECK (true);
-- ============================================

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_section ON students(section_id);
CREATE INDEX idx_students_roll ON students(roll_number);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
-- v2.3: class teacher lookup
CREATE INDEX idx_classes_teacher ON classes(class_teacher_id);
-- v2.4: fast fine queries and class+date attendance lookup
CREATE INDEX idx_attendance_fine ON attendance(fine_paid) WHERE fine_amount > 0;
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_subject ON marks(subject_id);
CREATE INDEX idx_fees_student ON fees(student_id);
CREATE INDEX idx_fees_status ON fees(status);
CREATE INDEX idx_announcements_target ON announcements(target_role);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get student attendance percentage
CREATE OR REPLACE FUNCTION get_student_attendance_percentage(student_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_days INT;
  present_days INT;
BEGIN
  SELECT COUNT(*) INTO total_days FROM attendance WHERE student_id = $1;
  SELECT COUNT(*) INTO present_days FROM attendance WHERE student_id = $1 AND status = 'present';
  
  IF total_days = 0 THEN
    RETURN 0;
  ELSE
    RETURN (present_days::DECIMAL / total_days::DECIMAL) * 100;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update section current strength
CREATE OR REPLACE FUNCTION update_section_strength()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sections 
  SET current_strength = (
    SELECT COUNT(*) FROM students WHERE section_id = NEW.section_id
  )
  WHERE id = NEW.section_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update section strength
CREATE TRIGGER update_section_strength_trigger
  AFTER INSERT OR DELETE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_section_strength();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for student attendance summary
CREATE VIEW student_attendance_summary AS
SELECT 
  s.id as student_id,
  u.name as student_name,
  c.name as class_name,
  sec.name as section_name,
  COUNT(a.id) as total_days,
  COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
  COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
  ROUND(COALESCE(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(a.id), 0) * 100, 0), 2) as attendance_percentage
FROM students s
JOIN users u ON s.user_id = u.id
JOIN classes c ON s.class_id = c.id
JOIN sections sec ON s.section_id = sec.id
LEFT JOIN attendance a ON s.id = a.student_id
GROUP BY s.id, u.name, c.name, sec.name;

-- View for class-wise attendance
CREATE VIEW class_attendance_summary AS
SELECT 
  c.id as class_id,
  c.name as class_name,
  sec.name as section_name,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(DISTINCT a.date) as attendance_days,
  AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100 as avg_attendance
FROM classes c
JOIN sections sec ON c.id = sec.class_id
JOIN students s ON sec.id = s.section_id
LEFT JOIN attendance a ON s.id = a.student_id
GROUP BY c.id, c.name, sec.name;

-- View for top performing students
CREATE VIEW top_performing_students AS
SELECT 
  s.id as student_id,
  u.name as student_name,
  c.name as class_name,
  sec.name as section_name,
  ROUND(AVG(m.percentage), 2) as avg_percentage,
  MAX(m.grade) as highest_grade
FROM students s
JOIN users u ON s.user_id = u.id
JOIN classes c ON s.class_id = c.id
JOIN sections sec ON s.section_id = sec.id
JOIN marks m ON s.id = m.student_id
GROUP BY s.id, u.name, c.name, sec.name
ORDER BY avg_percentage DESC;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE users IS 'System users with role-based access';
COMMENT ON TABLE students IS 'Student profile information';
COMMENT ON TABLE classes IS 'Academic classes/grades';
COMMENT ON TABLE sections IS 'Class sections/groups';
COMMENT ON TABLE attendance IS 'Daily student attendance records';
COMMENT ON TABLE marks IS 'Student academic marks/grades';
COMMENT ON TABLE fees IS 'Student fee payment records';
COMMENT ON VIEW student_attendance_summary IS 'Summary of student attendance percentages';
COMMENT ON VIEW top_performing_students IS 'List of top performing students by marks';

-- ============================================
-- MIGRATION STATEMENTS (run on existing DB)
-- These ALTER statements apply all version changes
-- to a database that was created from an older schema.
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards).
-- ============================================

-- v2.1
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS fine_amount  DECIMAL(10,2) DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS fine_reason  TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS fine_paid    BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS fine_paid_at TIMESTAMP;
ALTER TABLE class_assignments ADD COLUMN IF NOT EXISTS is_farm_master BOOLEAN DEFAULT false;

-- v2.2
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS absence_reason TEXT
  CHECK (absence_reason IN ('leave','sick','unauthorized','suspended','other'))
  DEFAULT 'leave';

-- v2.3
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(class_teacher_id);

-- v2.4
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'password123';
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_date_unique;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_user_date_unique UNIQUE (user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_attendance_fine ON attendance(fine_paid) WHERE fine_amount > 0;
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);

-- v2.5: teacher_subjects section_id now nullable
ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_section_id_fkey;
ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

-- RLS permissive policies (custom auth — auth.uid() is always null)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON students FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='classes' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON classes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sections' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON sections FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subjects' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON subjects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attendance' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON attendance FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fees' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON fees FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teacher_subjects' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON teacher_subjects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='class_assignments' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON class_assignments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_requests' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON leave_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marks' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON marks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES (Run to check everything)
-- ============================================
-- Check all tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check all views created
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- Check all functions created
SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');