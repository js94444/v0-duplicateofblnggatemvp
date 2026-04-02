"use client"

import { useState, useEffect } from "react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLang } from "@/lib/language-context"
import { MessageSquare, PenSquare, X, Send, ChevronLeft, User, Calendar } from "lucide-react"
import Link from "next/link"

interface BoardPost {
  id: number
  title: string
  content: string
  author: string
  created_at: string
}

export default function BoardPage() {
  const { lang } = useLang()
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en)

  const [posts, setPosts] = useState<BoardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    content: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/board")
      const data = await res.json()
      if (data.success) {
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          author: formData.name,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setShowWriteForm(false)
        setFormData({ name: "", title: "", content: "" })
        fetchPosts()
      } else {
        alert(data.error || t("등록에 실패했습니다.", "Failed to submit."))
      }
    } catch (error) {
      console.error("Submit error:", error)
      alert(t("등록 중 오류가 발생했습니다.", "An error occurred while submitting."))
    } finally {
      setIsSubmitting(false)
    }
  }

  const maskName = (name: string) => {
    if (!name || name.length < 2) return name
    return name[0] + "*".repeat(name.length - 1)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <PublicHeader initialScrolled />

      <main className="flex-1 pt-24 pb-16 px-6 md:px-12">
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
              <div className="p-3 bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-2xl">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">
                  {t("건의사항 게시판", "Suggestion Board")}
                </h1>
                <p className="text-white/50 text-sm mt-1">
                  {t(
                    "시스템 이용 중 건의사항이나 문의사항을 남겨주세요.",
                    "Please leave your suggestions or inquiries."
                  )}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowWriteForm(true)}
              className="bg-amber-500/90 hover:bg-amber-500 text-black font-bold rounded-xl flex items-center gap-2 backdrop-blur-sm"
            >
              <PenSquare size={16} />
              {t("글쓰기", "Write")}
            </Button>
          </div>

          {/* Post List */}
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="col-span-1 text-sm font-medium text-white/40">{t("번호", "No")}</div>
              <div className="col-span-7 text-sm font-medium text-white/40">{t("제목", "Title")}</div>
              <div className="col-span-2 text-sm font-medium text-white/40">{t("작성자", "Author")}</div>
              <div className="col-span-2 text-sm font-medium text-white/40">{t("작성일", "Date")}</div>
            </div>

            {/* Post Items */}
            {loading ? (
              <div className="py-20 text-center text-white/40">
                <div className="w-8 h-8 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                {t("불러오는 중...", "Loading...")}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-20 text-center text-white/40">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="mb-2">{t("등록된 게시물이 없습니다.", "No posts yet.")}</p>
                <p className="text-sm text-white/30">{t("첫 번째 글을 작성해보세요.", "Be the first to write.")}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="px-6 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-1 text-white/30 text-sm">
                        {posts.length - index}
                      </div>
                      <div className="col-span-7 text-white font-medium truncate">
                        {post.title}
                      </div>
                      <div className="col-span-2 text-white/50 text-sm">
                        {maskName(post.author)}
                      </div>
                      <div className="col-span-2 text-white/30 text-sm">
                        {formatDate(post.created_at)}
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-2">
                      <h3 className="text-white font-medium">{post.title}</h3>
                      <div className="flex items-center gap-4 text-white/40 text-xs">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {maskName(post.author)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 text-white/30 text-sm">
            {t("총", "Total")} {posts.length} {t("건", "posts")}
          </div>
        </div>
      </main>

      <PublicFooter />

      {/* Write Form Modal */}
      {showWriteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWriteForm(false)}
          />
          <div className="relative w-full max-w-lg bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setShowWriteForm(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <PenSquare size={20} className="text-amber-500" />
              {t("글 작성", "Write Post")}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {t("이름", "Name")} <span className="text-red-400">*</span>
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("이름을 입력하세요", "Enter your name")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {t("제목", "Title")} <span className="text-red-400">*</span>
                </label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t("제목을 입력하세요", "Enter title")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {t("내용", "Content")} <span className="text-red-400">*</span>
                </label>
                <Textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={t(
                    "내용을 입력하세요",
                    "Enter content"
                  )}
                  rows={5}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-3"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t("등록 중...", "Submitting...")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send size={16} />
                    {t("등록하기", "Submit")}
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

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
                {maskName(selectedPost.author)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(selectedPost.created_at)}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                {selectedPost.content}
              </p>
            </div>

            <Button
              onClick={() => setSelectedPost(null)}
              className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl"
            >
              {t("닫기", "Close")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
