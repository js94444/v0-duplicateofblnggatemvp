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

    const { category, title, content, author, contact, email } = body

    if (!title || !content || !author || !contact) {
      return NextResponse.json(
        { success: false, error: "필수 항목을 입력해주세요." },
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
