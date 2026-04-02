-- 1. admin_accounts 테이블에 phone 컬럼 추가
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'admin_accounts' AND COLUMN_NAME = 'phone'
)
BEGIN
  ALTER TABLE admin_accounts ADD phone NVARCHAR(20) NULL;
  PRINT 'Added phone column to admin_accounts';
END

-- 2. visit_applications 테이블에 assigned_admin_id 컬럼 추가 (관리자 지정)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'visit_applications' AND COLUMN_NAME = 'assigned_admin_id'
)
BEGIN
  ALTER TABLE visit_applications ADD assigned_admin_id BIGINT NULL;
  PRINT 'Added assigned_admin_id column to visit_applications';
END

-- 3. 외래키 제약 추가
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_NAME = 'FK_visit_applications_assigned_admin'
)
BEGIN
  ALTER TABLE visit_applications
  ADD CONSTRAINT FK_visit_applications_assigned_admin
  FOREIGN KEY (assigned_admin_id)
  REFERENCES admin_accounts(account_id);
  PRINT 'Added foreign key constraint';
END

PRINT 'Schema migration completed successfully';
