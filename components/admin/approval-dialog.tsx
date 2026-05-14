"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Application } from "@/lib/types"

interface ApprovalDialogProps {
  application: Application
  action: "approve" | "reject"
  open: boolean
  onClose: () => void
  onConfirm: (application: Application, action: "approve" | "reject", reason?: string, isFreePass?: boolean, approvalNote?: string) => void
}

export function ApprovalDialog({ application, action, open, onClose, onConfirm }: ApprovalDialogProps) {
  const [reason, setReason] = useState("")
  const [approvalNote, setApprovalNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async (isFreePass = false) => {
    if (action === "reject" && !reason.trim()) {
      return
    }

    setIsSubmitting(true)
    await onConfirm(application, action, reason.trim() || undefined, isFreePass, approvalNote.trim() || undefined)
    setIsSubmitting(false)
    setReason("")
    setApprovalNote("")
  }

  const handleClose = () => {
    setReason("")
    setApprovalNote("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {action === "approve" ? (
              <span className="text-green-400">✅</span>
            ) : (
              <span className="text-red-400">❌</span>
            )}
            {action === "approve" ? "신청 승인" : "신청 반려"}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            접수번호: <span className="text-white font-mono font-bold">{application.receipt}</span>
            <br />
            {action === "approve"
              ? "이 신청을 승인하시겠습니까?"
              : "이 신청을 반려하시겠습니까? 반려 사유를 입력해주세요."}
          </DialogDescription>
        </DialogHeader>

        {action === "reject" && (
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-white/80 font-bold">반려 사유 <span className="text-red-400">*</span></Label>
            <Textarea
              id="reason"
              placeholder="반려 사유를 상세히 입력해주세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        )}

        {action === "approve" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="approval_note" className="text-white/80 font-bold">승인 의견 <span className="text-white/40 font-normal">(선택)</span></Label>
              <Textarea
                id="approval_note"
                placeholder="예: VIP 방문, 우선 처리 등 (선택 입력)"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                rows={2}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="text-xs text-white/60 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1">
              <p className="font-bold text-amber-300">💡 프리패스 승인이란?</p>
              <p>차량 번호에 <span className="font-bold text-amber-200">FREE PASS</span> 뱃지 표시</p>
            </div>
          </>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white/80">
            취소
          </Button>
          {action === "approve" ? (
            <>
              <Button
                onClick={() => handleConfirm(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "처리중..." : "승인"}
              </Button>
              <Button
                onClick={() => handleConfirm(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {isSubmitting ? "처리중..." : "⚡ 프리패스 승인"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleConfirm(false)}
              disabled={isSubmitting || !reason.trim()}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "처리중..." : "반려"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
