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
  onConfirm: (application: Application, action: "approve" | "reject", reason?: string, isFreePass?: boolean) => void
}

export function ApprovalDialog({ application, action, open, onClose, onConfirm }: ApprovalDialogProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async (isFreePass = false) => {
    if (action === "reject" && !reason.trim()) {
      return
    }

    setIsSubmitting(true)
    await onConfirm(application, action, reason.trim() || undefined, isFreePass)
    setIsSubmitting(false)
    setReason("")
  }

  const handleClose = () => {
    setReason("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "approve" ? (
              <span className="text-green-600">✅</span>
            ) : (
              <span className="text-red-600">❌</span>
            )}
            {action === "approve" ? "신청 승인" : "신청 반려"}
          </DialogTitle>
          <DialogDescription>
            접수번호: {application.receipt}
            <br />
            {action === "approve"
              ? "이 신청을 승인하시겠습니까?"
              : "이 신청을 반려하시겠습니까? 반려 사유를 입력해주세요."}
          </DialogDescription>
        </DialogHeader>

        {action === "reject" && (
          <div className="space-y-2">
            <Label htmlFor="reason">반려 사유 *</Label>
            <Textarea
              id="reason"
              placeholder="반려 사유를 상세히 입력해주세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        )}

        {action === "approve" && (
          <div className="text-xs text-white/60 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1">
            <p className="font-bold text-amber-300">💡 프리패스 승인이란?</p>
            <p>차량 출입 시 <span className="font-bold text-amber-200">FREE PASS</span> 뱃지가 표시되어 현장에서 쉽게 식별할 수 있습니다. (유조차, 정비업체 등 우선 통과 차량)</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
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
