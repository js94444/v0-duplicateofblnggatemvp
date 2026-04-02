-- visit_passes 테이블에 card_number 컬럼 추가
IF NOT EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'visit_passes' AND COLUMN_NAME = 'card_number'
)
BEGIN
  ALTER TABLE visit_passes ADD card_number NVARCHAR(50) NULL;
END
