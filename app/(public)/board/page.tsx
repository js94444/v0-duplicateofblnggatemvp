"use client"

import { useState, useEffect } from "react"
import { PublicHeader } from "@/components/public/public-header"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/language-context"
import { MessageSquare, ChevronLeft, PenSquare, Eye, Calendar, User } from "lucide-react"
import Link from "next/link"

interface BoardPost {
  id: string
  category: string
  title: string
  author: string
  createdAt: string
  status: string
}

export default function BoardListPage() {
  const { lang } = useLang()
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en)

  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/board")
        const data = await res.json()
        if (data.success) {
          setPosts(data.posts)
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const getCategoryLabel = (category: string) => {
    return category || t("기타", "Other")
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "건의사항": return "bg-amber-500/20 text-amber-400"
      case "오류신고": return "bg-red-500/20 text-red-400"
      case "문의": return "bg-blue-500/20 text-blue-400"
      default: return "bg-white/10 text-white/60"
    }
  }

  const maskName = (name: string) => {
    if (!name || name.length < 2) return name
    return name[0] + "*" + name.slice(2)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <PublicHeader initialScrolled />

      <main className="pt-24 pb-16 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8"
          >
            <ChevronLeft size={16} />
            <span className="text-sm">{t("메인으로", "Back to Main")}</span>
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-2xl">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">
                  {t("건의사항 게시판", "Suggestion Board")}
                </h1>
                <p className="text-white/50 text-sm mt-1">
                  {t(
                    "시스템 이용 중 건의사항이나 문의사항을 남겨주세요.",
                    "Please leave your suggestions or inquiries about the system."
                  )}
                </p>
              </div>
            </div>

            {/* 작성하기 버튼 */}
            <Link href="/board/write">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl flex items-center gap-2">
                <PenSquare size={16} />
                {t("작성하기", "Write")}
              </Button>
            </Link>
          </div>

          {/* 게시물 목록 */}
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 text-sm font-bold text-white/50">
              <div className="col-span-2">{t("분류", "Category")}</div>
              <div className="col-span-5">{t("제목", "Title")}</div>
              <div className="col-span-2">{t("작성자", "Author")}</div>
              <div className="col-span-2">{t("작성일", "Date")}</div>
              <div className="col-span-1 text-center">{t("상태", "Status")}</div>
            </div>

            {/* 게시물 리스트 */}
            {loading ? (
              <div className="py-16 text-center text-white/40">
                <div className="w-8 h-8 border-2 border-white/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                {t("불러오는 중...", "Loading...")}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center text-white/40">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{t("등록된 게시물이 없습니다.", "No posts yet.")}</p>
                <Link href="/board/write">
                  <Button className="mt-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold rounded-xl">
                    {t("첫 글 작성하기", "Write the first post")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/board/${post.id}`}
                    className="block px-6 py-4 hover:bg-white/5 transition-colors"
                  >
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${getCategoryColor(post.category)}`}>
                          {getCategoryLabel(post.category)}
                        </span>
                      </div>
                      <div className="col-span-5 text-white font-medium truncate">
                        {post.title}
                      </div>
                      <div className="col-span-2 text-white/60 text-sm">
                        {maskName(post.author)}
                      </div>
                      <div className="col-span-2 text-white/40 text-sm">
                        {post.createdAt?.split("T")[0]}
                      </div>
                      <div className="col-span-1 text-center">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                          post.status === "answered" 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-white/10 text-white/50"
                        }`}>
                          {post.status === "answered" ? t("답변완료", "Answered") : t("대기중", "Pending")}
                        </span>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${getCategoryColor(post.category)}`}>
                          {getCategoryLabel(post.category)}
                        </span>
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                          post.status === "answered" 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-white/10 text-white/50"
                        }`}>
                          {post.status === "answered" ? t("답변완료", "Answered") : t("대기중", "Pending")}
                        </span>
                      </div>
                      <h3 className="text-white font-medium">{post.title}</h3>
                      <div className="flex items-center gap-4 text-white/40 text-xs">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {maskName(post.author)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {post.createdAt?.split("T")[0]}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
