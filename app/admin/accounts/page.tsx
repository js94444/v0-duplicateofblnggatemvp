"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, KeyRound, RefreshCw } from "lucide-react"

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
  is_active: boolean
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
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "manager" })
  const [editForm, setEditForm] = useState({ name: "", role: "", is_active: true })
  const [newPassword, setNewPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetcher = (url: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.data)

  const { data: accounts = [], isLoading, mutate } = useSWR<Account[]>(
    token ? "/api/admin/accounts" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

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
      setForm({ username: "", name: "", password: "", role: "manager" })
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
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-5 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              <Plus size={16} className="mr-2" />
              계정 생성
            </Button>
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
