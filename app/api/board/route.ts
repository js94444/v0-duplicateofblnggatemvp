import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

// 게시물 목록 조회
export async function GET() {
  try {
    const posts = await AzureSqlDB.getBoardPosts()
    return NextResponse.json({ success: true, posts })
  } catch (error: any) {
    console.error("Board GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "게시물 조회 실패" },
      { status: 500 }
    )
  }
}

// 게시물 등록 (이름, 제목, 내용만)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { title, content, author } = body

    if (!title || !content || !author) {
      return NextResponse.json(
        { success: false, error: "필수 항목을 입력해주세요." },
        { status: 400 }
      )
    }

    const result = await AzureSqlDB.createBoardPost({
      title,
      content,
      author,
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
