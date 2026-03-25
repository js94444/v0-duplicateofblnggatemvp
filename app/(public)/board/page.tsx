"use client"

import { useState } from "react"
import { PublicHeader } from "@/components/public/public-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLang } from "@/lib/language-context"
import { MessageSquare, Send, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function BoardPage() {
  const { lang } = useLang()
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    category: "suggestion",
    title: "",
    content: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categories.find(c => c.value === formData.category)?.label || "건의사항",
          title: formData.title,
          content: formData.content,
          author: formData.name,
          contact: formData.phone,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
      } else {
        alert(data.error || "등록에 실패했습니다.")
      }
    } catch (error) {
      console.error("Submit error:", error)
      alert("등록 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = [
    { value: "suggestion", label: t("건의사항", "Suggestion") },
    { value: "bug", label: t("오류 신고", "Bug Report") },
    { value: "inquiry", label: t("문의사항", "Inquiry") },
    { value: "other", label: t("기타", "Other") },
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      <PublicHeader initialScrolled />

      <main className="pt-24 pb-16 px-6 md:px-12">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8"
          >
            <ChevronLeft size={16} />
            <span className="text-sm">{t("메인으로", "Back to Main")}</span>
          </Link>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
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

          {submitted ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {t("제출이 완료되었습니다", "Submission Complete")}
              </h2>
              <p className="text-white/60 mb-6">
                {t(
                  "소중한 의견 감사합니다. 검토 후 필요시 연락드리겠습니다.",
                  "Thank you for your feedback. We will contact you if necessary."
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
                >
                  {t("메인으로", "Back to Main")}
                </Button>
                <Button
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      password: "",
                      category: "suggestion",
                      title: "",
                      content: "",
                    })
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                >
                  {t("새 글 작성", "Write New")}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
                {/* 작성자 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {t("연락처", "Phone")}
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={t("010-0000-0000", "010-0000-0000")}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {t("이메일", "Email")}
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t("example@email.com", "example@email.com")}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {t("비밀번호", "Password")} <span className="text-red-400">*</span>
                    </label>
                    <Input
                      required
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t("삭제 시 필요", "Required for deletion")}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                    />
                  </div>
                </div>

                {/* 카테고리 */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t("분류", "Category")} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          formData.category === cat.value
                            ? "bg-amber-500 text-black"
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 제목 */}
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

                {/* 내용 */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t("내용", "Content")} <span className="text-red-400">*</span>
                  </label>
                  <Textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={t(
                      "건의사항이나 문의 내용을 상세히 작성해주세요.",
                      "Please describe your suggestion or inquiry in detail."
                    )}
                    rows={6}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl resize-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl py-6 text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t("제출 중...", "Submitting...")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send size={18} />
                    {t("제출하기", "Submit")}
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
