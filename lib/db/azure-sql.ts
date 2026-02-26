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

// 한국 시간(UTC+9) 생성 함수
function getKoreaTime(): Date {
  const now = new Date()
  // UTC 시간에 9시간(한국 시간대) 추가
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
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
  }): Promise<{ id: number; receipt: string }> {
    const dbPool = await getPool()
    
    // 유형 분류 로직
    // 1. 출입지역이 '항만' 또는 '부두'를 포함하면 항만출입 (동행인 여부 무관)
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
      .input('is_admin_submission', sql.Bit, data.is_admin_mode ? 1 : 0)
      .input('submission_ip', sql.NVarChar(50), data.submission_ip || null)
      .input('status', sql.NVarChar(20), 'pending')
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now).query(`
        INSERT INTO visit_applications (
          application_number, visitor_name, visitor_phone, visitor_birth_date,
          visitor_organization, visitor_position, visitor_address, visitor_email,
          contact_name, contact_mobile, visit_purpose, detailed_purpose, visit_start_date, visit_end_date,
          access_area, vehicle_number, vehicle_model,
          is_admin_submission, submission_ip, status, created_at, updated_at
        )
        OUTPUT INSERTED.application_id
        VALUES (
          @application_number, @visitor_name, @visitor_phone, @visitor_birth_date,
          @visitor_organization, @visitor_position, @visitor_address, @visitor_email,
          @contact_name, @contact_mobile, @visit_purpose, @detailed_purpose, @visit_start_date, @visit_end_date,
          @access_area, @vehicle_number, @vehicle_model,
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
        // 파일명과 키가 유효한 경우에만 저장
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
            .input('uploaded_at', sql.DateTime, now).query(`
              INSERT INTO visit_attachments (
                application_id, file_name, file_key, blob_url, file_type, file_size, uploaded_at
              ) VALUES (
                @application_id, @file_name, @file_key, @blob_url, @file_type, @file_size, @uploaded_at
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
    const [companionsResult, devicesResult, companionDevicesResult, filesResult] = await Promise.all([
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
      return { ...c, electronicDevices: devices }
    })
    
    console.log('[v0] Files recordset:', filesResult.recordset)
    const files = filesResult.recordset.map((f: any) => ({
      filename: f.file_name,
      key: f.file_key,
      url: f.blob_url,
      size: f.file_size,
      type: f.file_type,
    }))
    console.log('[v0] Mapped files:', files)
    
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
      visit_purpose: row.visit_purpose,
      contact_name: row.contact_name,
      contact_email: row.visitor_email,
      access_area: row.access_area as AccessArea,
      vehicle_number: row.vehicle_number,
      vehicle_model: row.vehicle_model,
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

    // 4개 쿼리 병렬 실행으로 N+1 문제 완전 해결
    const [appResult, attachResult, companionResult, companionDeviceResult, deviceResult] = await Promise.all([
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
        SELECT application_id, file_name, file_key, blob_url, file_type, file_size
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
    ])

    // 메모리에서 application_id 기준으로 그룹핑
    const attachMap = new Map<string, any[]>()
    for (const a of attachResult.recordset) {
      const key = String(a.application_id)
      if (!attachMap.has(key)) attachMap.set(key, [])
      attachMap.get(key)!.push({ filename: a.file_name, key: a.file_key, url: a.blob_url, type: a.file_type, size: a.file_size ? Number(a.file_size) : 0 })
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
        visit_start_time: "09:00",
        visit_end_time: "18:00",
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        rejection_reason: row.rejection_reason,
        files: attachMap.get(appId) || [],
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
    
    // 승인 시 approval_date 설정
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

    const now = new Date()

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

    // Monthly stats for the last 6 months
    const now = new Date()
    const monthlyStats = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
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
    const orgStats: Record<string, number> = {}
    allApps.forEach(app => {
      let org = 'Unknown'
      if (app.type === 'GROUP_VISIT') {
        org = (app as any).organization || 'Unknown'
      } else if (app.type === 'VISIT_R3') {
        org = (app as any).visitor_organization || 'Unknown'
      } else if (app.type === 'PORT_ACCESS') {
        org = (app as any).company_name || 'Unknown'
      }
      orgStats[org] = (orgStats[org] || 0) + 1
    })

    const organizationStats = Object.entries(orgStats)
      .map(([organization, count]) => ({ organization, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalApplications,
      statusStats,
      typeStats,
      monthlyStats,
      organizationStats,
    }
  }
}
