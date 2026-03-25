"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/language-context"
import { MessageSquare, Trash2, RefreshCw } from "lucide-react"

interface BoardPost {
  id: string
  category: string
  title: string
  content: string
  author: string
  contact: string
  email: string
  created_at: string
  status: string
}

export default function AdminBoardPage() {
  const { lang } = useLang()
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en)

  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchPosts = async () => {
    try {
      setIsRefreshing(true)
      const res = await fetch("/api/board")
      const data = await res.json()
      if (data.success) {
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error)
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm(t("정말 삭제하시겠습니까?", "Are you sure you want to delete this?"))) {
      return
    }

    try {
      const res = await fetch(`/api/admin/board/${id}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (data.success) {
        setPosts(posts.filter(p => p.id !== id))
        alert(t("삭제되었습니다.", "Deleted successfully."))
      } else {
        alert(data.error || t("삭제 실패", "Delete failed"))
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert(t("삭제 중 오류가 발생했습니다.", "An error occurred while deleting."))
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "건의사항": return "bg-amber-500/20 text-amber-400"
      case "오류신고": return "bg-red-500/20 text-red-400"
      case "문의": return "bg-blue-500/20 text-blue-400"
      default: return "bg-white/10 text-white/60"
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">
              {t("게시판 관리", "Board Management")}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {t("전체 게시물 목록", "All posts list")}
            </p>
          </div>
        </div>

        <Button
          onClick={() => fetchPosts()}
          disabled={isRefreshing}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-2 rounded-xl transition-all"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {t("새로고침", "Refresh")}
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-white/40">
            <div className="w-8 h-8 border-2 border-white/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            {t("불러오는 중...", "Loading...")}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-white/40">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t("게시물이 없습니다.", "No posts available.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50">{t("분류", "Category")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50">{t("제목", "Title")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50">{t("작성자", "Author")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50">{t("연락처", "Contact")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50">{t("이메일", "Email")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50">{t("작성일", "Date")}</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-white/50">{t("삭제", "Delete")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${getCategoryColor(post.category)}`}>
                        {post.category || t("기타", "Other")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium truncate max-w-xs">{post.title}</td>
                    <td className="px-6 py-4 text-white/60 text-sm">{post.author}</td>
                    <td className="px-6 py-4 text-white/60 text-sm">{post.contact}</td>
                    <td className="px-6 py-4 text-white/60 text-sm truncate">{post.email || "-"}</td>
                    <td className="px-6 py-4 text-white/40 text-sm">{post.created_at?.split("T")[0]}</td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        onClick={() => handleDelete(post.id)}
                        size="sm"
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Post Details Modal 오버레이 (선택사항) */}
      <div className="text-white/50 text-sm mt-4">
        {t("총", "Total")} {posts.length} {t("건", "posts")}
      </div>
    </div>
  )
}
