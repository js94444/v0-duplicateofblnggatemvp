-- 방문 신청서 통합 데이터베이스 스키마
-- 방문신청서 작성 페이지의 모든 데이터를 저장하는 테이블 구조

-- 1. 메인 방문 신청 테이블
IF OBJECT_ID('visit_applications', 'U') IS NOT NULL
    DROP TABLE visit_applications;
GO

CREATE TABLE visit_applications (
    application_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    
    -- 신청서 메타 정보
    application_number NVARCHAR(50) UNIQUE NOT NULL, -- 신청서 번호 (예: VA-20240101-0001)
    status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
    is_admin_submission BIT NOT NULL DEFAULT 0, -- 관리자 신청 여부
    
    -- 방문자 기본 정보
    visitor_name NVARCHAR(100) NOT NULL,
    visitor_phone NVARCHAR(20) NOT NULL,
    visitor_birth_date DATE,
    visitor_organization NVARCHAR(200),
    visitor_position NVARCHAR(100),
    visitor_address NVARCHAR(500),
    visitor_email NVARCHAR(200),
    
    -- 방문 정보
    contact_name NVARCHAR(100), -- 담당자명
    contact_mobile NVARCHAR(20), -- 담당자 연락처
    visit_start_date DATE NOT NULL,
    visit_end_date DATE NOT NULL,
    access_area NVARCHAR(100), -- 출입지역
    visit_purpose NVARCHAR(500), -- 방문 목적
    
    -- 차량 정보
    vehicle_number NVARCHAR(50),
    vehicle_model NVARCHAR(100),
    
    -- 승인/거부 정보
    approval_date DATETIME,
    approved_by NVARCHAR(100), -- 승인자
    rejection_reason NVARCHAR(1000), -- 거부 사유
    admin_notes NVARCHAR(2000), -- 관리자 메모
    
    -- 시스템 정보
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    submission_ip NVARCHAR(50), -- 신청 IP 주소
    
    -- 인덱스 생성
    INDEX idx_application_number (application_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_visitor_name (visitor_name),
    INDEX idx_visit_dates (visit_start_date, visit_end_date)
);
GO

-- 2. 방문자 전자기기 테이블
IF OBJECT_ID('visit_electronic_devices', 'U') IS NOT NULL
    DROP TABLE visit_electronic_devices;
GO

CREATE TABLE visit_electronic_devices (
    device_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    application_id BIGINT NOT NULL,
    
    -- 전자기기 정보
    item_name NVARCHAR(200) NOT NULL, -- 품명
    model_name NVARCHAR(200) NOT NULL, -- 모델명
    serial_number NVARCHAR(200) NOT NULL, -- 시리얼넘버
    reason NVARCHAR(500) NOT NULL, -- 반입 사유
    
    -- 시스템 정보
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- 외래키
    FOREIGN KEY (application_id) REFERENCES visit_applications(application_id) ON DELETE CASCADE,
    
    -- 인덱스
    INDEX idx_application_id (application_id)
);
GO

-- 3. 동행인 테이블
IF OBJECT_ID('visit_companions', 'U') IS NOT NULL
    DROP TABLE visit_companions;
GO

CREATE TABLE visit_companions (
    companion_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    application_id BIGINT NOT NULL,
    
    -- 동행인 기본 정보
    name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20) NOT NULL,
    birth_date DATE,
    organization NVARCHAR(200),
    position NVARCHAR(100),
    
    -- 시스템 정보
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- 외래키
    FOREIGN KEY (application_id) REFERENCES visit_applications(application_id) ON DELETE CASCADE,
    
    -- 인덱스
    INDEX idx_application_id (application_id)
);
GO

-- 4. 동행인 전자기기 테이블
IF OBJECT_ID('visit_companion_devices', 'U') IS NOT NULL
    DROP TABLE visit_companion_devices;
GO

CREATE TABLE visit_companion_devices (
    companion_device_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    companion_id BIGINT NOT NULL,
    
    -- 전자기기 정보
    item_name NVARCHAR(200) NOT NULL,
    model_name NVARCHAR(200) NOT NULL,
    serial_number NVARCHAR(200) NOT NULL,
    reason NVARCHAR(500) NOT NULL,
    
    -- 시스템 정보
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- 외래키
    FOREIGN KEY (companion_id) REFERENCES visit_companions(companion_id) ON DELETE CASCADE,
    
    -- 인덱스
    INDEX idx_companion_id (companion_id)
);
GO

