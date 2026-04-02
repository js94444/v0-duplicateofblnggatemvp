-- 게시판 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'board_posts')
BEGIN
    CREATE TABLE [dbo].[board_posts] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [category] NVARCHAR(50) NOT NULL DEFAULT N'건의사항',
        [title] NVARCHAR(200) NOT NULL,
        [content] NVARCHAR(MAX) NOT NULL,
        [author] NVARCHAR(100) NOT NULL,
        [contact] NVARCHAR(50) NOT NULL,
        [email] NVARCHAR(100) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT N'접수',
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NULL
    );
    
    PRINT 'board_posts 테이블이 생성되었습니다.';
END
ELSE
BEGIN
    PRINT 'board_posts 테이블이 이미 존재합니다.';
END
