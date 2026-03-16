import sql from 'mssql'
import type { Application, VisitR3Application, PortAccessApplication, ApplicationStatus, ApplicationType } from '@/lib/types'
import { ApplicationStatus as Status, ApplicationType as Type, AccessArea } from '@/lib/types'

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || '',
  user: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

// 데이터베이스의 소문자 status를 ApplicationStatus enum으로 변환
function normalizeStatus(status: string): Status {
  const upperStatus = status.trim().toUpperCase()
  if (upperStatus === 'PENDING') return Status.PENDING
  if (upperStatus === 'APPROVED') return Status.APPROVED
  if (upperStatus === 'REJECTED') return Status.REJECTED
  if (upperStatus === 'CANCELLED') return Status.CANCELLED
  if (upperStatus === 'UNDER_REVIEW') return Status.UNDER_REVIEW
  console.warn('[v0] Unknown status value:', status, '-> defaulting to PENDING')
  return Status.PENDING // 기본값
}

async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config)
    console.log('[v0] Azure SQL connection pool created')
    // 인덱스 자동 생성 (없으면 추가, 있으면 스킵)
    await createIndexesIfNotExists(pool).catch(e => console.error('[v0] Index creation error (non-fatal):', e.message))
  }
  return pool
}

async function createIndexesIfNotExists(p: sql.ConnectionPool): Promise<void> {
  const indexes = [
    // visit_applications - 실제 DB 컬럼명 사용
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_applications_number') 
     CREATE NONCLUSTERED INDEX IX_visit_applications_number ON visit_applications(application_number)`,
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_applications_status') 
     CREATE NONCLUSTERED INDEX IX_visit_applications_status ON visit_applications(status) INCLUDE (application_number, visitor_name, created_at)`,
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_applications_visitor_phone') 
     CREATE NONCLUSTERED INDEX IX_visit_applications_visitor_phone ON visit_applications(visitor_phone)`,
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_applications_visit_start_date') 
     CREATE NONCLUSTERED INDEX IX_visit_applications_visit_start_date ON visit_applications(visit_start_date)`,
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_applications_created_at') 
     CREATE NONCLUSTERED INDEX IX_visit_applications_created_at ON visit_applications(created_at DESC)`,
    // visit_companions - application_id로 JOIN 최적화
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_companions_application_id') 
     CREATE NONCLUSTERED INDEX IX_visit_companions_application_id ON visit_companions(application_id)`,
    // visit_companion_devices - companion_id로 JOIN 최적화
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_companion_devices_companion_id') 
     CREATE NONCLUSTERED INDEX IX_visit_companion_devices_companion_id ON visit_companion_devices(companion_id)`,
    // visit_electronic_devices - application_id로 JOIN 최적화
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_electronic_devices_application_id') 
     CREATE NONCLUSTERED INDEX IX_visit_electronic_devices_application_id ON visit_electronic_devices(application_id)`,
    // visit_attachments - application_id로 JOIN 최적화
    `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visit_attachments_application_id') 
     CREATE NONCLUSTERED INDEX IX_visit_attachments_application_id ON visit_attachments(application_id)`,
  ]

  for (const sql_str of indexes) {
    await p.request().query(sql_str)
  }
  console.log('[v0] Performance indexes verified/created')
}

// 한국 시간(Asia/Seoul, UTC+9) 생성 함수
function getKoreaTime(): Date {
  const now = new Date()
  // 서버 타임존과 무관하게 UTC 기준으로 한국 시간(UTC+9) 계산
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const koreaTime = new Date(utcTime + (9 * 60 * 60 * 1000))
  return koreaTime
}

// 접수번호 생성 함수
function generateReceiptNumber(type: ApplicationType): string {
  const now = getKoreaTime()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')

  const typeCode = {
    [Type.VISIT_R3]: 'VR',
    [Type.GROUP_VISIT]: 'GV',
    [Type.PORT_ACCESS]: 'PA',
    [Type.GOODS_INOUT]: 'GI',
  }[type]

  return `${typeCode}-${year}${month}${day}-${random}`
}

export class AzureSqlDB {
  // 새로운 방문 신청서 생성 (전자기기, 동행인 포함)
  static async createVisitApplication(data: {
    visitor_name: string
    visitor_phone: string
    visitor_birth_date?: string
    visitor_organization: string
    visitor_position: string
    visitor_address: string
    visitor_email?: string
    contact_name: string
    visit_purpose: string
    detailed_purpose?: string
    visit_start_date: string
    visit_end_date: string
    access_area: string
    vehicle_number?: string
    vehicle_model?: string
    has_no_vehicle?: boolean
    is_admin_mode?: boolean
    submission_ip?: string
    electronic_devices?: Array<{
      item_name: string
      model_name: string
      serial_number: string
      reason: string
    }>
    companions?: Array<{
      name: string
      phone: string
      birth_date: string
      organization: string
      position: string
      privacy_consent: boolean
      security_pledge: boolean
      safety_pledge: boolean
      electronic_devices: Array<{
        item_name: string
        model_name: string
        serial_number: string
        reason: string
      }>
      port_cert_files?: Array<{
        filename: string
        fileKey: string
        fileType?: string
        url?: string
        size?: number
      }>
    }>
    uploadedFiles?: Array<{
      filename: string
      fileKey: string
      fileType: string
    }>
    uploaded_files?: Array<{
      filename: string
      fileKey: string
      fileType?: string
      url?: string
      size?: number
    }>
    portCertFiles?: Array<{
      filename: string
      fileKey: string
      fileType?: string
      url?: string
      size?: number
    }>
  }): Promise<{ id: number; receipt: string }> {
    const dbPool = await getPool()

    // 유형 분류 로직
    // 1. 출입지역이 '항만' 또는 '부두'를 포함하면 항만출입 (동행인 여부 ��관)
    // 2. 동행인이 있으면 단체방문신청
    // 3. 기본정보만 있으면 개인방문신청
    let applicationType: Type
    const isPortArea = data.access_area === '항만' || data.access_area?.includes('부두')
    if (isPortArea) {
      applicationType = Type.PORT_ACCESS
    } else if (data.companions && data.companions.length > 0) {
      applicationType = Type.GROUP_VISIT
    } else {
      applicationType = Type.VISIT_R3
    }

    const applicationNumber = generateReceiptNumber(applicationType)
    const now = getKoreaTime()
    const id = `${now.getTime()}-${Math.random().toString(36).substring(7)}`
    const receipt = applicationNumber;

    console.log('[v0] Creating visit application:', { applicationNumber, applicationType })

    // 1. 메인 신청서 저장
    const result = await dbPool
      .request()
      .input('application_number', sql.NVarChar(50), applicationNumber)
      .input('visitor_name', sql.NVarChar(100), data.visitor_name || null)
      .input('visitor_phone', sql.NVarChar(20), data.visitor_phone || null)
      .input('visitor_birth_date', sql.Date, data.visitor_birth_date || null)
      .input('visitor_organization', sql.NVarChar(200), data.visitor_organization || null)
      .input('visitor_position', sql.NVarChar(100), data.visitor_position || null)
      .input('visitor_address', sql.NVarChar(500), data.visitor_address || null)
      .input('visitor_email', sql.NVarChar(200), data.visitor_email || null)
      .input('contact_name', sql.NVarChar(100), data.contact_name || null)
      .input('contact_mobile', sql.NVarChar(20), data.contact_mobile || null)
      .input('visit_purpose', sql.NVarChar(500), data.visit_purpose || null)
      .input('detailed_purpose', sql.NVarChar(sql.MAX), data.detailed_purpose || null)
      .input('visit_start_date', sql.Date, data.visit_start_date || null)
      .input('visit_end_date', sql.Date, data.visit_end_date || null)
      .input('access_area', sql.NVarChar(100), data.access_area || null)
      .input('vehicle_number', sql.NVarChar(50), data.vehicle_number || null)
      .input('vehicle_model', sql.NVarChar(100), data.vehicle_model || null)
      .input('spark_arrestor', sql.NVarChar(1), data.spark_arrestor || null)
      .input('is_admin_submission', sql.Bit, data.is_admin_mode ? 1 : 0)
      .input('submission_ip', sql.NVarChar(50), data.submission_ip || null)
      .input('status', sql.NVarChar(20), 'pending')
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now).query(`
        INSERT INTO visit_applications (
          application_number, visitor_name, visitor_phone, visitor_birth_date,
          visitor_organization, visitor_position, visitor_address, visitor_email,
          contact_name, contact_mobile, visit_purpose, detailed_purpose, visit_start_date, visit_end_date,
          access_area, vehicle_number, vehicle_model, spark_arrestor,
          is_admin_submission, submission_ip, status, created_at, updated_at
        )
        OUTPUT INSERTED.application_id
        VALUES (
          @application_number, @visitor_name, @visitor_phone, @visitor_birth_date,
          @visitor_organization, @visitor_position, @visitor_address, @visitor_email,
          @contact_name, @contact_mobile, @visit_purpose, @detailed_purpose, @visit_start_date, @visit_end_date,
          @access_area, @vehicle_number, @vehicle_model, @spark_arrestor,
          @is_admin_submission, @submission_ip, @status, @created_at, @updated_at
        )
      `)

    const applicationId = result.recordset[0].application_id

    // 2. 전자기기 저장
    const electronicDevices = data.electronic_devices || data.electronicDevices || []
    console.log('[v0] Saving electronic devices:', electronicDevices.length)
    if (electronicDevices && electronicDevices.length > 0) {
      for (const device of electronicDevices) {
        console.log('[v0] Saving device:', device)
        await dbPool
          .request()
          .input('application_id', sql.BigInt, applicationId)
          .input('item_name', sql.NVarChar(200), device.item_name || device.deviceName)
          .input('model_name', sql.NVarChar(200), device.model_name || device.modelName)
          .input('serial_number', sql.NVarChar(200), device.serial_number || device.serialNumber)
          .input('reason', sql.NVarChar(500), device.reason).query(`
            INSERT INTO visit_electronic_devices (
              application_id, item_name, model_name, serial_number, reason
            ) VALUES (
              @application_id, @item_name, @model_name, @serial_number, @reason
            )
          `)
      }
    }

