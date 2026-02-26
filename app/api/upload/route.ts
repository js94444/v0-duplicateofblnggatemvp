import { type NextRequest, NextResponse } from "next/server"
import { uploadFile } from "@/lib/storage/azure-blob"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        {
          code: "NO_FILE",
          message: "파일이 제공되지 않았습니다",
        },
        { status: 400 },
      )
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          code: "FILE_TOO_LARGE",
          message: "파일 크기는 10MB를 초과할 수 없습니다",
        },
        { status: 400 },
      )
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          code: "INVALID_FILE_TYPE",
          message: "지원하지 않는 파일 형식입니다",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Uploading file to Azure Blob Storage:", {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    // Upload to Azure Blob Storage
    const result = await uploadFile(file, file.name, file.type)

    console.log("[v0] File uploaded successfully:", result)

    return NextResponse.json({
      success: true,
      file: {
        fileName: result.fileName,
        originalName: file.name,
        url: result.url,
        size: result.size,
        contentType: result.contentType,
      },
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      {
        code: "UPLOAD_ERROR",
        message: "파일 업로드 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
