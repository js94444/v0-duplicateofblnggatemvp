import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { getAuthenticatedAdmin, isAuthError } from "@/lib/auth/require-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest, { params }: { params: { receipt: string } }) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth
    const receipt = params?.receipt?.trim()
    if (!receipt) {
      return NextResponse.json(
        { result: "DENY", denyReason: "INVALID", message: "접수번호가 없습니다." },
        { status: 400 }
      )
    }
    const url = new URL(request.url)
    const deviceId = url.searchParams.get("device_id") ?? "WEB"
    const directionParam = url.searchParams.get("direction")
    const gateParam = url.searchParams.get("gate") ?? "main"
    const scannedIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      null
    const userAgent = request.headers.get("user-agent") || null

    const scanSite =
      gateParam === "pier_1"
        ? "PIER_1"
        : gateParam === "pier_2"
          ? "PIER_2"
          : "MAIN"

    if (directionParam === "ENTRY" || directionParam === "EXIT") {
      const result = await AzureSqlDB.verifyVisitPassByReceiptWithDirection(
        receipt,
        directionParam,
        deviceId,
        scannedIp,
        userAgent,
        scanSite
      )
      return NextResponse.json(result)
    }

    const result = await AzureSqlDB.verifyVisitPassByReceipt(receipt, deviceId, scannedIp, userAgent)
    return NextResponse.json(result)
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : undefined
    console.error("[v0] QR verify error:", errMessage, errStack)

    // 개발/디버깅 시 실제 오류 메시지 노출 (pass_receipt 등 컬럼 없음 등)
    const isDev = process.env.NODE_ENV !== "production"
    const detail = isDev ? errMessage : undefined

    return NextResponse.json(
      {
        result: "DENY",
        denyReason: "INVALID",
        message: "QR 검증 중 오류가 발생했습니다.",
        ...(detail && { errorDetail: detail }),
      },
      { status: 500 },
    )
  }
}

