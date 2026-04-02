-- Add contact_mobile column to visit_applications table
-- This script adds the mobile phone number field for contact persons

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.visit_applications') 
    AND name = 'contact_mobile'
)
BEGIN
    ALTER TABLE visit_applications
    ADD contact_mobile NVARCHAR(20) NULL;
    
    PRINT 'Column contact_mobile added successfully to visit_applications table';
END
ELSE
BEGIN
    PRINT 'Column contact_mobile already exists in visit_applications table';
END
GO
