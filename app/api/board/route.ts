import { NextRequest, NextResponse } from "next/server"
import { DB } from "@/lib/db/azure-sql"

// 게시물 목록 조회
export async function GET() {
  try {
    const posts = await DB.getBoardPosts()
    return NextResponse.json({ success: true, posts })
  } catch (error: any) {
    console.error("Board GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "게시물 조회 실패" },
      { status: 500 }
    )
  }
}

// 게시물 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { category, title, content, author, contact, email, password } = body

    if (!title || !content || !author || !contact || !password) {
      return NextResponse.json(
        { success: false, error: "필수 항목을 입력해주세요. (비밀번호 포함)" },
        { status: 400 }
      )
    }

    const result = await DB.createBoardPost({
      category: category || "건의사항",
      title,
      content,
      author,
      contact,
      email: email || "",
      password,
    })

    return NextResponse.json({ 
      success: true, 
      message: "게시물이 등록되었습니다.",
      id: result.id 
    })
  } catch (error: any) {
    console.error("Board POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "게시물 등록 실패" },
      { status: 500 }
    )
  }
}

// 게시물 삭제 (작성자: 비밀번호 필요)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const password = searchParams.get("password")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "게시물 ID가 필요합니다." },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "비밀번호가 필요합니다." },
        { status: 400 }
      )
    }

    const result = await DB.deleteBoardPost(id, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error: any) {
    console.error("Board DELETE error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "게시물 삭제 실패" },
      { status: 500 }
    )
  }
}
