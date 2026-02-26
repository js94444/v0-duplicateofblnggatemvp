-- 성능 최적화 인덱스 추가 스크립트
-- 관리자 페이지 조회 속도 개선을 위한 복합 인덱스

-- 1. visit_applications: 관리자 목록 조회 최적화
-- 상태 + 생성일 복합 인덱스 (필터링 + 정렬 동시 처리)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_applications_status_created' AND object_id = OBJECT_ID('visit_applications'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_applications_status_created
    ON visit_applications (status, created_at DESC)
    INCLUDE (application_number, visitor_name, visitor_phone, visitor_organization, visit_start_date, visit_end_date, access_area);
    PRINT 'Created: idx_applications_status_created';
END

-- 방문일 범위 조회 최적화 (캘린더 페이지)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_applications_visit_dates_status' AND object_id = OBJECT_ID('visit_applications'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_applications_visit_dates_status
    ON visit_applications (visit_start_date, visit_end_date, status)
    INCLUDE (application_number, visitor_name, visitor_organization, access_area);
    PRINT 'Created: idx_applications_visit_dates_status';
END

-- 접수번호 조회 최적화 (상태 조회 페이지)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_applications_number_status' AND object_id = OBJECT_ID('visit_applications'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_applications_number_status
    ON visit_applications (application_number)
    INCLUDE (status, visitor_name, visitor_phone, visit_start_date, visit_end_date, access_area, approval_date, rejection_reason, created_at);
    PRINT 'Created: idx_applications_number_status';
END

-- 방문자명 검색 최적화
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_applications_visitor_name' AND object_id = OBJECT_ID('visit_applications'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_applications_visitor_name
    ON visit_applications (visitor_name)
    INCLUDE (application_number, status, visitor_phone, visit_start_date, visit_end_date);
    PRINT 'Created: idx_applications_visitor_name';
END

-- 2. visit_companions: application_id 조회 최적화 (이미 있을 수 있으나 INCLUDE 컬럼 추가)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_companions_appid_include' AND object_id = OBJECT_ID('visit_companions'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_companions_appid_include
    ON visit_companions (application_id)
    INCLUDE (companion_id, name, phone, birth_date, organization, position);
    PRINT 'Created: idx_companions_appid_include';
END

-- 3. visit_companion_devices: companion_id 조회 최적화
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_companion_devices_include' AND object_id = OBJECT_ID('visit_companion_devices'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_companion_devices_include
    ON visit_companion_devices (companion_id)
    INCLUDE (item_name, model_name, serial_number, reason);
    PRINT 'Created: idx_companion_devices_include';
END

-- 4. visit_electronic_devices: application_id 조회 최적화
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_devices_appid_include' AND object_id = OBJECT_ID('visit_electronic_devices'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_devices_appid_include
    ON visit_electronic_devices (application_id)
    INCLUDE (item_name, model_name, serial_number, reason);
    PRINT 'Created: idx_devices_appid_include';
END

-- 5. visit_attachments: application_id 조회 최적화
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_attachments_appid_include' AND object_id = OBJECT_ID('visit_attachments'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_attachments_appid_include
    ON visit_attachments (application_id)
    INCLUDE (file_name, file_key, file_type, file_size, blob_url);
    PRINT 'Created: idx_attachments_appid_include';
END

-- 6. visit_application_history: application_id + 변경일 조회 최적화
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_history_appid_changed' AND object_id = OBJECT_ID('visit_application_history'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_history_appid_changed
    ON visit_application_history (application_id, changed_at DESC)
    INCLUDE (previous_status, new_status, changed_by, change_reason);
    PRINT 'Created: idx_history_appid_changed';
END

PRINT '';
PRINT '=== 인덱스 최적화 완료 ===';
PRINT '추가된 인덱스:';
PRINT '  1. idx_applications_status_created    - 관리자 목록 조회 (상태+날짜 필터)';
PRINT '  2. idx_applications_visit_dates_status - 캘린더 날짜 범위 조회';
PRINT '  3. idx_applications_number_status      - 접수번호 상세 조회';
PRINT '  4. idx_applications_visitor_name       - 방문자명 검색';
PRINT '  5. idx_companions_appid_include        - 동행인 조회 (INCLUDE 최적화)';
PRINT '  6. idx_companion_devices_include       - 동행인 전자기기 조회';
PRINT '  7. idx_devices_appid_include           - 방문자 전자기기 조회';
PRINT '  8. idx_attachments_appid_include       - 첨부파일 조회';
PRINT '  9. idx_history_appid_changed           - 이력 조회';
