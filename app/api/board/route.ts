import { NextRequest, NextResponse } from "next/server"

// 임시 메모리 캐시 (서버 메모리에만 저장, 재배포 시 초기화)
let boardPosts: Array<{
  id: string
  category: string
  title: string
  content: string
  author: string
  contact: string
  email: string
  createdAt: string
  status: string
}> = []

// 게시물 목록 조회
export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      posts: boardPosts,
      note: "임시 메모리 캐시 (페이지 새로고침 시 초기화됨)"
    })
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

    const newPost = {
      id: `board-${Date.now()}`,
      category: category || "건의사항",
      title,
      content,
      author,
      contact,
      email: email || "",
      createdAt: new Date().toISOString(),
      status: "접수",
    }

    boardPosts.unshift(newPost) // 최신순으로 맨 앞에 추가

    return NextResponse.json({ 
      success: true, 
      message: "게시물이 등록되었습니다.",
      id: newPost.id 
    })
  } catch (error: any) {
    console.error("Board POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "게시물 등록 실패" },
      { status: 500 }
    )
  }
}