    // 3. 동행인 및 동행인 전자기기 저장
    if (data.companions && data.companions.length > 0) {
      for (const companion of data.companions) {
        const companionResult = await dbPool
          .request()
          .input('application_id', sql.BigInt, applicationId)
          .input('name', sql.NVarChar(100), companion.name)
          .input('phone', sql.NVarChar(20), companion.phone)
          .input('birth_date', sql.Date, companion.birth_date)
          .input('organization', sql.NVarChar(200), companion.organization)
          .input('position', sql.NVarChar(100), companion.position).query(`
            INSERT INTO visit_companions (
              application_id, name, phone, birth_date, organization, position
            )
            OUTPUT INSERTED.companion_id
            VALUES (
              @application_id, @name, @phone, @birth_date, @organization, @position
            )
          `)

        const companionId = companionResult.recordset[0].companion_id

        // 동행인 전자기기 저장
        const companionDevices = companion.electronic_devices || companion.electronicDevices || []
        console.log('[v0] Saving companion devices for', companion.name, ':', companionDevices.length)
        if (companionDevices && companionDevices.length > 0) {
          for (const device of companionDevices) {
            console.log('[v0] Saving companion device:', device)
            await dbPool
              .request()
              .input('companion_id', sql.BigInt, companionId)
              .input('item_name', sql.NVarChar(200), device.item_name || device.deviceName)
              .input('model_name', sql.NVarChar(200), device.model_name || device.modelName)
              .input('serial_number', sql.NVarChar(200), device.serial_number || device.serialNumber)
              .input('reason', sql.NVarChar(500), device.reason)
              .input('created_at', sql.DateTime, now).query(`
                INSERT INTO visit_companion_devices (
                  companion_id, item_name, model_name, serial_number, reason, created_at
                ) VALUES (
                  @companion_id, @item_name, @model_name, @serial_number, @reason, @created_at
                )
              `)
          }
        }

        // 동행인 항만이수증 저장
        const companionPortCertFiles = companion.port_cert_files || []
        if (companionPortCertFiles.length > 0) {
          console.log('[v0] Saving companion port cert files for', companion.name, ':', companionPortCertFiles.length)
          for (const file of companionPortCertFiles) {
            if (file && file.filename && file.fileKey) {
              await dbPool
                .request()
                .input('companion_id', sql.BigInt, companionId)
                .input('application_id', sql.BigInt, applicationId)
                .input('file_name', sql.NVarChar(500), file.filename)
                .input('file_key', sql.NVarChar(500), file.fileKey)
                .input('blob_url', sql.NVarChar(1000), file.url || file.fileKey)
                .input('file_type', sql.NVarChar(100), file.fileType || 'application/octet-stream')
                .input('file_size', sql.BigInt, file.size || null)
                .input('attachment_type', sql.NVarChar(50), 'PORT_CERT')
                .input('uploaded_at', sql.DateTime, now).query(`
                  INSERT INTO visit_companion_attachments (
                    companion_id, application_id, file_name, file_key, blob_url, file_type, file_size, attachment_type, uploaded_at
                  ) VALUES (
                    @companion_id, @application_id, @file_name, @file_key, @blob_url, @file_type, @file_size, @attachment_type, @uploaded_at
                  )
                `)
            }
          }
        }
      }
    }

