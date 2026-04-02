import type { ApplicationStatus } from "@/lib/types"

interface StatusTimelineProps {
  status: ApplicationStatus
  createdAt: Date
  updatedAt: Date
  rejectionReason?: string
}

// DB에 KST로 저장되어 있으므로 UTC 필드를 그대로 사용
const formatDateTimeKST = (date: Date | null) => {
  if (!date) return ""
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const hour = d.getUTCHours()
  const minute = d.getUTCMinutes().toString().padStart(2, '0')
  const ampm = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 || 12
  return `${year}. ${month}. ${day}. ${ampm} ${hour12}:${minute}`
}

export function StatusTimeline({ status, createdAt, updatedAt, rejectionReason }: StatusTimelineProps) {
  const steps = [
    {
      id: "PENDING",
      title: "접수완료",
      description: "신청서가 접수되었습니다",
      icon: "✓",
      date: createdAt,
    },
    {
      id: "UNDER_REVIEW",
      title: "검토중",
      description: "담당자가 신청서를 검토하고 있습니다",
      icon: "⚠",
      date: status === "UNDER_REVIEW" || status === "APPROVED" || status === "REJECTED" ? updatedAt : null,
    },
    {
      id: status === "REJECTED" ? "REJECTED" : "APPROVED",
      title: status === "REJECTED" ? "반려" : "승인완료",
      description: status === "REJECTED" ? rejectionReason || "신청이 반려되었습니다" : "출입이 승인되었습니다",
      icon: status === "REJECTED" ? "✗" : "✓",
      date: status === "APPROVED" || status === "REJECTED" ? updatedAt : null,
    },
  ]

  const getStepStatus = (stepId: string) => {
    const statusOrder = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]
    const currentIndex = statusOrder.indexOf(status)
    const stepIndex = statusOrder.indexOf(stepId)

    if (stepId === status) return "current"
    if (stepId === "REJECTED" && status === "REJECTED") return "current"
    if (stepId === "APPROVED" && status === "APPROVED") return "current"
    if (stepIndex < currentIndex) return "completed"
    if (stepId === "REJECTED" && status !== "REJECTED") return "hidden"
    if (stepId === "APPROVED" && status === "REJECTED") return "hidden"
    return "pending"
  }

  const getStepColor = (stepStatus: string, stepId: string) => {
    switch (stepStatus) {
      case "completed":
        return "text-emerald-500 bg-emerald-500/20 border border-emerald-500/30"
      case "current":
        if (stepId === "REJECTED") return "text-red-500 bg-red-500/20 border border-red-500/30"
        if (stepId === "UNDER_REVIEW") return "text-amber-500 bg-amber-500/20 border border-amber-500/30"
        return "text-emerald-500 bg-emerald-500/20 border border-emerald-500/30"
      case "pending":
        return "text-white/30 bg-white/5 border border-white/10"
      default:
        return "text-white/30 bg-white/5 border border-white/10"
    }
  }

  const visibleSteps = steps.filter((step) => getStepStatus(step.id) !== "hidden")

  return (
    <div className="space-y-4">
      {visibleSteps.map((step, index) => {
        const stepStatus = getStepStatus(step.id)
        const isLast = index === visibleSteps.length - 1

        return (
          <div key={step.id} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`p-3 rounded-full ${getStepColor(stepStatus, step.id)} flex items-center justify-center w-12 h-12`}
              >
                <span className="text-base font-black">{step.icon}</span>
              </div>
              {!isLast && (
                <div className={`w-0.5 h-10 mt-2 ${stepStatus === "completed" ? "bg-emerald-500/30" : "bg-white/10"}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <h4
                  className={`text-xl font-black ${
                    stepStatus === "current"
                      ? step.id === "REJECTED" ? "text-red-500" : step.id === "UNDER_REVIEW" ? "text-amber-500" : "text-emerald-500"
                      : stepStatus === "completed"
                        ? "text-white"
                        : "text-white/40"
                  }`}
                >
                  {step.title}
                </h4>
                {step.date && (
                  <span className="text-sm font-bold text-white/60 whitespace-nowrap">{formatDateTimeKST(step.date)}</span>
                )}
              </div>
              <p
                className={`text-sm mt-2 font-medium ${
                  stepStatus === "current"
                    ? step.id === "REJECTED" ? "text-red-400/80" : "text-white/60"
                    : stepStatus === "completed"
                      ? "text-white/50"
                      : "text-white/30"
                }`}
              >
                {step.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
