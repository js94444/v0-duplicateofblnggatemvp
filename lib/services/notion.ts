import { Client } from "@notionhq/client"

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

const DATABASE_ID = process.env.NOTION_DATABASE_ID || ""

export interface BoardPost {
  id: string
  category: string
  title: string
  content: string
  author: string
  contact: string
  email: string
  status: string
  createdAt: string
}

// 게시물 목록 조회
export async function getBoardPosts(): Promise<BoardPost[]> {
  try {
    if (!process.env.NOTION_API_KEY || !DATABASE_ID) {
      console.warn("Notion API 키 또는 데이터베이스 ID가 설정되지 않았습니다.")
      return []
    }

    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    })

    return response.results.map((page: any) => {
      const props = page.properties
      return {
        id: page.id,
        category: props["분류"]?.select?.name || "",
        title: props["제목"]?.title?.[0]?.plain_text || "",
        content: props["내용"]?.rich_text?.[0]?.plain_text || "",
        author: props["작성자"]?.rich_text?.[0]?.plain_text || "",
        contact: props["연락처"]?.phone_number || "",
        email: props["이메일"]?.email || "",
        status: props["상태"]?.select?.name || "접수",
        createdAt: page.created_time,
      }
    })
  } catch (error) {
    console.error("Notion getBoardPosts error:", error)
    throw error
  }
}

// 게시물 등록
export async function createBoardPost(data: {
  category: string
  title: string
  content: string
  author: string
  contact: string
  email: string
}): Promise<boolean> {
  try {
    if (!process.env.NOTION_API_KEY || !DATABASE_ID) {
      console.warn("Notion API 키 또는 데이터베이스 ID가 설정되지 않았습니다.")
      return false
    }
    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        "제목": {
          title: [{ text: { content: data.title } }],
        },
        "분류": {
          select: { name: data.category },
        },
        "내용": {
          rich_text: [{ text: { content: data.content } }],
        },
        "작성자": {
          rich_text: [{ text: { content: data.author } }],
        },
        "연락처": {
          phone_number: data.contact,
        },
        "이메일": {
          email: data.email || null,
        },
        "상태": {
          select: { name: "접수" },
        },
      },
    })

    return { id: response.id }
  } catch (error) {
    console.error("Notion createBoardPost error:", error)
    throw error
  }
}