-- 5. 첨부파일 테이블
IF OBJECT_ID('visit_attachments', 'U') IS NOT NULL
    DROP TABLE visit_attachments;
GO

CREATE TABLE visit_attachments (
    attachment_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    application_id BIGINT NOT NULL,
    
    -- 파일 정보
    file_name NVARCHAR(500) NOT NULL, -- 원본 파일명
    file_key NVARCHAR(500) NOT NULL, -- Blob 저장 키
    file_type NVARCHAR(100), -- MIME 타입
    file_size BIGINT, -- 파일 크기 (bytes)
    blob_url NVARCHAR(1000), -- Blob URL
    
    -- 시스템 정보
    uploaded_at DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- 외래키
    FOREIGN KEY (application_id) REFERENCES visit_applications(application_id) ON DELETE CASCADE,
    
    -- 인덱스
    INDEX idx_application_id (application_id)
);
GO

-- 6. 신청서 이력 테이블 (상태 변경 추적)
IF OBJECT_ID('visit_application_history', 'U') IS NOT NULL
    DROP TABLE visit_application_history;
GO

CREATE TABLE visit_application_history (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    application_id BIGINT NOT NULL,
    
    -- 이력 정보
    previous_status NVARCHAR(20),
    new_status NVARCHAR(20) NOT NULL,
    changed_by NVARCHAR(100), -- 변경자
    change_reason NVARCHAR(1000), -- 변경 사유
    
    -- 시스템 정보
    changed_at DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- 외래키
    FOREIGN KEY (application_id) REFERENCES visit_applications(application_id) ON DELETE CASCADE,
    
    -- 인덱스
    INDEX idx_application_id (application_id),
    INDEX idx_changed_at (changed_at)
);
GO

-- 트리거: updated_at 자동 갱신
IF OBJECT_ID('tr_visit_applications_update', 'TR') IS NOT NULL
    DROP TRIGGER tr_visit_applications_update;
GO

CREATE TRIGGER tr_visit_applications_update
ON visit_applications
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE visit_applications
    SET updated_at = GETDATE()
    FROM visit_applications va
    INNER JOIN inserted i ON va.application_id = i.application_id;
END;
GO

-- 샘플 데이터 확인용 뷰
IF OBJECT_ID('vw_visit_applications_summary', 'V') IS NOT NULL
    DROP VIEW vw_visit_applications_summary;
GO

CREATE VIEW vw_visit_applications_summary AS
SELECT 
    va.application_id,
    va.application_number,
    va.status,
    va.visitor_name,
    va.visitor_phone,
    va.visitor_organization,
    va.visit_start_date,
    va.visit_end_date,
    va.access_area,
    va.is_admin_submission,
    va.created_at,
    COUNT(DISTINCT ved.device_id) as device_count,
    COUNT(DISTINCT vc.companion_id) as companion_count,
    COUNT(DISTINCT vat.attachment_id) as attachment_count
FROM visit_applications va
LEFT JOIN visit_electronic_devices ved ON va.application_id = ved.application_id
LEFT JOIN visit_companions vc ON va.application_id = vc.application_id
LEFT JOIN visit_attachments vat ON va.application_id = vat.application_id
GROUP BY 
    va.application_id,
    va.application_number,
    va.status,
    va.visitor_name,
    va.visitor_phone,
    va.visitor_organization,
    va.visit_start_date,
    va.visit_end_date,
    va.access_area,
    va.is_admin_submission,
    va.created_at;
GO

PRINT 'Visit application database schema created successfully!';
PRINT 'Tables created:';
PRINT '  - visit_applications (메인 신청서)';
PRINT '  - visit_electronic_devices (방문자 전자기기)';
PRINT '  - visit_companions (동행인)';
PRINT '  - visit_companion_devices (동행인 전자기기)';
PRINT '  - visit_attachments (첨부파일)';
PRINT '  - visit_application_history (신청서 이력)';
PRINT 'View created:';
PRINT '  - vw_visit_applications_summary (신청서 요약 뷰)';