    // 4. 첨부파일 정보 저장
    const uploadedFiles = data.uploadedFiles || data.uploaded_files || []
    console.log('[v0] Uploaded files field check:', {
      hasUploadedFiles: !!data.uploadedFiles,
      hasUploaded_files: !!data.uploaded_files,
      count: uploadedFiles.length
    })
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('[v0] Processing', uploadedFiles.length, 'uploaded files')
      for (const file of uploadedFiles) {
        // ����������������������������������������������������일명과 키가 유효한 경우에만 저장
        if (file && file.filename && file.fileKey && file.filename.trim() !== '' && file.fileKey.trim() !== '') {
          console.log('[v0] Saving file attachment:', {
            filename: file.filename,
            fileKey: file.fileKey,
            url: file.url,
            size: file.size
          })
          await dbPool
            .request()
            .input('application_id', sql.BigInt, applicationId)
            .input('file_name', sql.NVarChar(500), file.filename)
            .input('file_key', sql.NVarChar(500), file.fileKey)
            .input('blob_url', sql.NVarChar(1000), file.url || file.fileKey)
            .input('file_type', sql.NVarChar(100), file.fileType || file.mimeType || 'application/octet-stream')
            .input('file_size', sql.BigInt, file.size || null)
            .input('attachment_type', sql.NVarChar(50), 'GENERAL')
            .input('uploaded_at', sql.DateTime, now).query(`
              INSERT INTO visit_attachments (
                application_id, file_name, file_key, blob_url, file_type, file_size, attachment_type, uploaded_at
              ) VALUES (
                @application_id, @file_name, @file_key, @blob_url, @file_type, @file_size, @attachment_type, @uploaded_at
              )
            `)
          console.log('[v0] File attachment saved successfully')
        } else {
          console.log('[v0] Skipping invalid file attachment:', file)
        }
      }
      console.log('[v0] All file attachments processed')
    } else {
      console.log('[v0] No uploaded files to save')
    }

    // 5. 신청자 본인 항만이수증 저장 (PORT_CERT)
    const portCertFiles = data.portCertFiles || []
    if (portCertFiles.length > 0) {
      console.log('[v0] Saving port cert files:', portCertFiles.length)
      for (const file of portCertFiles) {
        if (file && file.filename && file.fileKey) {
          await dbPool
            .request()
            .input('application_id', sql.BigInt, applicationId)
            .input('file_name', sql.NVarChar(500), file.filename)
            .input('file_key', sql.NVarChar(500), file.fileKey)
            .input('blob_url', sql.NVarChar(1000), file.url || file.fileKey)
            .input('file_type', sql.NVarChar(100), file.fileType || 'application/octet-stream')
            .input('file_size', sql.BigInt, file.size || null)
            .input('attachment_type', sql.NVarChar(50), 'PORT_CERT')
            .input('uploaded_at', sql.DateTime, now).query(`
              INSERT INTO visit_attachments (
                application_id, file_name, file_key, blob_url, file_type, file_size, attachment_type, uploaded_at
              ) VALUES (
                @application_id, @file_name, @file_key, @blob_url, @file_type, @file_size, @attachment_type, @uploaded_at
              )
            `)
        }
      }
    }

    console.log('[v0] Visit application created successfully:', { applicationId, applicationNumber })

    return { id: applicationId, receipt: applicationNumber }
  }

  // 개인방문 신청서 생성
  static async createVisitR3Application(
    data: Omit<VisitR3Application, 'id' | 'receipt' | 'created_at' | 'updated_at' | 'status' | 'type'>
  ): Promise<VisitR3Application> {
    const dbPool = await getPool()
    const receipt = generateReceiptNumber(Type.VISIT_R3)
    const now = getKoreaTime()
    const id = `${now.getTime()}-${Math.random().toString(36).substring(7)}`

    console.log('[v0] Creating VISIT_R3 application:', { id, receipt })

    const result = await dbPool
      .request()
      .input('id', sql.VarChar(50), id)
      .input('receipt', sql.VarChar(50), receipt)
      .input('type', sql.VarChar(20), 'VISIT_R3')
      .input('status', sql.VarChar(20), 'PENDING')
      .input('visitor_name', sql.NVarChar(100), data.visitor_name)
      .input('visitor_phone', sql.VarChar(20), data.visitor_phone)
      .input('visitor_organization', sql.NVarChar(200), data.visitor_organization)
      .input('visitor_position', sql.NVarChar(100), data.visitor_position)
      .input('visit_datetime', sql.DateTime, data.visit_datetime)
      .input('visit_purpose', sql.NVarChar(500), data.visit_purpose)
      .input('contact_name', sql.NVarChar(100), data.contact_name || null)
      .input('contact_email', sql.VarChar(200), data.contact_email || null)
      .input('access_area', sql.VarChar(50), data.access_area)
      .input('vehicle_number', sql.VarChar(20), data.vehicle_number || null)
      .input('vehicle_model', sql.NVarChar(50), data.vehicle_model || null)
      .input('visit_start_time', sql.VarChar(10), data.visit_start_time || null)
      .input('visit_end_time', sql.VarChar(10), data.visit_end_time || null)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now).query(`
        INSERT INTO visit_r3 (
          id, receipt, type, status,
          visitor_name, visitor_phone, visitor_organization, visitor_position,
          visit_datetime, visit_purpose, contact_name, contact_email,
          access_area, vehicle_number, vehicle_model,
          visit_start_time, visit_end_time,
          created_at, updated_at
        ) VALUES (
          @id, @receipt, @type, @status,
          @visitor_name, @visitor_phone, @visitor_organization, @visitor_position,
          @visit_datetime, @visit_purpose, @contact_name, @contact_email,
          @access_area, @vehicle_number, @vehicle_model,
          @visit_start_time, @visit_end_time,
          @created_at, @updated_at
        )
      `)

    console.log('[v0] VISIT_R3 application created in Azure SQL:', id)

    const application: VisitR3Application = {
      id,
      receipt,
      type: Type.VISIT_R3,
      status: Status.PENDING,
      visitor_name: data.visitor_name,
      visitor_phone: data.visitor_phone,
      visitor_organization: data.visitor_organization,
      visitor_position: data.visitor_position,
      visit_datetime: data.visit_datetime,
      visit_purpose: data.visit_purpose,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      access_area: data.access_area,
      vehicle_number: data.vehicle_number,
      vehicle_model: data.vehicle_model,
      visit_start_time: data.visit_start_time,
      visit_end_time: data.visit_end_time,
      created_at: now,
      updated_at: now,
      files: [],
    }

    return application
  }

  // 항만출입 신청서 생성
  static async createPortAccessApplication(
    data: Omit<PortAccessApplication, 'id' | 'receipt' | 'created_at' | 'updated_at' | 'status' | 'type' | 'files'>
  ): Promise<PortAccessApplication> {
    const dbPool = await getPool()
    const receipt = generateReceiptNumber(Type.PORT_ACCESS)
    const now = getKoreaTime()
    const id = `${now.getTime()}-${Math.random().toString(36).substring(7)}`

    console.log('[v0] Creating PORT_ACCESS application:', { id, receipt })

    // 항만출입 신청서 생성
    await dbPool
      .request()
      .input('id', sql.VarChar(50), id)
      .input('receipt', sql.VarChar(50), receipt)
      .input('type', sql.VarChar(20), 'PORT_ACCESS')
      .input('status', sql.VarChar(20), 'PENDING')
      .input('contact_name', sql.NVarChar(100), data.contact_name || null)
      .input('access_area', sql.VarChar(50), data.access_area)
      .input('access_start_datetime', sql.DateTime, data.access_start_datetime)
      .input('access_end_datetime', sql.DateTime, data.access_end_datetime)
      .input('access_purpose', sql.NVarChar(500), data.access_purpose)
      .input('vehicle_number', sql.VarChar(20), data.vehicle_number || null)
      .input('vehicle_model', sql.NVarChar(50), data.vehicle_model || null)
      .input('visit_start_time', sql.VarChar(10), data.visit_start_time || null)
      .input('visit_end_time', sql.VarChar(10), data.visit_end_time || null)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now).query(`
        INSERT INTO port_access (
          id, receipt, type, status,
          contact_name, access_area,
          access_start_datetime, access_end_datetime, access_purpose,
          vehicle_number, vehicle_model,
          visit_start_time, visit_end_time,
          created_at, updated_at
        ) VALUES (
          @id, @receipt, @type, @status,
          @contact_name, @access_area,
          @access_start_datetime, @access_end_datetime, @access_purpose,
          @vehicle_number, @vehicle_model,
          @visit_start_time, @visit_end_time,
          @created_at, @updated_at
        )
      `)

    // 인원 정보 저장
    if (data.personnel && data.personnel.length > 0) {
      for (const person of data.personnel) {
        await dbPool
          .request()
          .input('application_id', sql.VarChar(50), id)
          .input('organization', sql.NVarChar(200), person.organization)
          .input('position', sql.NVarChar(100), person.position)
          .input('name', sql.NVarChar(100), person.name)
          .input('birth_date', sql.VarChar(10), person.birth_date)
          .input('address', sql.NVarChar(300), person.address).query(`
            INSERT INTO port_access_personnel (
              application_id, organization, position, name, birth_date, address
            ) VALUES (
              @application_id, @organization, @position, @name, @birth_date, @address
            )
          `)
      }
    }

    console.log('[v0] PORT_ACCESS application created in Azure SQL:', id)

    const application: PortAccessApplication = {
      id,
      receipt,
      type: Type.PORT_ACCESS,
      status: Status.PENDING,
      contact_name: data.contact_name,
      access_area: data.access_area,
      access_start_datetime: data.access_start_datetime,
      access_end_datetime: data.access_end_datetime,
      access_purpose: data.access_purpose,
      personnel: data.personnel || [],
      vehicle_number: data.vehicle_number,
      vehicle_model: data.vehicle_model,
      visit_start_time: data.visit_start_time,
      visit_end_time: data.visit_end_time,
      created_at: now,
      updated_at: now,
      files: [],
    }

    return application
  }

  // 휴대전화번호로 조회
  static async getApplicationsByPhone(phone: string): Promise<Application[]> {
    const dbPool = await getPool()

    console.log('[v0] Getting applications by phone:', phone)

    const result = await dbPool
      .request()
      .input('phone', sql.NVarChar(20), phone)
      .query('SELECT * FROM visit_applications WHERE visitor_phone = @phone ORDER BY created_at DESC')

    const applications: Application[] = result.recordset.map((row) => {
      // Determine type from receipt prefix or access_area
      const receiptPrefix = row.application_number.split('-')[0]
      let applicationType: Type
      const isPortArea = row.access_area === '항만' || row.access_area?.includes('부두')
      if (receiptPrefix === 'PA' || isPortArea) {
        applicationType = Type.PORT_ACCESS
      } else if (receiptPrefix === 'GV') {
        applicationType = Type.GROUP_VISIT
      } else {
        applicationType = Type.VISIT_R3
      }

      const application: any = {
        id: row.application_id.toString(),
        receipt: row.application_number,
        type: applicationType,
        status: normalizeStatus(row.status),
        visitor_name: row.visitor_name,
        visitor_phone: row.visitor_phone,
        visitor_organization: row.visitor_organization,
        visitor_position: row.visitor_position,
        visit_datetime: new Date(row.visit_start_date),
        visit_purpose: row.visit_purpose,
        contact_name: row.contact_name,
        contact_email: row.visitor_email,
        access_area: row.access_area as AccessArea,
        vehicle_number: row.vehicle_number,
        vehicle_model: row.vehicle_model,
        spark_arrestor: row.spark_arrestor,
        visit_start_time: "09:00",
        visit_end_time: "18:00",
        // Add date fields for all types
        visit_start_date: new Date(row.visit_start_date),
        visit_end_date: new Date(row.visit_end_date || row.visit_start_date),
        access_start_datetime: new Date(row.visit_start_date),
        access_end_datetime: new Date(row.visit_end_date || row.visit_start_date),
        access_purpose: row.visit_purpose,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        rejection_reason: row.rejection_reason,
        files: [],
      }
      return application
    })

    return applications
  }

  // 접수번호로 조회
  static async getApplicationByReceipt(receipt: string): Promise<Application | null> {
    const dbPool = await getPool()

    console.log('[v0] Getting application by receipt:', receipt)

    // Try visit_applications first (new table)
    let result = await dbPool
      .request()
      .input('receipt', sql.NVarChar(50), receipt)
      .query('SELECT * FROM visit_applications WHERE application_number = @receipt')

    if (result.recordset.length > 0) {
      const row = result.recordset[0]

      // Fetch all related data in parallel
      const [companionsResult, devicesResult, companionDevicesResult, filesResult, companionAttachmentsResult, companionPassesResult] = await Promise.all([
        dbPool.request()
          .input('application_id', sql.BigInt, row.application_id)
          .query('SELECT * FROM visit_companions WHERE application_id = @application_id'),
        dbPool.request()
          .input('application_id', sql.BigInt, row.application_id)
          .query('SELECT * FROM visit_electronic_devices WHERE application_id = @application_id'),
        dbPool.request()
          .input('application_id', sql.BigInt, row.application_id)
          .query(`
          SELECT vcd.companion_id, vcd.item_name, vcd.model_name, vcd.serial_number, vcd.reason
          FROM visit_companion_devices vcd
          JOIN visit_companions vc ON vcd.companion_id = vc.companion_id
          WHERE vc.application_id = @application_id
        `),
        dbPool.request()
          .input('application_id', sql.BigInt, row.application_id)
          .query('SELECT * FROM visit_attachments WHERE application_id = @application_id'),
        dbPool.request()
          .input('application_id', sql.BigInt, row.application_id)
          .query(`
          SELECT vca.companion_id, vca.file_name, vca.file_key, vca.blob_url, vca.file_type, vca.file_size, vca.attachment_type
          FROM visit_companion_attachments vca
          JOIN visit_companions vc ON vca.companion_id = vc.companion_id
          WHERE vc.application_id = @application_id
        `).catch(() => ({ recordset: [] })),
        // Fetch companion passes (pass_receipt) from visit_passes
        dbPool.request()
          .input('application_id', sql.BigInt, row.application_id)
          .query(`
          SELECT companion_id, pass_receipt
          FROM visit_passes
          WHERE application_id = @application_id AND companion_id IS NOT NULL AND status = 'ACTIVE'
        `).catch(() => ({ recordset: [] })),
      ])

      const companions = companionsResult.recordset.map((c: any) => ({
        companion_id: c.companion_id,
        name: c.name,
        phone: c.phone,
        birth_date: c.birth_date,
        organization: c.organization,
        position: c.position,
      }))

      const electronicDevices = devicesResult.recordset.map((d: any) => ({
        item_name: d.item_name,
        model_name: d.model_name,
        serial_number: d.serial_number,
        reason: d.reason,
      }))

      const companionsWithDevices = companions.map((c: any) => {
        const devices = companionDevicesResult.recordset
          .filter((d: any) => {
            const actualDeviceId = Array.isArray(d.companion_id) ? d.companion_id[0] : d.companion_id
            return String(actualDeviceId) === String(c.companion_id)
          })
          .map((d: any) => ({
            item_name: d.item_name,
            model_name: d.model_name,
            serial_number: d.serial_number,
            reason: d.reason,
          }))
        const companionPortCerts = (companionAttachmentsResult.recordset || [])
          .filter((a: any) => {
            const actualId = Array.isArray(a.companion_id) ? a.companion_id[0] : a.companion_id
            return String(actualId) === String(c.companion_id)
          })
          .map((a: any) => ({
            filename: a.file_name,
            key: a.file_key,
            url: a.blob_url,
            type: a.file_type,
            size: a.file_size ? Number(a.file_size) : 0,
            attachment_type: a.attachment_type,
          }))
        // Get companion's pass_receipt from visit_passes
        const companionPass = (companionPassesResult.recordset || []).find((p: any) => {
          const actualId = Array.isArray(p.companion_id) ? p.companion_id[0] : p.companion_id
          return String(actualId) === String(c.companion_id)
        })
        const receipt = companionPass?.pass_receipt || null
        return { ...c, electronicDevices: devices, portCertFiles: companionPortCerts, receipt }
      })

      const allFiles = filesResult.recordset.map((f: any) => ({
        filename: f.file_name,
        key: f.file_key,
        url: f.blob_url,
        size: f.file_size ? Number(f.file_size) : 0,
        type: f.file_type,
        attachment_type: f.attachment_type,
      }))
      const files = allFiles.filter((f: any) => f.attachment_type !== 'PORT_CERT')
      const portCertFiles = allFiles.filter((f: any) => f.attachment_type === 'PORT_CERT')

      // Determine type based on receipt prefix or access_area
      const receiptPrefix = row.application_number.split('-')[0]
      let finalType: Type
      const isPortArea = row.access_area === '항만' || row.access_area?.includes('부두')
      if (receiptPrefix === 'PA' || isPortArea) {
        finalType = Type.PORT_ACCESS
      } else if (receiptPrefix === 'GV' || companions.length > 0) {
        finalType = Type.GROUP_VISIT
      } else {
        finalType = Type.VISIT_R3
      }

      console.log('[v0] Application details:', {
        receipt: row.application_number,
        prefix: receiptPrefix,
        access_area: row.access_area,
        finalType,
        visit_start_date: row.visit_start_date,
        visit_end_date: row.visit_end_date,
        companions_count: companions.length
      })

      const application: any = {
        id: row.application_id.toString(),
        receipt: row.application_number,
        type: finalType,
        status: normalizeStatus(row.status),
        visitor_name: row.visitor_name,
        visitor_phone: row.visitor_phone,
        visitor_birth_date: row.visitor_birth_date,
        visitor_organization: row.visitor_organization,
        visitor_position: row.visitor_position,
        visitor_address: row.visitor_address,
        visitor_email: row.visitor_email,
        contact_email: row.visitor_email,
        visit_datetime: new Date(row.visit_start_date),
        visit_purpose: row.visit_purpose,
        detailed_purpose: row.detailed_purpose,
        contact_name: row.contact_name,
        contact_mobile: row.contact_mobile,
        access_area: row.access_area as AccessArea,
        vehicle_number: row.vehicle_number,
        vehicle_model: row.vehicle_model,
        spark_arrestor: row.spark_arrestor,
        visit_start_time: "09:00",
        visit_end_time: "18:00",
        visit_start_date: new Date(row.visit_start_date),
        visit_end_date: new Date(row.visit_end_date || row.visit_start_date),
        access_start_datetime: new Date(row.visit_start_date),
        access_end_datetime: new Date(row.visit_end_date || row.visit_start_date),
        access_purpose: row.visit_purpose,
        electronicDevices,
        personnel: companions.length > 0 ? [
          {
            name: row.visitor_name,
            phone: row.visitor_phone,
            organization: row.visitor_organization,
            position: row.visitor_position,
            birth_date: row.visitor_birth_date || '',
            address: row.visitor_address || ''
          },
          ...companions.map((c: any) => ({
            name: c.name,
            phone: c.phone,
            organization: c.organization || '',
            position: c.position || '',
            birth_date: c.birth_date || '',
            address: ''
          }))
        ] : [{
          name: row.visitor_name,
          phone: row.visitor_phone,
          organization: row.visitor_organization,
          position: row.visitor_position,
          birth_date: row.visitor_birth_date || '',
          address: row.visitor_address || ''
        }],
        companions: companionsWithDevices,
        visitors: companions.length > 0 ? [
          {
            name: row.visitor_name,
            phone: row.visitor_phone,
            organization: row.visitor_organization,
            position: row.visitor_position,
          },
          ...companions
        ] : [],
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        rejection_reason: row.rejection_reason,
        files,
        portCertFiles,
      }

      return application
    }

    // Try port_access
    result = await dbPool
      .request()
      .input('receipt', sql.VarChar(50), receipt)
      .query('SELECT * FROM port_access WHERE receipt = @receipt')

    if (result.recordset.length > 0) {
      const row = result.recordset[0]

      // Get personnel
      const personnelResult = await dbPool
        .request()
        .input('application_id', sql.VarChar(50), row.id)
        .query('SELECT * FROM port_access_personnel WHERE application_id = @application_id')

      const personnel = personnelResult.recordset.map((p) => ({
        organization: p.organization,
        position: p.position,
        name: p.name,
        birth_date: p.birth_date,
        address: p.address,
      }))

      const application: PortAccessApplication = {
        id: row.id,
        receipt: row.receipt,
        type: Type.PORT_ACCESS,
        status: row.status as ApplicationStatus,
        contact_name: row.contact_name,
        access_area: row.access_area as AccessArea,
        access_start_datetime: new Date(row.access_start_datetime),
        access_end_datetime: new Date(row.access_end_datetime),
        access_purpose: row.access_purpose,
        personnel,
        vehicle_number: row.vehicle_number,
        vehicle_model: row.vehicle_model,
        spark_arrestor: row.spark_arrestor,
        visit_start_time: row.visit_start_time,
        visit_end_time: row.visit_end_time,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        rejection_reason: row.rejection_reason,
        files: [],
      }

      return application
    }

    return null
  }

  // ID로 조회
  static async getApplicationById(id: string): Promise<Application | null> {
    const dbPool = await getPool()

    console.log('[v0] Getting application by ID:', id)

    const result = await dbPool.request().input('id', sql.BigInt, parseInt(id)).query('SELECT * FROM visit_applications WHERE application_id = @id')

    if (result.recordset.length === 0) {
      return null
    }

    const row = result.recordset[0]
    const application: VisitR3Application = {
      id: row.application_id.toString(),
      receipt: row.application_number,
      type: Type.VISIT_R3,
      status: row.status as ApplicationStatus,
      visitor_name: row.visitor_name,
      visitor_phone: row.visitor_phone,
      visitor_organization: row.visitor_organization,
      visitor_position: row.visitor_position,
      visit_datetime: new Date(row.visit_start_date),
      visit_start_date: row.visit_start_date,
      visit_end_date: row.visit_end_date,
      visit_purpose: row.visit_purpose,
      contact_name: row.contact_name,
      contact_mobile: row.contact_mobile,
      contact_email: row.visitor_email,
      access_area: row.access_area as AccessArea,
      vehicle_number: row.vehicle_number,
      vehicle_model: row.vehicle_model,
      spark_arrestor: row.spark_arrestor,
      visit_start_time: "09:00",
      visit_end_time: "18:00",
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      rejection_reason: row.rejection_reason,
      files: [],
    }

    return application
  }

  // 모든 신청서 조회 (최적화: 전체 데이터를 4개 쿼리로 한번에 가져와 메모리에서 매핑)
  static async getAllApplications(): Promise<Application[]> {
    const dbPool = await getPool()

    // 6�� 쿼리 병렬 실행으로 N+1 문제 완전 해결
    const [appResult, attachResult, companionResult, companionDeviceResult, deviceResult, companionAttachResult] = await Promise.all([
      dbPool.request().query(`
        SELECT application_id, application_number, status, visitor_name, visitor_phone,
               visitor_organization, visitor_position, visitor_email, visitor_birth_date,
               visitor_address, visit_start_date, visit_end_date,
               visit_purpose, detailed_purpose, contact_name, contact_mobile, access_area,
               vehicle_number, vehicle_model, rejection_reason, created_at, updated_at
        FROM visit_applications WITH (NOLOCK)
        ORDER BY created_at DESC
      `),
      dbPool.request().query(`
        SELECT application_id, file_name, file_key, blob_url, file_type, file_size, attachment_type
        FROM visit_attachments WITH (NOLOCK)
      `),
      dbPool.request().query(`
        SELECT companion_id, application_id, name, phone, birth_date, organization, position
        FROM visit_companions WITH (NOLOCK)
      `),
      dbPool.request().query(`
        SELECT vcd.companion_id, vcd.item_name, vcd.model_name, vcd.serial_number, vcd.reason,
               vc.application_id
        FROM visit_companion_devices vcd WITH (NOLOCK)
        JOIN visit_companions vc WITH (NOLOCK) ON vcd.companion_id = vc.companion_id
      `),
      dbPool.request().query(`
        SELECT application_id, item_name, model_name, serial_number, reason
        FROM visit_electronic_devices WITH (NOLOCK)
      `),
      dbPool.request().query(`
        SELECT companion_id, application_id, file_name, file_key, blob_url, file_type, file_size, attachment_type
        FROM visit_companion_attachments WITH (NOLOCK)
      `).catch(() => ({ recordset: [] })),
    ])

    // 메모리에서 application_id 기준으로 그룹핑
    const attachMap = new Map<string, any[]>()
    const portCertMap = new Map<string, any[]>()
    for (const a of attachResult.recordset) {
      const key = String(a.application_id)
      const fileEntry = { filename: a.file_name, key: a.file_key, url: a.blob_url, type: a.file_type, size: a.file_size ? Number(a.file_size) : 0, attachment_type: a.attachment_type }
      if (a.attachment_type === 'PORT_CERT') {
        if (!portCertMap.has(key)) portCertMap.set(key, [])
        portCertMap.get(key)!.push(fileEntry)
      } else {
        if (!attachMap.has(key)) attachMap.set(key, [])
        attachMap.get(key)!.push(fileEntry)
      }
    }

    // 동행인 첨부파일 맵 (companion_id 기준)
    const companionAttachMap = new Map<string, any[]>()
    for (const a of companionAttachResult.recordset) {
      const key = String(a.companion_id)
      if (!companionAttachMap.has(key)) companionAttachMap.set(key, [])
      companionAttachMap.get(key)!.push({ filename: a.file_name, key: a.file_key, url: a.blob_url, type: a.file_type, size: a.file_size ? Number(a.file_size) : 0, attachment_type: a.attachment_type })
    }

    const companionDeviceMap = new Map<string, any[]>()
    for (const d of companionDeviceResult.recordset) {
      const key = String(d.companion_id)
      if (!companionDeviceMap.has(key)) companionDeviceMap.set(key, [])
      companionDeviceMap.get(key)!.push({ item_name: d.item_name, model_name: d.model_name, serial_number: d.serial_number, reason: d.reason })
    }

    const companionMap = new Map<string, any[]>()
    for (const c of companionResult.recordset) {
      const key = String(c.application_id)
      if (!companionMap.has(key)) companionMap.set(key, [])
      companionMap.get(key)!.push({
        companion_id: String(c.companion_id),
        name: c.name, phone: c.phone, birth_date: c.birth_date,
        organization: c.organization, position: c.position,
        electronicDevices: companionDeviceMap.get(String(c.companion_id)) || [],
        portCertFiles: companionAttachMap.get(String(c.companion_id)) || [],
      })
    }

    const deviceMap = new Map<string, any[]>()
    for (const d of deviceResult.recordset) {
      const key = String(d.application_id)
      if (!deviceMap.has(key)) deviceMap.set(key, [])
      deviceMap.get(key)!.push({ item_name: d.item_name, model_name: d.model_name, serial_number: d.serial_number, reason: d.reason })
    }

    // 신청서에 관련 데이터 매핑
    const applications: Application[] = appResult.recordset.map((row) => {
      const normalizedStatus = normalizeStatus(row.status)
      const appId = String(row.application_id)
      const companions = companionMap.get(appId) || []

      const receiptPrefix = row.application_number.split('-')[0]
      let applicationType: Type
      switch (receiptPrefix) {
        case 'PA': applicationType = Type.PORT_ACCESS; break
        case 'GV': applicationType = Type.GROUP_VISIT; break
        case 'VR': applicationType = Type.VISIT_R3; break
        case 'GI': applicationType = Type.GOODS_INOUT; break
        default:
          applicationType = row.access_area === '항만' ? Type.PORT_ACCESS
            : companions.length > 0 ? Type.GROUP_VISIT
              : Type.VISIT_R3
      }

      return {
        id: appId,
        receipt: row.application_number,
        type: applicationType,
        status: normalizedStatus,
        visitor_name: row.visitor_name,
        visitor_phone: row.visitor_phone,
        visitor_organization: row.visitor_organization,
        visitor_position: row.visitor_position,
        visitor_birth_date: row.visitor_birth_date,
        visitor_address: row.visitor_address,
        visit_datetime: row.visit_start_date ? new Date(row.visit_start_date) : null,
        visit_start_date: row.visit_start_date ? new Date(row.visit_start_date) : null,
        visit_end_date: row.visit_end_date ? new Date(row.visit_end_date) : null,
        visit_purpose: row.visit_purpose,
        detailed_purpose: row.detailed_purpose,
        contact_name: row.contact_name,
        contact_mobile: row.contact_mobile,
        contact_email: row.visitor_email,
        access_area: row.access_area as AccessArea,
        vehicle_number: row.vehicle_number,
        vehicle_model: row.vehicle_model,
        spark_arrestor: row.spark_arrestor,
        visit_start_time: "09:00",
        visit_end_time: "18:00",
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        rejection_reason: row.rejection_reason,
        files: attachMap.get(appId) || [],
        portCertFiles: portCertMap.get(appId) || [],
        companions,
        electronicDevices: deviceMap.get(appId) || [],
      } as any
    })

    return applications
  }

  // 상태 업데이트
  static async updateApplicationStatus(
    id: string,
    status: Status,
    rejectionReason?: string
  ): Promise<Application | null> {
    const dbPool = await getPool()

    console.log('[v0] Updating application status:', { id, status, rejectionReason })

    // DB에는 소문자로 저장
    const dbStatus = status.toLowerCase()
    const now = getKoreaTime()

    // 승인 시 approval_date ��정
    const isApproved = status === Status.APPROVED

    await dbPool
      .request()
      .input('id', sql.BigInt, parseInt(id))
      .input('status', sql.NVarChar(20), dbStatus)
      .input('rejection_reason', sql.NVarChar(500), rejectionReason || null)
      .input('approval_date', sql.DateTime, isApproved ? now : null)
      .input('updated_at', sql.DateTime, now).query(`
        UPDATE visit_applications
        SET status = @status,
            rejection_reason = @rejection_reason,
            approval_date = @approval_date,
            updated_at = @updated_at
        WHERE application_id = @id
      `)

    return await this.getApplicationById(id)
  }

  // 신청 내용 전체 업데이트
  static async updateApplication(id: string, data: any): Promise<Application> {
    const dbPool = await getPool()

    console.log('[v0] Updating full application:', { id, data })

    const now = getKoreaTime()

    await dbPool
      .request()
      .input('id', sql.BigInt, parseInt(id))
      .input('visitor_name', sql.NVarChar(100), data.visitor_name)
      .input('visitor_phone', sql.NVarChar(20), data.visitor_phone)
      .input('visitor_birth_date', sql.Date, data.visitor_birth_date ? new Date(data.visitor_birth_date) : null)
      .input('visitor_organization', sql.NVarChar(200), data.visitor_organization || null)
      .input('visitor_position', sql.NVarChar(100), data.visitor_position || null)
      .input('visitor_address', sql.NVarChar(500), data.visitor_address || null)
      .input('visitor_email', sql.NVarChar(100), data.visitor_email || null)
      .input('contact_name', sql.NVarChar(100), data.contact_name)
      .input('visit_start_date', sql.Date, new Date(data.visit_start_date))
      .input('visit_end_date', sql.Date, data.visit_end_date ? new Date(data.visit_end_date) : new Date(data.visit_start_date))
      .input('access_area', sql.NVarChar(100), data.access_area)
      .input('vehicle_number', sql.NVarChar(20), data.vehicle_number || null)
      .input('vehicle_model', sql.NVarChar(50), data.vehicle_model || null)
      .input('visit_purpose', sql.NVarChar(500), data.visit_purpose)
      .input('status', sql.NVarChar(20), data.status || 'pending')
      .input('updated_at', sql.DateTime, now).query(`
        UPDATE visit_applications
        SET 
          visitor_name = @visitor_name,
          visitor_phone = @visitor_phone,
          visitor_birth_date = @visitor_birth_date,
          visitor_organization = @visitor_organization,
          visitor_position = @visitor_position,
          visitor_address = @visitor_address,
          visitor_email = @visitor_email,
          contact_name = @contact_name,
          visit_start_date = @visit_start_date,
          visit_end_date = @visit_end_date,
          access_area = @access_area,
          vehicle_number = @vehicle_number,
          vehicle_model = @vehicle_model,
          visit_purpose = @visit_purpose,
          status = @status,
          updated_at = @updated_at
        WHERE application_id = @id
      `)

    const updated = await this.getApplicationById(id)
    if (!updated) {
      throw new Error('Application not found after update')
    }

    return updated
  }

  // ─── 계정 관리 ─────────────────────────────────────────

  /** 사용자명으로 계정 조회 (로그인 용) */
  static async getAccountByUsername(username: string): Promise<any | null> {
    const dbPool = await getPool()
    // must_change_password 컬럼이 없는 환경 대비 ISNULL 처리
    const result = await dbPool.request()
      .input('username', sql.NVarChar(100), username)
      .query(`
        SELECT
          account_id,
          username,
          name,
          password_hash,
          role,
          is_active,
          ISNULL(must_change_password, 0) AS must_change_password
        FROM admin_accounts
        WHERE username = @username AND is_active = 1
      `)
    return result.recordset[0] || null
  }

  /** 전체 계정 목록 (슈퍼어드민용) */
  static async getAllAccounts(): Promise<any[]> {
    const dbPool = await getPool()
    const result = await dbPool.request().query(`
      SELECT account_id, username, name, role, phone, is_active, is_security_contact, created_at, last_login_at
      FROM admin_accounts
      ORDER BY created_at DESC
    `)
    return result.recordset
  }

  /** 계정 생성 */
  static async createAccount(data: {
    username: string
    name: string
    password_hash: string
    role: string
  }): Promise<void> {
    const dbPool = await getPool()
    const now = getKoreaTime()
    await dbPool.request()
      .input('username', sql.NVarChar(100), data.username)
      .input('name', sql.NVarChar(100), data.name)
      .input('password_hash', sql.NVarChar(255), data.password_hash)
      .input('role', sql.NVarChar(50), data.role)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .query(`
        INSERT INTO admin_accounts (username, name, password_hash, role, is_active, must_change_password, created_at, updated_at)
        VALUES (@username, @name, @password_hash, @role, 1, 1, @created_at, @updated_at)
      `)
  }

  /** 비밀번호 변경 */
  static async updatePassword(accountId: number, passwordHash: string): Promise<void> {
    const dbPool = await getPool()
    const now = getKoreaTime()
    await dbPool.request()
      .input('account_id', sql.Int, accountId)
      .input('password_hash', sql.NVarChar(255), passwordHash)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE admin_accounts
        SET password_hash = @password_hash, must_change_password = 0, updated_at = @updated_at
        WHERE account_id = @account_id
      `)
  }

  /** 계정 수정 (역할, 이름, 활성화 여부) */
  static async updateAccount(accountId: number, data: { name?: string; role?: string; is_active?: boolean }): Promise<void> {
    const dbPool = await getPool()
    const now = getKoreaTime()
    await dbPool.request()
      .input('account_id', sql.Int, accountId)
      .input('name', sql.NVarChar(100), data.name ?? null)
      .input('role', sql.NVarChar(50), data.role ?? null)
      .input('is_active', sql.Bit, data.is_active !== undefined ? (data.is_active ? 1 : 0) : null)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE admin_accounts SET
          name = ISNULL(@name, name),
          role = ISNULL(@role, role),
          is_active = ISNULL(@is_active, is_active),
          updated_at = @updated_at
        WHERE account_id = @account_id
      `)
  }

  /** 계정 삭제 */
  static async deleteAccount(accountId: number): Promise<void> {
    const dbPool = await getPool()
    await dbPool.request()
      .input('account_id', sql.Int, accountId)
      .query(`DELETE FROM admin_accounts WHERE account_id = @account_id`)
  }

  /** 마지막 로그인 시각 업데이트 */
  static async updateLastLogin(accountId: number): Promise<void> {
    const dbPool = await getPool()
    await dbPool.request()
      .input('account_id', sql.Int, accountId)
      .input('last_login_at', sql.DateTime, getKoreaTime())
      .query(`UPDATE admin_accounts SET last_login_at = @last_login_at WHERE account_id = @account_id`)
  }

  // ─── 신청서 확인 체�� ────────���────���─���─────���──────────────

  /** 확인 체크 조회 */
  static async getApplicationCheck(applicationId: number, accountId: number): Promise<{ checked: boolean; checked_at: Date | null; note: string | null } | null> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('application_id', sql.BigInt, applicationId)
      .input('account_id', sql.Int, accountId)
      .query(`
        SELECT checked, checked_at, note
        FROM application_checks
        WHERE application_id = @application_id AND account_id = @account_id
      `)
    return result.recordset[0] || null
  }

  /** 신청서 ID 기준 전체 체크 목록 조회 */
  static async getApplicationChecks(applicationId: number): Promise<any[]> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('application_id', sql.BigInt, applicationId)
      .query(`
        SELECT ac.checked, ac.checked_at, ac.note, aa.name, aa.role
        FROM application_checks ac
        JOIN admin_accounts aa ON ac.account_id = aa.account_id
        WHERE ac.application_id = @application_id
      `)
    return result.recordset
  }

  /** 확인 체크 저장/업데이트 (UPSERT) */
  static async setApplicationCheck(applicationId: number, accountId: number, checked: boolean, note?: string): Promise<void> {
    const dbPool = await getPool()
    const now = getKoreaTime()
    await dbPool.request()
      .input('application_id', sql.BigInt, applicationId)
      .input('account_id', sql.Int, accountId)
      .input('checked', sql.Bit, checked ? 1 : 0)
      .input('checked_at', sql.DateTime, checked ? now : null)
      .input('note', sql.NVarChar(500), note || null)
      .query(`
        MERGE application_checks AS target
        USING (SELECT @application_id AS application_id, @account_id AS account_id) AS source
        ON target.application_id = source.application_id AND target.account_id = source.account_id
        WHEN MATCHED THEN
          UPDATE SET checked = @checked, checked_at = @checked_at, note = @note
        WHEN NOT MATCHED THEN
          INSERT (application_id, account_id, checked, checked_at, note)
          VALUES (@application_id, @account_id, @checked, @checked_at, @note);
      `)
  }

  // ─── 역할별 페이�� 권한 ────────────────────────────────────

  /** 특정 역할의 권한 목록 조회 */
  static async getRolePermissions(role: string): Promise<any[]> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('role', sql.NVarChar(50), role)
      .query(`
        SELECT id, role, page_path, page_name, allowed
        FROM role_permissions
        WHERE role = @role
        ORDER BY page_path
      `)
    return result.recordset
  }

  /** 전체 역할 권한 목록 조회 (슈퍼어드민 관리용) */
  static async getAllRolePermissions(): Promise<any[]> {
    const dbPool = await getPool()
    const result = await dbPool.request().query(`
      SELECT id, role, page_path, page_name, allowed
      FROM role_permissions
      ORDER BY role, page_path
    `)
    return result.recordset
  }

  /** 역할별 특정 페이지 권한 업데이트 */
  static async updateRolePermission(role: string, pagePath: string, allowed: boolean): Promise<void> {
    const dbPool = await getPool()
    await dbPool.request()
      .input('role', sql.NVarChar(50), role)
      .input('page_path', sql.NVarChar(200), pagePath)
      .input('allowed', sql.Bit, allowed ? 1 : 0)
      .query(`
        MERGE role_permissions AS target
        USING (SELECT @role AS role, @page_path AS page_path) AS source
        ON target.role = source.role AND target.page_path = source.page_path
        WHEN MATCHED THEN
          UPDATE SET allowed = @allowed
        WHEN NOT MATCHED THEN
          INSERT (role, page_path, page_name, allowed)
          VALUES (@role, @page_path, @page_path, @allowed);
      `)
  }

  /** 특정 역할이 특정 페이지에 접근 가���한��� 확인 */
  static async canRoleAccessPage(role: string, pagePath: string): Promise<boolean> {
    if (role === 'super_admin') return true
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('role', sql.NVarChar(50), role)
      .input('page_path', sql.NVarChar(200), pagePath)
      .query(`
        SELECT allowed FROM role_permissions
        WHERE role = @role AND page_path = @page_path
      `)
    if (!result.recordset[0]) return false
    return result.recordset[0].allowed === true
  }

  // 통계 조회
  static async getApplicationStats() {
    const dbPool = await getPool()

    const totalResult = await dbPool.request().query('SELECT COUNT(*) as total FROM visit_applications')

    const statusResult = await dbPool.request().query(`
      SELECT status, COUNT(*) as count
      FROM visit_applications
      GROUP BY status
    `)

    const totalApplications = totalResult.recordset[0].total

    const statusStats: Record<string, number> = {}
    statusResult.recordset.forEach((row: any) => {
      statusStats[row.status] = row.count
    })

    // Get all applications to determine type based on companions
    const allApps = await this.getAllApplications()

    const typeStats: Record<string, number> = {
      GROUP_VISIT: 0,
      VISIT_R3: 0,
      PORT_ACCESS: 0,
    }

    allApps.forEach(app => {
      if (app.type && typeStats[app.type] !== undefined) {
        typeStats[app.type] = (typeStats[app.type] || 0) + 1
      }
    })

    // Monthly stats for the last 6 months (한국시간 기준)
    const now = getKoreaTime()
    const monthlyStats = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() + 1
      const monthName = `${year}년 ${month}월`

      const monthResult = await dbPool
        .request()
        .input('year', sql.Int, year)
        .input('month', sql.Int, month).query(`
        SELECT COUNT(*) as total
        FROM visit_applications
        WHERE YEAR(created_at) = @year AND MONTH(created_at) = @month
      `)

      const monthStatusResult = await dbPool
        .request()
        .input('year', sql.Int, year)
        .input('month', sql.Int, month).query(`
        SELECT status, COUNT(*) as count
        FROM visit_applications
        WHERE YEAR(created_at) = @year AND MONTH(created_at) = @month
        GROUP BY status
      `)

      const byStatus: Record<string, number> = {}
      monthStatusResult.recordset.forEach((row: any) => {
        byStatus[row.status] = row.count
      })

      // Filter apps for this month to get type stats
      const monthApps = allApps.filter(app => {
        const appDate = new Date(app.created_at)
        return appDate.getFullYear() === year && appDate.getMonth() + 1 === month
      })

      const byType: Record<string, number> = {
        GROUP_VISIT: 0,
        VISIT_R3: 0,
        PORT_ACCESS: 0,
      }

      monthApps.forEach(app => {
        if (app.type && byType[app.type] !== undefined) {
          byType[app.type] = (byType[app.type] || 0) + 1
        }
      })

      monthlyStats.push({
        month: monthName,
        count: monthResult.recordset[0].total,
        byType,
        byStatus,
      })
    }

    // Get organization stats
    // 2. 주요 방문 기관 통계 (DB에서 직접 집계)
    // NULL이거나 빈 문자열인 경우 '미지정'으로 처리
    const orgResult = await dbPool.request().query(`
    SELECT 
      ISNULL(NULLIF(visitor_organization, ''), '미지정') as organization, 
      COUNT(*) as count
    FROM visit_applications
    GROUP BY visitor_organization
    ORDER BY count DESC
  `)
    const organizationStats = orgResult.recordset.map(row => ({
      organization: row.organization,
      count: row.count
    }))
    return {
      totalApplications,
      statusStats,
      typeStats,
      monthlyStats,
      organizationStats,
    }
  }

  // ─── QR 출입권 관리 ────────────────────────────────────

  /** �����유����� pass_receipt (QR 코드) ���성 */
  static generatePassReceipt(): string {
    // 형식: QR-YYYYMMDD-XXXXXX (6������ 랜덤)
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `QR-${dateStr}-${random}`
  }

  /** 신청 승인 시 pass_receipt 저장 */
  static async createPassForApplication(applicationId: string, pass_receipt: string): Promise<void> {
    const dbPool = await getPool()
    // token ������ (���� 토큰: UUID 대신 ���� ���������)
    const token = `TOKEN-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    // 신청 정보에서 방문 기간 가져오기
    const appResult = await dbPool.request()
      .input('app_id', sql.BigInt, applicationId)
      .query(`SELECT visit_start_date, visit_end_date FROM visit_applications WHERE application_id = @app_id`)

    const validFrom = appResult.recordset[0]?.visit_start_date || new Date()
    // visit_end_date는 DATE 타입이므로 23:59:59로 설정하여 종료일 끝까지 유효하게 함
    const validToDate = new Date(appResult.recordset[0]?.visit_end_date || new Date())
    validToDate.setHours(23, 59, 59, 999)

    await dbPool.request()
      .input('application_id', sql.BigInt, applicationId)
      .input('pass_receipt', sql.NVarChar(50), pass_receipt)
      .input('token', sql.NVarChar(100), token)
      .input('valid_from', sql.DateTime, validFrom)
      .input('valid_to', sql.DateTime, validToDate)
      .query(`
        INSERT INTO visit_passes (application_id, pass_receipt, token, status, valid_from, valid_to)
        VALUES (@application_id, @pass_receipt, @token, 'active', @valid_from, @valid_to)
      `)
  }

  /** pass_receipt로 신청 ��회 */
  static async getApplicationByPassReceipt(pass_receipt: string): Promise<any> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('pass_receipt', sql.NVarChar(50), pass_receipt)
      .query(`
        SELECT a.*, p.pass_id, p.pass_receipt
        FROM visit_applications a
        INNER JOIN visit_passes p ON a.application_id = p.application_id
        WHERE p.pass_receipt = @pass_receipt
      `)
    return result.recordset[0] || null
  }

  /** QR 입/퇴장 검증 및 기록 */
  static async verifyVisitPassByReceiptWithDirection(
    receipt: string,
    direction: "ENTRY" | "EXIT",
    device_id: string,
    scanned_ip: string | null,
    user_agent: string | null,
    scan_site: string = "MAIN"
  ): Promise<{ result: string; message: string; denyReason?: string }> {
    const dbPool = await getPool()

    // pass_receipt로 신청 조회 (동행인 QR인 경우 동행인 이름 사용)
    const appResult = await dbPool.request()
      .input('pass_receipt', sql.NVarChar(50), receipt)
      .query(`
        SELECT a.application_id, a.visitor_name, a.visitor_organization as visitor_org, 
               a.contact_name, a.access_area, a.visit_start_date, a.visit_end_date, a.status, 
               p.pass_id, p.companion_id, c.name as companion_name
        FROM visit_applications a
        INNER JOIN visit_passes p ON a.application_id = p.application_id
        LEFT JOIN visit_companions c ON p.companion_id = c.companion_id
        WHERE p.pass_receipt = @pass_receipt
      `)

    if (!appResult.recordset[0]) {
      return { result: "DENY", message: "승인된 출입권이 없습니다", denyReason: "NOT_FOUND" }
    }

    const app = appResult.recordset[0]
    // 동행인 QR인 경우 동행인 이름 사용, 아니면 신청자 이름 사용
    const displayName = app.companion_id ? app.companion_name : app.visitor_name
    if (app.status !== 'approved') {
      return { result: "DENY", message: "승인되지 않은 신청입니다", denyReason: "NOT_APPROVED" }
    }

    const now = getKoreaTime()

    // 방문 기간 확인
    if (app.visit_start_date && now < new Date(app.visit_start_date)) {
      return { result: "DENY", message: "방문 예정 시간이 아닙니다", denyReason: "NOT_YET" }
    }

    // visit_end_date는 DATE 타입이므로 23:59:59까지 유효
    const visitEnd = new Date(app.visit_end_date)
    visitEnd.setHours(23, 59, 59, 999)
    if (app.visit_end_date && now > visitEnd) {
      return { result: "DENY", message: "방문 기간이 만료되었습니다", denyReason: "EXPIRED" }
    }

    // 스캔 기록 저장
    // 퇴장(EXIT) 시 입장 이력 확인 - 같은 사이트에서의 최근 스캔이 ENTRY인지 확인
    if (direction === 'EXIT') {
      const lastScanResult = await dbPool.request()
        .input('pass_id', sql.UniqueIdentifier, app.pass_id)
        .input('scan_site', sql.NVarChar(50), scan_site)
        .query(`
          SELECT TOP 1 direction FROM visit_pass_scans
          WHERE pass_id = @pass_id AND scan_site = @scan_site
          ORDER BY scanned_at DESC
        `)

      // 최근 스캔이 없거나 EXIT면 입장 기록이 없는 것
      if (lastScanResult.recordset.length === 0 || lastScanResult.recordset[0].direction === 'EXIT') {
        return {
          result: "DENY",
          message: "입장 기록이 없습니다",
          denyReason: "NO_ENTRY_RECORD",
          is_companion: !!app.companion_id
        }
      }
    }

    try {
      const now = getKoreaTime()

      // 백엔드 중복 방지 - 정확히 같은 시각(1초 내) 동일 pass_id, direction, scan_site, device_id 스캔만 중복 처리
      const recentScanResult = await dbPool.request()
        .input('pass_id', sql.UniqueIdentifier, app.pass_id)
        .input('direction', sql.NVarChar(10), direction)
        .input('scan_site', sql.NVarChar(50), scan_site)
        .input('device_id', sql.NVarChar(100), device_id || null)
        .input('now_100ms_ago', sql.DateTime2, new Date(now.getTime() - 100)) // 100ms 이내만 중복
        .query(`
          SELECT TOP 1 scan_id FROM visit_pass_scans
          WHERE pass_id = @pass_id AND direction = @direction AND scan_site = @scan_site
            AND device_id = @device_id AND scanned_at > @now_100ms_ago
        `)

      // 100ms 이내 정확히 동일한 스캔이 없을 때만 INSERT
      if (recentScanResult.recordset.length === 0) {
        await dbPool.request()
          .input('pass_id', sql.UniqueIdentifier, app.pass_id)
          .input('application_id', sql.BigInt, app.application_id)
          .input('direction', sql.NVarChar(10), direction)
          .input('device_id', sql.NVarChar(100), device_id || null)
          .input('result', sql.NVarChar(20), 'ALLOW')
          .input('scanned_ip', sql.NVarChar(50), scanned_ip || null)
          .input('user_agent', sql.NVarChar(500), user_agent || null)
          .input('visitor_name', sql.NVarChar(100), displayName)
          .input('visitor_org', sql.NVarChar(200), app.visitor_org || null)
          .input('contact_name', sql.NVarChar(100), app.contact_name || null)
          .input('access_area', sql.NVarChar(100), app.access_area || null)
          .input('scan_site', sql.NVarChar(50), scan_site)
          .input('scanned_at', sql.DateTime2, now)
          .query(`
            INSERT INTO visit_pass_scans (pass_id, application_id, direction, device_id, result, scanned_ip, user_agent, visitor_name, visitor_org, contact_name, access_area, scan_site, scanned_at)
            VALUES (@pass_id, @application_id, @direction, @device_id, @result, @scanned_ip, @user_agent, @visitor_name, @visitor_org, @contact_name, @access_area, @scan_site, @scanned_at)
          `)
      }
    } catch (e) {
      console.error('[v0] Failed to record scan:', e)
    }

    return {
      result: "ALLOW",
      message: `${direction === 'ENTRY' ? '입장' : '퇴장'} 처리되었습니다`,
      visitor_name: displayName,
      visitor_org: app.visitor_org,
      access_area: app.access_area,
      visit_start_date: app.visit_start_date,
      visit_end_date: app.visit_end_date,
      is_companion: !!app.companion_id,
    }
  }

  /** 휴대폰 번호로 승인된 신청 조회 (신청자 + 동행인 포함) */
  static async getApprovedApplicationsByPhone(phone: string): Promise<any[]> {
    const dbPool = await getPool()

    // 신청자 본인 번호로 조회 (companion_id 없는 pass)
    const applicantResult = await dbPool.request()
      .input('phone', sql.NVarChar(20), phone)
      .query(`
        SELECT a.application_id, a.application_number, a.visitor_name, a.visit_start_date, 
               a.visit_end_date, a.access_area, p.pass_receipt
        FROM visit_applications a
        INNER JOIN visit_passes p ON a.application_id = p.application_id
        WHERE a.visitor_phone = @phone 
          AND a.status = 'approved'
          AND (p.companion_id IS NULL OR p.companion_id = 0)
        ORDER BY a.created_at DESC
      `)

    // 동행인 번호로 조회 (companion_id 있는 pass)
    const companionResult = await dbPool.request()
      .input('phone', sql.NVarChar(20), phone)
      .query(`
        SELECT a.application_id, a.application_number, c.name as visitor_name, a.visit_start_date, 
               a.visit_end_date, a.access_area, p.pass_receipt
        FROM visit_companions c
        INNER JOIN visit_applications a ON c.application_id = a.application_id
        INNER JOIN visit_passes p ON p.companion_id = c.companion_id
        WHERE c.phone = @phone 
          AND a.status = 'approved'
        ORDER BY a.created_at DESC
      `)

    return [...applicantResult.recordset, ...companionResult.recordset]
  }

  /** QR 스캔 로그 조회 (출입현황) */
  /** QR 스캔 로그 조회 (입장/퇴장 사이클별) */
  static async getQrScanLogs(scanSite: string, limit: number = 100, filterParams?: { date?: string } | { startDate?: string; endDate?: string }): Promise<any[]> {
    const dbPool = await getPool()

    // 범위 검색 여부 판단
    const isRangeSearch = filterParams && 'startDate' in filterParams && 'endDate' in filterParams

    let scanWhereClause = ""
    let passWhereClause = ""
    const request = dbPool.request()
      .input('scan_site', sql.NVarChar(50), scanSite)
      .input('limit', sql.Int, limit)

    if (isRangeSearch && filterParams) {
      const { startDate, endDate } = filterParams
      request
        .input('start_date', sql.Date, startDate || new Date().toISOString().split('T')[0])
        .input('end_date', sql.Date, endDate || new Date().toISOString().split('T')[0])
      // 별칭 없이 컬럼명만 사용 (CTE 내부에서 s. 별칭은 각 쿼���에서 직접 지정)
      scanWhereClause = `AND CAST(scanned_at AS DATE) >= @start_date AND CAST(scanned_at AS DATE) <= @end_date`
      passWhereClause = `AND CAST(a.visit_start_date AS DATE) <= @end_date AND CAST(a.visit_end_date AS DATE) >= @start_date`
    } else {
      const targetDate = filterParams && 'date' in filterParams ? filterParams.date : new Date().toISOString().split('T')[0]
      request.input('filter_date', sql.Date, targetDate)
      scanWhereClause = `AND CAST(scanned_at AS DATE) = @filter_date`
      passWhereClause = `AND CAST(a.visit_start_date AS DATE) <= @filter_date AND CAST(a.visit_end_date AS DATE) >= @filter_date`
    }

    const result = await request.query(`
        ;WITH 
        -- 1. 승인된 모든 출입증 (신청인 + 동행인)
        ApprovedPasses AS (
          SELECT 
            p.pass_id,
            p.application_id,
            p.companion_id,
            p.issued_at,
            a.visitor_name,
            a.visitor_organization,
            a.contact_name,
            a.contact_mobile,
            a.visitor_birth_date,
            a.vehicle_number,
            a.vehicle_model,
            a.spark_arrestor,
            a.visit_start_date,
            a.visit_end_date,
            a.access_area,
            c.name as companion_name,
            c.birth_date as companion_birth_date
          FROM visit_passes p
          LEFT JOIN visit_applications a ON p.application_id = a.application_id
          LEFT JOIN visit_companions c ON p.companion_id = c.companion_id
          WHERE p.status = 'active' ${passWhereClause}
        ),
        -- 2. 검색 날짜에 해당하는 스캔 기록 (날짜 필터 적용)
        FilteredScans AS (
          SELECT 
            s.pass_id,
            s.scanned_at,
            s.direction,
            s.device_id,
            s.scanned_ip,
            s.scan_site
          FROM visit_pass_scans s
          INNER JOIN ApprovedPasses ap ON s.pass_id = ap.pass_id
          WHERE s.scan_site = @scan_site AND s.result = 'ALLOW'
            AND CAST(s.scanned_at AS DATE) ${isRangeSearch ? `>= @start_date AND CAST(s.scanned_at AS DATE) <= @end_date` : `= @filter_date`}
        ),
        -- 3. 입장 기록에 순번 부여
        EntryScans AS (
          SELECT 
            pass_id,
            scanned_at as entry_at,
            device_id as entry_device_id,
            scanned_ip as entry_scanned_ip,
            scan_site,
            ROW_NUMBER() OVER (PARTITION BY pass_id ORDER BY scanned_at ASC) as entry_rn
          FROM FilteredScans
          WHERE direction = 'ENTRY'
        ),
        -- 4. 퇴장 기록에 순번 부여
        ExitScans AS (
          SELECT 
            pass_id,
            scanned_at as exit_at,
            device_id as exit_device_id,
            scanned_ip as exit_scanned_ip,
            ROW_NUMBER() OVER (PARTITION BY pass_id ORDER BY scanned_at ASC) as exit_rn
          FROM FilteredScans
          WHERE direction = 'EXIT'
        ),
        -- 5. 입장/퇴장 사이클 매칭 (N번째 입장 - N번째 퇴장)
        EntryCycles AS (
          -- 입장 기록이 있는 경우 (입장 기준으로 퇴장 매칭)
          SELECT 
            e.pass_id,
            e.entry_at,
            e.entry_device_id,
            e.entry_scanned_ip,
            e.scan_site,
            e.entry_rn as cycle_num,
            x.exit_at,
            x.exit_device_id,
            x.exit_scanned_ip,
            CASE WHEN x.exit_at IS NOT NULL THEN 'EXIT' ELSE 'ENTRY' END as cycle_status
          FROM EntryScans e
          LEFT JOIN ExitScans x ON e.pass_id = x.pass_id AND e.entry_rn = x.exit_rn
          
          UNION ALL
          
          -- 퇴장만 있고 입장이 없는 경우 (다른 날 입장 후 오늘 퇴장)
          SELECT 
            x.pass_id,
            NULL as entry_at,
            NULL as entry_device_id,
            NULL as entry_scanned_ip,
            @scan_site as scan_site,
            x.exit_rn as cycle_num,
            x.exit_at,
            x.exit_device_id,
            x.exit_scanned_ip,
            'EXIT' as cycle_status
          FROM ExitScans x
          WHERE NOT EXISTS (
            SELECT 1 FROM EntryScans e WHERE e.pass_id = x.pass_id
          )
        ),
        -- 6. 입장/퇴장 총 횟수
        ScanCounts AS (
          SELECT 
            pass_id,
            SUM(CASE WHEN direction = 'ENTRY' THEN 1 ELSE 0 END) as entry_count,
            SUM(CASE WHEN direction = 'EXIT' THEN 1 ELSE 0 END) as exit_count
          FROM FilteredScans
          GROUP BY pass_id
        )
        -- 스캔 기록이 있는 방문자 (각 사이클별로 별도 행)
        SELECT TOP (@limit)
          ap.pass_id,
          ap.application_id,
          ap.companion_id,
          COALESCE(ap.companion_name, ap.visitor_name) as visitor_name,
          ap.visitor_organization,
          ap.contact_name,
          ap.contact_mobile,
          COALESCE(ap.companion_birth_date, ap.visitor_birth_date) as visitor_birth_date,
          ap.vehicle_number,
          ap.vehicle_model,
          ap.spark_arrestor,
          ap.visit_start_date,
          ap.visit_end_date,
          ap.access_area,
          ec.entry_at,
          ec.entry_device_id,
          ec.entry_scanned_ip,
          ec.scan_site,
          ec.exit_at,
          ec.exit_device_id,
          ec.exit_scanned_ip,
          ec.cycle_num,
          ec.cycle_status as last_scan_direction,
          COALESCE(sc.entry_count, 0) as entry_count,
          COALESCE(sc.exit_count, 0) as exit_count,
          COALESCE(ec.exit_at, ec.entry_at, ap.issued_at) as last_event_at
        FROM ApprovedPasses ap
        INNER JOIN EntryCycles ec ON ap.pass_id = ec.pass_id
        LEFT JOIN ScanCounts sc ON ap.pass_id = sc.pass_id
        
        UNION ALL
        
        -- 스캔 기록이 없는 방문자 (아직 입장 전)
        SELECT TOP (@limit)
          ap.pass_id,
          ap.application_id,
          ap.companion_id,
          COALESCE(ap.companion_name, ap.visitor_name) as visitor_name,
          ap.visitor_organization,
          ap.contact_name,
          ap.contact_mobile,
          COALESCE(ap.companion_birth_date, ap.visitor_birth_date) as visitor_birth_date,
          ap.vehicle_number,
          ap.vehicle_model,
          ap.spark_arrestor,
          ap.visit_start_date,
          ap.visit_end_date,
          ap.access_area,
          NULL as entry_at,
          NULL as entry_device_id,
          NULL as entry_scanned_ip,
          NULL as scan_site,
          NULL as exit_at,
          NULL as exit_device_id,
          NULL as exit_scanned_ip,
          NULL as cycle_num,
          NULL as last_scan_direction,
          0 as entry_count,
          0 as exit_count,
          ap.issued_at as last_event_at
        FROM ApprovedPasses ap
        WHERE NOT EXISTS (
          SELECT 1 FROM FilteredScans fs WHERE fs.pass_id = ap.pass_id
        )
        
        ORDER BY last_event_at DESC
      `)
    return result.recordset
  }

  /** QR 스캔 통계 조회 */
  static async getQrScanStats(scanSite: string, filterParams?: { date?: string } | { startDate?: string; endDate?: string }): Promise<any> {
    const dbPool = await getPool()

    // 범위 검색 여부 판단
    const isRangeSearch = filterParams && 'startDate' in filterParams && 'endDate' in filterParams

    let scanWhereClause = ""
    let passWhereClause = ""
    const request = dbPool.request()
      .input('scan_site', sql.NVarChar(50), scanSite)

    if (isRangeSearch && filterParams) {
      const { startDate, endDate } = filterParams
      request
        .input('start_date', sql.Date, startDate || new Date().toISOString().split('T')[0])
        .input('end_date', sql.Date, endDate || new Date().toISOString().split('T')[0])
      scanWhereClause = `AND CAST(scanned_at AS DATE) >= @start_date AND CAST(scanned_at AS DATE) <= @end_date`
      // 방문 기간이 검색 범위와 겹치는 경우 포함
      passWhereClause = `AND p.pass_id IN (SELECT vp.pass_id FROM visit_passes vp LEFT JOIN visit_applications va ON vp.application_id = va.application_id WHERE vp.status = 'active' AND CAST(va.visit_start_date AS DATE) <= @end_date AND CAST(va.visit_end_date AS DATE) >= @start_date)`
    } else {
      const targetDate = filterParams && 'date' in filterParams ? filterParams.date : new Date().toISOString().split('T')[0]
      request.input('filter_date', sql.Date, targetDate)
      scanWhereClause = `AND CAST(scanned_at AS DATE) = @filter_date`
      // 검색 날짜가 방문 기간 안에 포함되는 경우
      passWhereClause = `AND p.pass_id IN (SELECT vp.pass_id FROM visit_passes vp LEFT JOIN visit_applications va ON vp.application_id = va.application_id WHERE vp.status = 'active' AND CAST(va.visit_start_date AS DATE) <= @filter_date AND CAST(va.visit_end_date AS DATE) >= @filter_date)`
    }

    const result = await request.query(`
        -- 1. visit_passes에서 날짜 기준 승인된 인원 (신청인 + 동행인, 방문 기간 포함)
        DECLARE @approvedCount INT = (
          SELECT COUNT(*) FROM visit_passes p
          WHERE p.status = 'active' ${passWhereClause}
        );
        
        -- 2. 입장 스캔한 고유 pass_id 수
        DECLARE @entryScannedCount INT = (
          SELECT COUNT(DISTINCT pass_id) FROM visit_pass_scans 
          WHERE scan_site = @scan_site AND direction = 'ENTRY' AND result = 'ALLOW' ${scanWhereClause}
        );
        
        -- 3. 퇴장 스캔한 고유 pass_id 수
        DECLARE @exitScannedCount INT = (
          SELECT COUNT(DISTINCT pass_id) FROM visit_pass_scans 
          WHERE scan_site = @scan_site AND direction = 'EXIT' AND result = 'ALLOW' ${scanWhereClause}
        );
        
        -- 4. 현재 내부 체류 중 (마지막 스캔이 ENTRY인 사람)
        DECLARE @currentlyInsideCount INT = (
          SELECT COUNT(*) FROM (
            SELECT pass_id, direction,
              ROW_NUMBER() OVER (PARTITION BY pass_id ORDER BY scanned_at DESC) as rn
            FROM visit_pass_scans
            WHERE scan_site = @scan_site AND result = 'ALLOW' ${scanWhereClause}
          ) t WHERE t.rn = 1 AND t.direction = 'ENTRY'
        );
        
        -- 5. 퇴장 완료 (마지막 스캔이 EXIT인 사람)
        DECLARE @checkedOutCount INT = (
          SELECT COUNT(*) FROM (
            SELECT pass_id, direction,
              ROW_NUMBER() OVER (PARTITION BY pass_id ORDER BY scanned_at DESC) as rn
            FROM visit_pass_scans
            WHERE scan_site = @scan_site AND result = 'ALLOW' ${scanWhereClause}
          ) t WHERE t.rn = 1 AND t.direction = 'EXIT'
        );
        
        -- 6. 재입장자 수 (당일 입장+퇴장 각각 2회 이상 스캔된 사람)
        DECLARE @reentryCount INT = (
          SELECT COUNT(*) FROM (
            SELECT pass_id
            FROM visit_pass_scans
            WHERE scan_site = @scan_site AND result = 'ALLOW' ${scanWhereClause}
            GROUP BY pass_id
            HAVING SUM(CASE WHEN direction = 'ENTRY' THEN 1 ELSE 0 END) >= 2
               AND SUM(CASE WHEN direction = 'EXIT' THEN 1 ELSE 0 END) >= 2
          ) reentries
        );
        
        SELECT 
          @approvedCount as approvedCount,
          @entryScannedCount as entryScannedCount,
          @exitScannedCount as exitScannedCount,
          @currentlyInsideCount as currentlyInsideCount,
          @checkedOutCount as checkedOutCount,
          @reentryCount as reentryCount,
          (@approvedCount - @entryScannedCount) as pendingCount
      `)

    const stats = result.recordset[0] || {
      approvedCount: 0,
      entryScannedCount: 0,
      exitScannedCount: 0,
      currentlyInsideCount: 0,
      checkedOutCount: 0,
      reentryCount: 0,
      pendingCount: 0
    }

    return {
      // 방문신청 카드: 승인 인원 - 입장 스캔 인원 = 아직 입장 안 한 인원
      pendingCount: Math.max(0, stats.pendingCount),
      // 체크인 카드: 현재 내부 체류 중 (입장O, 퇴장X)
      checkInCount: stats.currentlyInsideCount,
      // 체크아웃 카드: 퇴장 완료 (입장O, 퇴장O)
      checkOutCount: stats.checkedOutCount,
      // 전체 카드: 승인 인원
      totalApprovedCount: stats.approvedCount,
      // 전체 카드: 재입장자 수
      reentryCount: stats.reentryCount
    }
  }

  /** 보안담당자 계정의 전화번호 목록 조회 (is_security_contact = 1) */
  static async getSecurityAccountPhones(): Promise<string[]> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .query(`
        SELECT phone FROM admin_accounts
        WHERE is_security_contact = 1 AND is_active = 1 AND phone IS NOT NULL AND phone <> ''
      `)
    return result.recordset.map((r: any) => r.phone)
  }

  /** 신청 ID로 동행인 전화번����� 목록 조회 */
  static async getCompanionPhonesByApplicationId(applicationId: string): Promise<string[]> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('application_id', sql.BigInt, applicationId)
      .query(`
        SELECT phone FROM visit_companions
        WHERE application_id = @application_id AND phone IS NOT NULL AND phone <> ''
      `)
    return result.recordset.map((r: any) => r.phone)
  }

  /** 동행인 목록 조회 (id, phone 포함) */
  static async getCompanionsWithIdByApplicationId(applicationId: string): Promise<{ companion_id: number; name: string; phone: string }[]> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('application_id', sql.BigInt, applicationId)
      .query(`
        SELECT companion_id, name, phone FROM visit_companions
        WHERE application_id = @application_id
        ORDER BY companion_id ASC
      `)
    return result.recordset
  }

  /** 동행인 QR pass 생성 */
  static async createPassForCompanion(applicationId: string, companionId: number, pass_receipt: string): Promise<void> {
    const dbPool = await getPool()
    const token = `TOKEN-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    // 신청 정보에서 방문 기간 가져오기
    const appResult = await dbPool.request()
      .input('app_id', sql.BigInt, applicationId)
      .query(`SELECT visit_start_date, visit_end_date FROM visit_applications WHERE application_id = @app_id`)

    const validFrom = appResult.recordset[0]?.visit_start_date || new Date()
    // visit_end_date는 DATE 타입이므로 23:59:59로 설정하여 종료일 끝까지 유효하게 함
    const validToDate = new Date(appResult.recordset[0]?.visit_end_date || new Date())
    validToDate.setHours(23, 59, 59, 999)

    await dbPool.request()
      .input('application_id', sql.BigInt, applicationId)
      .input('companion_id', sql.BigInt, companionId)
      .input('pass_receipt', sql.NVarChar(50), pass_receipt)
      .input('token', sql.NVarChar(100), token)
      .input('valid_from', sql.DateTime, validFrom)
      .input('valid_to', sql.DateTime, validToDate)
      .query(`
        INSERT INTO visit_passes (application_id, companion_id, pass_receipt, token, status, valid_from, valid_to)
        VALUES (@application_id, @companion_id, @pass_receipt, @token, 'active', @valid_from, @valid_to)
      `)
  }

  /** 여러 application_id에 대한 항만이수증 파일 조회 (신청자 본인 항만이수증만) */
  static async getPortCertFilesByApplicationIds(applicationIds: number[]): Promise<Array<{ application_id: number; file_url: string; file_name: string }>> {
    if (applicationIds.length === 0) return []
    const dbPool = await getPool()

    const placeholders = applicationIds.map((_, i) => `@id${i}`).join(',')
    const request = dbPool.request()
    applicationIds.forEach((id, i) => {
      request.input(`id${i}`, sql.Int, id)
    })

    // 신청자 본인의 항만이수증만 조회 (동행인 제외)
    const result = await request.query(`
      SELECT application_id, blob_url AS file_url, file_name
      FROM visit_attachments
      WHERE application_id IN (${placeholders}) AND attachment_type = 'PORT_CERT'
    `)
    return result.recordset
  }

  /** 보안담당자 지정/해제 및 전화번호 업데이트 */
  static async updateSecurityContact(accountId: number, isSecurityContact?: boolean, phone?: string): Promise<void> {
    const dbPool = await getPool()
    const updates: string[] = []
    const request = dbPool.request().input('account_id', sql.Int, accountId)

    if (typeof isSecurityContact === 'boolean') {
      updates.push('is_security_contact = @is_security_contact')
      request.input('is_security_contact', sql.Bit, isSecurityContact ? 1 : 0)
    }
    if (typeof phone === 'string') {
      updates.push('phone = @phone')
      request.input('phone', sql.NVarChar(20), phone)
    }

    if (updates.length > 0) {
      await request.query(`UPDATE admin_accounts SET ${updates.join(', ')} WHERE account_id = @account_id`)
    }
  }

  /** 보안담당자 목록 조회 (is_security_contact = 1) */
  static async getSecurityContacts(): Promise<any[]> {
    const dbPool = await getPool()
    const result = await dbPool.request().query(`
      SELECT account_id, username, name, phone
      FROM admin_accounts
      WHERE is_security_contact = 1 AND is_active = 1
    `)
    return result.recordset
  }

  /** pass_receipt로 visit_passes 조회 */
  static async getPassByReceipt(passReceipt: string): Promise<any | null> {
    const dbPool = await getPool()
    const result = await dbPool.request()
      .input('pass_receipt', sql.NVarChar(50), passReceipt)
      .query(`
        SELECT * FROM visit_passes
        WHERE pass_receipt = @pass_receipt
      `)
    return result.recordset[0] || null
  }
}
