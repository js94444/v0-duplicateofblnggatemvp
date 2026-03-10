"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Eye, EyeOff, Shield, KeyRound } from "lucide-react"

const bgStyle = {
  backgroundImage: "url('/images/lng-terminal-bg.jpg')",
  filter: "brightness(0.3) blur(5px)",
}

type Step = "login" | "change_password"

export default function AdminLoginPage() {
  const [step, setStep] = useState<Step>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { login, changePassword } = useAdminAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast({ title: "입력 오류", description: "아이디와 비밀번호를 모두 입력해주세요", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const result = await login(username, password)
      if (!result.success) {
        toast({ title: "로그인 실패", description: "아이디 또는 비밀번호가 올바르지 않습니다", variant: "destructive" })
        return
      }
      if (result.must_change_password) {
        setStep("change_password")
        return
      }
      toast({ title: "로그인 성공", description: "관리자 페이지로 이동합니다" })
      router.push("/admin/requests")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast({ title: "오류", description: "비밀번호는 6자 이상이어야 합니다", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "오류", description: "비밀번호가 일치하지 않습니다", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const ok = await changePassword(newPassword)
      if (!ok) {
        toast({ title: "오류", description: "비밀번호 변경에 실패했습니다", variant: "destructive" })
        return
      }
      toast({ title: "비밀번호 변경 완료", description: "관리자 페이지로 이동합니다" })
      router.push("/admin/requests")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-widest uppercase">Back to Home</span>
        </Link>
      </div>


      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Image src="/images/boryeong-lng-ci.png" alt="보령LNG터미널" width={200} height={40} className="h-10 w-auto" priority />
            </div>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                {step === "login" ? (
                  <Shield className="w-8 h-8 text-amber-500" />
                ) : (
                  <KeyRound className="w-8 h-8 text-amber-500" />
                )}
              </div>
            </div>
            {step === "login" ? (
              <>
                <h1 className="text-3xl font-black text-white mb-2">관리자 로그인</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-bold">Admin System Access</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-black text-white mb-2">비밀번호 변경</h1>
                <p className="text-sm text-amber-400/80 font-medium">최초 로그인 시 비밀번호를 변경해주세요</p>
              </>
            )}
          </div>

          {step === "login" ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-bold text-white/60">아이디</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-white/60">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20 pr-12"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:hover:scale-100"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-bold text-white/60">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    placeholder="6자 이상 입력하세요"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-amber-500/50 pr-12"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-bold text-white/60">비밀번호 확인</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-amber-500/50"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:hover:scale-100"
                disabled={isLoading}
              >
                {isLoading ? "변경 중..." : "비밀번호 변경 및 로그인"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
