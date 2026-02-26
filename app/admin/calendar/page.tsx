"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  APPLICATION_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/lib/types"

interface CalendarDay {
  date: Date
  applications: Application[]
  isCurrentMonth: boolean
  isToday: boolean
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("APPROVED")

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    generateCalendar()
  }, [currentDate, applications, statusFilter])

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/admin/requests")
      if (response.ok) {
        const result = await response.json()
        const apps = result.data || []
        console.log("[v0] Fetched applications:", apps)
        console.log("[v0] Type breakdown:", {
          GROUP_VISIT: apps.filter((a: any) => a.type === 'GROUP_VISIT').length,
          VISIT_R3: apps.filter((a: any) => a.type === 'VISIT_R3').length,
          PORT_ACCESS: apps.filter((a: any) => a.type === 'PORT_ACCESS').length,
          total: apps.length
        })
        setApplications(apps)
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      date.setHours(0, 0, 0, 0)

      const dayApplications = applications.filter((app) => {
        if (statusFilter !== "ALL" && app.status !== statusFilter) {
          return false
        }

        const visitDate = getVisitDate(app)
        if (!visitDate) return false

        const appDate = new Date(visitDate)
        appDate.setHours(0, 0, 0, 0)
        return appDate.getTime() === date.getTime()
      })

      days.push({
        date: new Date(date),
        applications: dayApplications,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
      })
    }

    setCalendarDays(days)
  }

  const getVisitDate = (app: Application): Date | null => {
    const appAny = app as any
    let result: Date | null = null
    
    switch (app.type) {
      case "GROUP_VISIT":
        result = appAny.visit_start_date ? new Date(appAny.visit_start_date) : null
        break
      case "PORT_ACCESS":
        // Try multiple field names for PORT_ACCESS
        const portDate = appAny.access_start_datetime || appAny.visit_start_date || appAny.visit_datetime
        result = portDate ? new Date(portDate) : null
        console.log('[v0] PORT_ACCESS date check:', {
          receipt: app.receipt,
          access_start_datetime: appAny.access_start_datetime,
          visit_start_date: appAny.visit_start_date,
          visit_datetime: appAny.visit_datetime,
          result
        })
        break
      case "VISIT_R3":
        result = appAny.visit_datetime ? new Date(appAny.visit_datetime) : null
        break
      default:
        result = null
    }
    
    return result
  }

  const getApplicantInfo = (app: Application) => {
    switch (app.type) {
      case "GROUP_VISIT":
        return {
          organization: (app as any).organization || "미상",
          contact: (app as any).contact_name || (app as any).representative || "미상",
        }
      case "PORT_ACCESS":
        return {
          organization: (app as any).company_name || (app as any).visitor_organization || "미상",
          contact: (app as any).applicant_name || (app as any).visitor_name || (app as any).contact_name || "미상",
        }
      case "VISIT_R3":
        return {
          organization: (app as any).visitor_organization || "미상",
          contact: (app as any).visitor_name || (app as any).contact_name || "미상",
        }
      default:
        return {
          organization: "미상",
          contact: "미상",
        }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200"
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "GROUP_VISIT":
        return "bg-purple-100 text-purple-800"
      case "PORT_ACCESS":
        return "bg-blue-100 text-blue-800"
      case "VISIT_R3":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatistics = () => {
    const filteredApps =
      statusFilter === "ALL" ? applications : applications.filter((app) => app.status === statusFilter)
    const currentMonthApps = filteredApps.filter((app) => {
      const visitDate = getVisitDate(app)
      if (!visitDate) return false
      const appDate = new Date(visitDate)
      return appDate.getMonth() === currentDate.getMonth() && appDate.getFullYear() === currentDate.getFullYear()
    })

    return {
      total: currentMonthApps.length,
      groupVisit: currentMonthApps.filter((app) => app.type === "GROUP_VISIT").length,
      portAccess: currentMonthApps.filter((app) => app.type === "PORT_ACCESS").length,
      visitR3: currentMonthApps.filter((app) => app.type === "VISIT_R3").length,
    }
  }

  const stats = getStatistics()

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">방문 캘린더</h1>
            <p className="text-muted-foreground">신청일별 방문 현황 및 관리</p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "ALL")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="APPROVED">승인됨</SelectItem>
                <SelectItem value="PENDING">대기중</SelectItem>
                <SelectItem value="UNDER_REVIEW">검토중</SelectItem>
                <SelectItem value="REJECTED">반려됨</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={goToToday} variant="outline" size="sm">
              오늘
            </Button>
            <Button onClick={fetchApplications} variant="outline" size="sm">
              새로고침
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground">이번 달 총 신청</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.groupVisit}</div>
              <p className="text-xs text-muted-foreground">단체방문신청</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.portAccess}</div>
              <p className="text-xs text-muted-foreground">항만출입신청</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.visitR3}</div>
              <p className="text-xs text-muted-foreground">개인방문신청</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {formatDate(currentDate)}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({statusFilter === "ALL" ? "전체" : APPLICATION_STATUS_LABELS[statusFilter as ApplicationStatus]}{" "}
                  신청)
                </span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button onClick={() => navigateMonth(-1)} variant="outline" size="sm">
                  이전
                </Button>
                <Button onClick={() => navigateMonth(1)} variant="outline" size="sm">
                  다음
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`
                    min-h-28 p-1 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50
                    ${day.isCurrentMonth ? "bg-background" : "bg-muted/20"}
                    ${day.isToday ? "ring-2 ring-primary" : ""}
                    ${day.applications.length > 0 ? "hover:shadow-md" : ""}
                  `}
                  onClick={() => day.applications.length > 0 && setSelectedDay(day)}
                >
                  <div className="flex flex-col h-full">
                    <div
                      className={`
                        text-sm font-medium mb-1 flex items-center justify-between
                        ${day.isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                        ${day.isToday ? "text-primary font-bold" : ""}
                      `}
                    >
                      <span>{day.date.getDate()}</span>
                      {day.applications.length > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                          {day.applications.length}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      {day.applications.slice(0, 3).map((app, appIndex) => {
                        const applicantInfo = getApplicantInfo(app)
                        return (
                          <div
                            key={appIndex}
                            className={`
                              text-xs px-1.5 py-1 rounded truncate border
                              ${getTypeColor(app.type)}
                            `}
                            title={`${APPLICATION_TYPE_LABELS[app.type]} - ${applicantInfo.organization} (${applicantInfo.contact}) - ${app.receipt}`}
                          >
                            <div className="font-medium">{APPLICATION_TYPE_LABELS[app.type]}</div>
                            <div className="text-[10px] opacity-80 truncate">{applicantInfo.organization}</div>
                          </div>
                        )
                      })}
                      {day.applications.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1 py-0.5 bg-muted/50 rounded text-center">
                          +{day.applications.length - 3}개 더
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">범례</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200"></div>
                <span className="text-sm">단체방문신청</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                <span className="text-sm">항만출입신청</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                <span className="text-sm">개인방문신청</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.date.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </DialogTitle>
            <DialogDescription>총 {selectedDay?.applications.length}건의 신청이 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDay?.applications.map((app) => {
              const visitDate = getVisitDate(app)
              const applicantInfo = getApplicantInfo(app)
              return (
                <Card key={app.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getTypeColor(app.type)}>{APPLICATION_TYPE_LABELS[app.type]}</Badge>
                          <Badge variant="outline" className={getStatusColor(app.status)}>
                            {APPLICATION_STATUS_LABELS[app.status]}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground font-mono">{app.receipt}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground">신청자 정보</h4>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">소속:</span> {applicantInfo.organization}
                            </div>
                            <div>
                              <span className="font-medium">담당자:</span> {applicantInfo.contact}
                            </div>
                            <div>
                              <span className="font-medium">연락처:</span> {app.contact_phone || "미상"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground">방문 정보</h4>
                          <div className="space-y-1 text-sm">
                            {visitDate && (
                              <div>
                                <span className="font-medium">방문시간:</span> {formatTime(visitDate)}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">신청일:</span>{" "}
                              {new Date(app.created_at).toLocaleDateString("ko-KR")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {app.type === "GROUP_VISIT" && (
                        <div className="pt-2 border-t">
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="font-medium">방문목적:</span> {(app as any).visit_purpose}
                            </div>
                            <div>
                              <span className="font-medium">방문장소:</span> {(app as any).visit_location}
                            </div>
                            <div>
                              <span className="font-medium">방문인원:</span> {(app as any).visitors?.length || 0}명
                            </div>
                          </div>
                        </div>
                      )}

                      {app.type === "PORT_ACCESS" && (
                        <div className="pt-2 border-t">
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="font-medium">출입목적:</span> {(app as any).access_purpose}
                            </div>
                            <div>
                              <span className="font-medium">작업내용:</span> {(app as any).work_description}
                            </div>
                          </div>
                        </div>
                      )}

                      {app.type === "VISIT_R3" && (
                        <div className="pt-2 border-t">
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="font-medium">방문목적:</span> {(app as any).visit_purpose}
                            </div>
                            <div>
                              <span className="font-medium">방문자:</span> {(app as any).visitor_name}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
