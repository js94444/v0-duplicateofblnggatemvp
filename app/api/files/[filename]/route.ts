import { type NextRequest, NextResponse } from "next/server"
import { BlobServiceClient } from "@azure/storage-blob"

export const runtime = "nodejs"

const CONTAINER_NAME = "attachments"

function getContainerClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  
  if (!connectionString || connectionString.trim() === "") {
    console.error("[v0] AZURE_STORAGE_CONNECTION_STRING is not configured")
    return null
  }
  
  // Connection string 형식 검증 (DefaultEndpointsProtocol 또는 BlobEndpoint 포함 여부)
  if (!connectionString.includes("DefaultEndpointsProtocol=") && !connectionString.includes("BlobEndpoint=")) {
    console.error("[v0] Invalid AZURE_STORAGE_CONNECTION_STRING format - missing required keys")
    return null
  }
  
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    return blobServiceClient.getContainerClient(CONTAINER_NAME)
  } catch (error) {
    console.error("[v0] Failed to create BlobServiceClient:", error)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const { filename } = params

    if (!filename) {
      return NextResponse.json({ code: "NO_FILENAME", message: "파일명이 제공되지 않았습니다" }, { status: 400 })
    }

    const decodedFilename = decodeURIComponent(filename)
    console.log("[v0] Downloading file:", decodedFilename)

    const container = getContainerClient()
    if (!container) {
      return NextResponse.json(
        { code: "STORAGE_NOT_CONFIGURED", message: "Azure Storage가 설정되지 않았습니다" },
        { status: 503 }
      )
    }

    // blob name 후보: decodedFilename이 전체 URL인 경우 blob 이름만 추출
    let blobName = decodedFilename
    if (decodedFilename.startsWith("http")) {
      // URL에서 컨테이너명 이후 경로 추출
      const urlParts = decodedFilename.split(`/${CONTAINER_NAME}/`)
      blobName = urlParts.length > 1 ? urlParts[1].split("?")[0] : decodedFilename
    }
    console.log("[v0] Resolved blob name:", blobName)

    const blockBlobClient = container.getBlockBlobClient(blobName)

    // Check existence
    const exists = await blockBlobClient.exists()
    if (!exists) {
      console.error("[v0] File not found in Azure Blob:", blobName)
      return NextResponse.json({ code: "FILE_NOT_FOUND", message: "파일을 찾을 수 없습니다" }, { status: 404 })
    }

    // Download blob and stream to response
    const downloadResponse = await blockBlobClient.download(0)
    const properties = await blockBlobClient.getProperties()

    const contentType = properties.contentType || "application/octet-stream"
    // blobName에서 타임스탬프 prefix 제거 (예: "1771897995290-0224TEST_항만이수증" -> "0224TEST_항만이수증")
    const originalName = blobName.replace(/^\d+-/, "")

    // Read stream into buffer
    const chunks: Buffer[] = []
    for await (const chunk of downloadResponse.readableStreamBody as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (error) {
    console.error("[v0] Download error:", error)
    return NextResponse.json(
      {
        code: "DOWNLOAD_ERROR",
        message: "파일 다운로드 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
