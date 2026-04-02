-- Add detailed_purpose column to visit_applications table
-- This column stores detailed visit reason entered by applicants

-- Check if column exists before adding
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'visit_applications' 
    AND COLUMN_NAME = 'detailed_purpose'
)
BEGIN
    ALTER TABLE visit_applications
    ADD detailed_purpose NVARCHAR(MAX) NULL;
    
    PRINT 'Column detailed_purpose added successfully to visit_applications table';
END
ELSE
BEGIN
    PRINT 'Column detailed_purpose already exists in visit_applications table';
END
GO
