-- board_posts 테이블에서 불필요한 컬럼 삭제
-- 필요한 컬럼: id, title, content, author, created_at
-- 삭제할 컬럼: category, contact, email, status, updated_at

-- status 컬럼의 DEFAULT 제약조건 먼저 삭제
DECLARE @ConstraintName NVARCHAR(200)
SELECT @ConstraintName = name FROM sys.default_constraints 
WHERE parent_object_id = OBJECT_ID('board_posts') AND parent_column_id = (
    SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'status'
)
IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE board_posts DROP CONSTRAINT ' + @ConstraintName)
    PRINT 'status 컬럼의 DEFAULT 제약조건이 삭제되었습니다.'
END
GO

-- category 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'category')
BEGIN
    ALTER TABLE board_posts DROP COLUMN category;
    PRINT 'category 컬럼이 삭제되었습니다.';
END
GO

-- contact 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'contact')
BEGIN
    ALTER TABLE board_posts DROP COLUMN contact;
    PRINT 'contact 컬럼이 삭제되었습니다.';
END
GO

-- email 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'email')
BEGIN
    ALTER TABLE board_posts DROP COLUMN email;
    PRINT 'email 컬럼이 삭제되었습니다.';
END
GO

-- status 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'status')
BEGIN
    ALTER TABLE board_posts DROP COLUMN status;
    PRINT 'status 컬럼이 삭제되었습니다.';
END
GO

-- updated_at 컬럼 삭제
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('board_posts') AND name = 'updated_at')
BEGIN
    ALTER TABLE board_posts DROP COLUMN updated_at;
    PRINT 'updated_at 컬럼이 삭제되었습니다.';
END
GO

PRINT '컬럼 삭제 완료. 남은 컬럼: id, title, content, author, created_at';
