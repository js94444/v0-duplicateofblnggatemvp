import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { getAuthenticatedAdmin, isAuthError } from "@/lib/auth/require-admin"

// 어드민용 게시물 삭제 (관리자 인증 필요)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: "게시물 ID가 필요합니다." },
        { status: 400 }
      )
    }

    const result = await AzureSqlDB.deleteBoardPostAdmin(parseInt(id))

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error: any) {
    console.error("Admin Board DELETE error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "게시물 삭제 실패" },
      { status: 500 }
    )
  }
}
