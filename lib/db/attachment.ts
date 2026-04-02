import sql from 'mssql'

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

async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config)
  }
  return pool
}

export interface Attachment {
  id: string
  application_id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  blob_url: string
  created_at: Date
}

export class AttachmentDB {
  // 첨부파일 저장
  static async createAttachment(
    applicationId: string,
    filename: string,
    originalName: string,
    fileSize: number,
    mimeType: string,
    blobUrl: string,
  ): Promise<Attachment> {
    const dbPool = await getPool()
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const now = new Date()

    await dbPool
      .request()
      .input('id', sql.VarChar(50), id)
      .input('application_id', sql.VarChar(50), applicationId)
      .input('filename', sql.VarChar(255), filename)
      .input('original_name', sql.NVarChar(255), originalName)
      .input('file_size', sql.Int, fileSize)
      .input('mime_type', sql.VarChar(100), mimeType)
      .input('blob_url', sql.VarChar(1000), blobUrl)
      .input('created_at', sql.DateTime, now).query(`
        INSERT INTO attachment (
          id, application_id, filename, original_name, 
          file_size, mime_type, blob_url, created_at
        ) VALUES (
          @id, @application_id, @filename, @original_name,
          @file_size, @mime_type, @blob_url, @created_at
        )
      `)

    return {
      id,
      application_id: applicationId,
      filename,
      original_name: originalName,
      file_size: fileSize,
      mime_type: mimeType,
      blob_url: blobUrl,
      created_at: now,
    }
  }

  // 신청서의 첨부파일 목록 조회
  static async getAttachmentsByApplicationId(applicationId: string): Promise<Attachment[]> {
    const dbPool = await getPool()

    const result = await dbPool
      .request()
      .input('application_id', sql.VarChar(50), applicationId)
      .query('SELECT * FROM attachment WHERE application_id = @application_id ORDER BY created_at DESC')

    return result.recordset.map((row) => ({
      id: row.id,
      application_id: row.application_id,
      filename: row.filename,
      original_name: row.original_name,
      file_size: row.file_size,
      mime_type: row.mime_type,
      blob_url: row.blob_url,
      created_at: new Date(row.created_at),
    }))
  }

  // 첨부파일 삭제
  static async deleteAttachment(id: string): Promise<void> {
    const dbPool = await getPool()

    await dbPool.request().input('id', sql.VarChar(50), id).query('DELETE FROM attachment WHERE id = @id')
  }
}
