-- board_posts 테이블에서 불필요한 컬럼 삭제
-- 필요한 컬럼: id, title, content, author, created_at
-- 삭제할 컬럼: category, contact, email, status, updated_at

-- 1. status 컬럼의 DEFAULT 제약조건 삭제
DECLARE @StatusConstraint NVARCHAR(200)
SELECT @StatusConstraint = name FROM sys.default_constraints 
WHERE parent_object_id = OBJECT_ID('board_posts') AND parent_column_id = (
    SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'status'
)
IF @StatusConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE board_posts DROP CONSTRAINT ' + @StatusConstraint)
END
GO

-- 2. updated_at 컬럼의 DEFAULT 제약조건 삭제
DECLARE @UpdatedAtConstraint NVARCHAR(200)
SELECT @UpdatedAtConstraint = name FROM sys.default_constraints 
WHERE parent_object_id = OBJECT_ID('board_posts') AND parent_column_id = (
    SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'updated_at'
)
IF @UpdatedAtConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE board_posts DROP CONSTRAINT ' + @UpdatedAtConstraint)
END
GO

-- 3. category 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'category')
    ALTER TABLE board_posts DROP COLUMN category;
GO

-- 4. contact 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'contact')
    ALTER TABLE board_posts DROP COLUMN contact;
GO

-- 5. email 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'email')
    ALTER TABLE board_posts DROP COLUMN email;
GO

-- 6. status 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'status')
    ALTER TABLE board_posts DROP COLUMN status;
GO

-- 7. updated_at 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'updated_at')
    ALTER TABLE board_posts DROP COLUMN updated_at;
GO
