"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, KeyRound, RefreshCw, ShieldCheck, Upload, CheckCircle2, XCircle, AlertCircle, Phone } from "lucide-react"
import { useRef } from "react"

// 전체 페이지 목록
const ALL_PAGES = [
  { path: "/admin/dashboard", name: "대시보드" },
  { path: "/admin/requests",  name: "신청 관리" },
  { path: "/admin/calendar",  name: "방문 캘린더" },
  { path: "/admin/qr",        name: "QR 출입현황" },
  { path: "/admin/accounts",  name: "계정 관리" },
]

const EDITABLE_ROLES = [
  { role: "security", label: "특수경비대" },
  { role: "manager",  label: "담당자" },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: "슈퍼어드민",
  security: "특수경비대",
  manager: "담당자",
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  security: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  manager: "bg-white/10 text-white/60 border-white/20",
}

interface Account {
  account_id: number
  username: string
  name: string
  role: string
  phone?: string
  is_active: boolean
  is_security_contact?: boolean
  created_at: string
  last_login_at: string | null
}

export default function AdminAccountsPage() {
  const { user, token } = useAdminAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [createOpen, setCreateOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [resetAccount, setResetAccount] = useState<Account | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null)

  // 폼 상태
  const [form, setForm] = useState({ username: "", name: "", phone: "", password: "", role: "manager" })
  const [editForm, setEditForm] = useState({ name: "", role: "", is_active: true })
  const [newPassword, setNewPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [permSaving, setPermSaving] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; errors: number; results: any[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetcher = (url: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.data)

  const { data: accounts = [], isLoading, mutate } = useSWR<Account[]>(
    token ? "/api/admin/accounts" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: permissions = [], mutate: mutatePerm } = useSWR<any[]>(
    token ? ["/api/admin/permissions", token] : null,
    ([url, t]: [string, string]) => fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).then((d) => d.permissions || []),
    { revalidateOnFocus: false }
  )

  // 보안담당자 설정용: 슈퍼어드민 계정 목록
  const superAdmins = useMemo(() => accounts.filter((a) => a.role === "super_admin"), [accounts])
  const [securityContactSaving, setSecurityContactSaving] = useState<number | null>(null)

  const handleSecurityContactChange = async (accountId: number, isContact: boolean, phone: string) => {
    if (!phone && isContact) {
      toast({ title: "전화번호를 먼저 입력해주세요", variant: "destructive" })
      return
    }
    setSecurityContactSaving(accountId)
    
    // 즉시 로컬 상태 업데이트 (체크 표시 즉각 반영)
    mutate(
      accounts.map((a) => a.account_id === accountId ? { ...a, is_security_contact: isContact } : a),
      false
    )
    
    try {
      const res = await fetch("/api/admin/security-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account_id: accountId, is_security_contact: isContact, phone }),
      })
      if (!res.ok) throw new Error("저장 실패")
      toast({ title: isContact ? "보안담당자로 지정되었습니다" : "보안담당자에서 해제되었습니다" })
    } catch {
      toast({ title: "저장 실패", variant: "destructive" })
      // 실패 시 원래 상태로 되돌림
      mutate()
    } finally {
      setSecurityContactSaving(null)
    }
  }

  // 역할별 권한 맵: { security: { "/admin/dashboard": true, ... }, manager: { ... } }
  const permMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {}
    if (!permissions || !Array.isArray(permissions)) return map
    for (const p of permissions) {
      if (!map[p.role]) map[p.role] = {}
      map[p.role][p.page_path] = !!p.allowed
    }
    return map
  }, [permissions])

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setBulkLoading(true)
    setBulkResult(null)

    const text = await file.text()
    const lines = text.split("\n").map((l) => l.split(","))
    const header = lines[0].map((h) => h.trim().toLowerCase())
    const usernameIdx = header.indexOf("username")
    const nameIdx     = header.indexOf("name")
    const roleIdx     = header.indexOf("role")
    const passwordIdx = header.indexOf("password")

    if ([usernameIdx, nameIdx, roleIdx, passwordIdx].includes(-1)) {
      toast({ title: "CSV 형식 오류", description: "username, name, role, password 컬럼이 필요합니다", variant: "destructive" })
      setBulkLoading(false)
      return
    }

    const accounts = lines.slice(1)
      .filter((row) => row[usernameIdx]?.trim() && row[nameIdx]?.trim())
      .map((row) => ({
        username: row[usernameIdx]?.trim(),
        name:     row[nameIdx]?.trim(),
        role:     row[roleIdx]?.trim(),
        password: row[passwordIdx]?.trim(),
      }))

    try {
      const res = await fetch("/api/admin/accounts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accounts }),
      })
      const data = await res.json()
      setBulkResult(data)
      mutate()
      toast({ title: `완료: ${data.created}개 생성, ${data.skipped}개 건너뜀` })
    } catch (e: any) {
      toast({ title: "오류", description: e.message, variant: "destructive" })
    } finally {
      setBulkLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handlePermChange = async (role: string, pagePath: string, allowed: boolean) => {
    setPermSaving(`${role}:${pagePath}`)
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, page_path: pagePath, allowed }),
      })
      if (!res.ok) throw new Error("권한 저장 실패")
      mutatePerm()
      toast({ title: "권��이 저장되었습니다" })
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" })
    } finally {
      setPermSaving(null)
    }
  }

  if (user?.role !== "super_admin") {
    return (
      <div className="container mx-auto px-6 py-10 text-center">
        <p className="text-red-400 font-bold text-lg">접근 권한이 없습니다.</p>
      </div>
    )
  }

  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  const handleCreate = async () => {
    if (!form.username || !form.name || !form.password) {
      toast({ title: "입력 오류", description: "모든 필드를 입력해주세요", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST", headers: authHeaders,
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast({ title: "계정 생성 완료" })
      setCreateOpen(false)
      setForm({ username: "", name: "", phone: "", password: "", role: "manager" })
      mutate()
    } catch (e: any) {
      toast({ title: "생성 실패", description: e.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editAccount) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/accounts/${editAccount.account_id}`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast({ title: "계정 수정 완료" })
      setEditAccount(null)
      mutate()
    } catch (e: any) {
      toast({ title: "수정 실패", description: e.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetAccount || !newPassword) return
    if (newPassword.length < 6) {
      toast({ title: "오류", description: "6자 이상 입력해주세요", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/accounts/${resetAccount.account_id}`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ reset_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast({ title: "비밀번호 초기화 완료", description: "다음 로그인 시 변경을 요구합니다" })
      setResetAccount(null)
      setNewPassword("")
    } catch (e: any) {
      toast({ title: "초기화 실패", description: e.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteAccount) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/accounts/${deleteAccount.account_id}`, {
        method: "DELETE", headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast({ title: "계정 삭제 완료" })
      setDeleteAccount(null)
      mutate()
    } catch (e: any) {
      toast({ title: "삭제 실패", description: e.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">계정 관리</h1>
            <p className="text-white/40 text-sm mt-1 font-medium">관리자 계정 생성 및 권한 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => mutate()}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw size={15} className={`mr-2 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkLoading}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl px-5 py-2.5 flex items-center gap-2"
            >
              <Upload size={18} />
              {bulkLoading ? "처리 중..." : "CSV 일괄 업로드"}
            </Button>
            <Button
              onClick={() => { setForm({ username: "", name: "", phone: "", password: "", role: "manager" }); setCreateOpen(true) }}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl px-5 py-2.5 flex items-center gap-2"
            >
              <Plus size={18} />
              계정 추가
            </Button>
          </div>
        </div>

        {/* CSV 업로드 결과 */}
        {bulkResult && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">CSV 업로드 결과</h2>
              <button onClick={() => setBulkResult(null)} className="text-white/40 hover:text-white transition-colors">
                <XCircle size={18} />
              </button>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-3">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-green-300 font-bold">{bulkResult.created}개 생성</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
                <AlertCircle size={16} className="text-white/40" />
                <span className="text-white/50 font-bold">{bulkResult.skipped}개 건너뜀</span>
              </div>
              {bulkResult.errors > 0 && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3">
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-red-300 font-bold">{bulkResult.errors}개 오류</span>
                </div>
              )}
            </div>
            {/* 건너뜀/오류 항목만 표시 */}
            {bulkResult.results.filter((r) => r.status !== "created").length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {bulkResult.results.filter((r) => r.status !== "created").map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm px-2 py-1 rounded-lg bg-white/5">
                    <span className={`font-mono font-bold ${r.status === "error" ? "text-red-400" : "text-white/40"}`}>{r.username}</span>
                    <span className="text-white/30">{r.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 역할별 페이지 접근 권한 설정 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck size={20} className="text-amber-500" />
            <div>
              <h2 className="text-lg font-black text-white">역할별 페이지 접근 권한</h2>
              <p className="text-xs text-white/40 mt-0.5">슈퍼어드민 권한은 항상 전체 접근이 허용됩니다</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/80 font-bold min-w-[160px]">페이지</TableHead>
                  <TableHead className="text-white/80 font-bold text-center">슈퍼어드민</TableHead>
                  {EDITABLE_ROLES.map(({ role, label }) => (
                    <TableHead key={role} className="text-white/80 font-bold text-center">{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_PAGES.map(({ path, name }) => (
                  <TableRow key={path} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="text-white font-semibold">{name}</TableCell>
                    {/* 슈퍼어드민은 항상 허용, 비활성 체크박스 */}
                    <TableCell className="text-center">
                      <Checkbox checked disabled className="w-5 h-5 border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 opacity-60" />
                    </TableCell>
                    {EDITABLE_ROLES.map(({ role }) => {
                      const key = `${role}:${path}`
                      const isChecked = permMap[role]?.[path] ?? false
                      const isSaving = permSaving === key
                      return (
                        <TableCell key={role} className="text-center">
                          <Checkbox
                            checked={isChecked}
                            disabled={isSaving}
                            onCheckedChange={(checked) => handlePermChange(role, path, !!checked)}
                            className="w-5 h-5 border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 보안담당자 설정 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Phone size={20} className="text-amber-500" />
            <div>
              <h2 className="text-lg font-black text-white">보안담당자 설정</h2>
              <p className="text-xs text-white/40 mt-0.5">방문신청 제출 시 선택된 보안담당자에게 SMS가 발송됩니다</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/80 font-bold w-16 text-center">지정</TableHead>
                  <TableHead className="text-white/80 font-bold">이름</TableHead>
                  <TableHead className="text-white/80 font-bold">아이디</TableHead>
                  <TableHead className="text-white/80 font-bold">전화번호</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {superAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-white/40">
                      슈퍼어드민 계정이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  superAdmins.map((admin) => (
                    <TableRow key={admin.account_id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!admin.is_security_contact}
                          disabled={securityContactSaving === admin.account_id}
                          onCheckedChange={(checked) => handleSecurityContactChange(admin.account_id, !!checked, admin.phone || "")}
                          className="w-5 h-5 border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                      </TableCell>
                      <TableCell className="text-white font-semibold">{admin.name}</TableCell>
                      <TableCell className="text-white/60 font-mono">{admin.username}</TableCell>
                      <TableCell>
                        <Input
                          value={admin.phone || ""}
                          placeholder="010-0000-0000"
                          className="bg-white/5 border-white/10 text-white h-9 rounded-lg w-40"
                          onChange={(e) => {
                            // 로컬 상태 업데이트 (SWR 캐시 직접 수정)
                            mutate(
                              accounts.map((a) => a.account_id === admin.account_id ? { ...a, phone: e.target.value } : a),
                              false
                            )
                          }}
                          onBlur={async (e) => {
                            // 포커스 아웃 시 저장
                            if (e.target.value !== admin.phone) {
                              try {
                                await fetch("/api/admin/security-contacts", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ account_id: admin.account_id, phone: e.target.value }),
                                })
                              } catch {}
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/80 font-bold">아이디</TableHead>
                  <TableHead className="text-white/80 font-bold">이름</TableHead>
                  <TableHead className="text-white/80 font-bold">권한</TableHead>
                  <TableHead className="text-white/80 font-bold">상태</TableHead>
                  <TableHead className="text-white/80 font-bold">생성일</TableHead>
                  <TableHead className="text-white/80 font-bold">마지막 로그인</TableHead>
                  <TableHead className="text-white/80 font-bold">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-white/40">
                      불러오는 중...
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-white/40">
                      계정이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.account_id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-white font-mono">{account.username}</TableCell>
                      <TableCell className="text-white font-semibold">{account.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${ROLE_COLORS[account.role] || ROLE_COLORS.manager}`}>
                          {ROLE_LABELS[account.role] || account.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${account.is_active ? "bg-green-500/20 text-green-300 border-green-500/40" : "bg-red-500/20 text-red-300 border-red-500/40"}`}>
                          {account.is_active ? "활성" : "비활성"}
                        </span>
                      </TableCell>
                      <TableCell className="text-white/60 text-sm">
                        {account.created_at ? new Date(account.created_at).toLocaleDateString("ko-KR") : "-"}
                      </TableCell>
                      <TableCell className="text-white/60 text-sm">
                        {account.last_login_at ? new Date(account.last_login_at).toLocaleString("ko-KR") : "미접속"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            onClick={() => { setEditAccount(account); setEditForm({ name: account.name, role: account.role, is_active: account.is_active }) }}
                            className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg"
                            title="수정"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="icon"
                            onClick={() => setResetAccount(account)}
                            className="w-8 h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg"
                            title="비밀번호 초기화"
                          >
                            <KeyRound size={14} />
                          </Button>
                          {String(account.account_id) !== user?.id && (
                            <Button
                              size="icon"
                              onClick={() => setDeleteAccount(account)}
                              className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg"
                              title="삭제"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 계정 생성 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0a1628] border-white/10 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">새 계정 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">아이디 (로그인 ID)</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="bg-white/5 border-white/10 text-white h-11 rounded-xl" placeholder="예: hong_gildong" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">이름 (contact_name 매칭용)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white h-11 rounded-xl" placeholder="예: 홍길동" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">전화번호</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-white/5 border-white/10 text-white h-11 rounded-xl" placeholder="예: 010-1234-5678" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">초기 비밀번호</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-white/5 border-white/10 text-white h-11 rounded-xl" placeholder="6자 이상" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">권한</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border-white/10 text-white">
                  <SelectItem value="manager">담당자</SelectItem>
                  <SelectItem value="security">특수경비대</SelectItem>
                  <SelectItem value="super_admin">슈퍼어드민</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setCreateOpen(false)} variant="ghost" className="text-white/60 hover:text-white">취소</Button>
              <Button onClick={handleCreate} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
                {isSubmitting ? "생성 중..." : "생성"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 계정 수정 다이얼로그 */}
      <Dialog open={!!editAccount} onOpenChange={(o) => !o && setEditAccount(null)}>
        <DialogContent className="bg-[#0a1628] border-white/10 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">계정 수정 — {editAccount?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">이름</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">권한</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border-white/10 text-white">
                  <SelectItem value="manager">담당자</SelectItem>
                  <SelectItem value="security">특수경비대</SelectItem>
                  <SelectItem value="super_admin">슈퍼어드민</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">상태</Label>
              <Select value={editForm.is_active ? "active" : "inactive"} onValueChange={(v) => setEditForm({ ...editForm, is_active: v === "active" })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border-white/10 text-white">
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setEditAccount(null)} variant="ghost" className="text-white/60 hover:text-white">취소</Button>
              <Button onClick={handleEdit} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
                {isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog open={!!resetAccount} onOpenChange={(o) => !o && setResetAccount(null)}>
        <DialogContent className="bg-[#0a1628] border-white/10 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">비밀번호 초기화 — {resetAccount?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-white/60">초기화 후 해당 계정은 다음 로그인 시 비밀번호 변경이 요구됩니다.</p>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-bold">새 임시 비밀번호</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-11 rounded-xl" placeholder="6자 이상" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => { setResetAccount(null); setNewPassword("") }} variant="ghost" className="text-white/60 hover:text-white">취소</Button>
              <Button onClick={handleResetPassword} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
                {isSubmitting ? "처리 중..." : "초기화"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 계정 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteAccount} onOpenChange={(o) => !o && setDeleteAccount(null)}>
        <DialogContent className="bg-[#0a1628] border-white/10 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">계정 삭제</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-white/60">
              <span className="text-white font-bold">{deleteAccount?.name} ({deleteAccount?.username})</span> 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setDeleteAccount(null)} variant="ghost" className="text-white/60 hover:text-white">취소</Button>
              <Button onClick={handleDelete} disabled={isSubmitting} className="bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-xl">
                {isSubmitting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
