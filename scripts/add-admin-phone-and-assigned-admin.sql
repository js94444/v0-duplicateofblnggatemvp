-- 1. admin_users 테이블에 phone 컬럼 추가
ALTER TABLE admin_users
ADD phone NVARCHAR(20) NULL;

-- 2. visit_applications 테이블에 assigned_admin_id 컬럼 추가 (관리자 지정)
ALTER TABLE visit_applications
ADD assigned_admin_id BIGINT NULL;

-- 3. 외래키 제약 추가
ALTER TABLE visit_applications
ADD CONSTRAINT FK_visit_applications_assigned_admin
FOREIGN KEY (assigned_admin_id)
REFERENCES admin_users(id);

PRINT 'Schema migration completed: Added phone to admin_users and assigned_admin_id to visit_applications';
