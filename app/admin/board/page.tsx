"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/language-context"
import { MessageSquare, Trash2, RefreshCw, X, User, Calendar } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface BoardPost {
  id: number
  title: string
  content: string
  author: string
  created_at: string
}

export default function AdminBoardPage() {
  const { lang } = useLang()
  const { token } = useAdminAuth()
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en)

  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null)

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

  const handleDelete = async (id: number) => {
    if (!confirm(t("정말 삭제하시겠습니까?", "Are you sure you want to delete this?"))) {
      return
    }

    try {
      const res = await fetch(`/api/admin/board/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (data.success) {
        setPosts(posts.filter(p => p.id !== id))
        setSelectedPost(null)
        alert(t("삭제되었습니다.", "Deleted successfully."))
      } else {
        alert(data.error || t("삭제 실패", "Delete failed"))
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert(t("삭제 중 오류가 발생했습니다.", "An error occurred while deleting."))
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
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
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
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
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50 w-16">{t("번호", "No")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50">{t("제목", "Title")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50 w-32">{t("작성자", "Author")}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white/50 w-32">{t("작성일", "Date")}</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-white/50 w-20">{t("삭제", "Delete")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {posts.map((post, index) => (
                  <tr 
                    key={post.id} 
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                  >
                    <td className="px-6 py-4 text-white/30 text-sm">{posts.length - index}</td>
                    <td className="px-6 py-4 text-white font-medium truncate max-w-xs">{post.title}</td>
                    <td className="px-6 py-4 text-white/60 text-sm">{post.author}</td>
                    <td className="px-6 py-4 text-white/40 text-sm">{formatDate(post.created_at)}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
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

      <div className="text-white/50 text-sm">
        {t("총", "Total")} {posts.length} {t("건", "posts")}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedPost(null)}
          />
          <div className="relative w-full max-w-lg bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-2 pr-8">
              {selectedPost.title}
            </h2>
            
            <div className="flex items-center gap-4 text-white/40 text-sm mb-6">
              <span className="flex items-center gap-1">
                <User size={14} />
                {selectedPost.author}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(selectedPost.created_at)}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                {selectedPost.content}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setSelectedPost(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl"
              >
                {t("닫기", "Close")}
              </Button>
              <Button
                onClick={() => handleDelete(selectedPost.id)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl px-6"
              >
                <Trash2 size={16} className="mr-2" />
                {t("삭제", "Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
