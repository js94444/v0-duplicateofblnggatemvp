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
  onConfirm: (application: Application, action: "approve" | "reject", reason?: string) => void
}

export function ApprovalDialog({ application, action, open, onClose, onConfirm }: ApprovalDialogProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (action === "reject" && !reason.trim()) {
      return
    }

    setIsSubmitting(true)
    await onConfirm(application, action, reason.trim() || undefined)
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || (action === "reject" && !reason.trim())}
            variant={action === "approve" ? "default" : "destructive"}
          >
            {isSubmitting ? "처리중..." : action === "approve" ? "승인" : "반려"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
