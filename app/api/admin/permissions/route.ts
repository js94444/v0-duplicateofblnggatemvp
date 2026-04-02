import { type NextRequest, NextResponse } from "next/server"
import { validateAdminToken } from "@/lib/auth/admin"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

// 전체 역할 권한 목록 조회
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? validateAdminToken(token) : null

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // super_admin은 전체, 그 외는 본인 역할 권한만
    if (user.role === "super_admin") {
      const permissions = await AzureSqlDB.getAllRolePermissions()
      return NextResponse.json({ permissions })
    } else {
      const permissions = await AzureSqlDB.getRolePermissions(user.role)
      return NextResponse.json({ permissions })
    }
  } catch (error) {
    console.error("[permissions GET] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// 역할별 페이지 권한 업데이트 (슈퍼어드민 전용)
export async function PUT(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? validateAdminToken(token) : null

  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { role, page_path, allowed } = await request.json()

    if (!role || !page_path || allowed === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // super_admin 권한은 변경 불가
    if (role === "super_admin") {
      return NextResponse.json({ error: "super_admin 권한은 변경할 수 없습니다" }, { status: 400 })
    }

    await AzureSqlDB.updateRolePermission(role, page_path, allowed)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[permissions PUT] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
