"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { QrCode, ArrowLeft, RefreshCw } from "lucide-react"

const GATE_LABELS: Record<string, string> = {
  main: "정문",
  pier_1: "1부두",
  pier_2: "2부두",
}

interface ApiScanRow {
  pass_id: string
  application_id: number
  scanned_at: string
  result: "ALLOW" | "DENY"
  direction?: string | null
  visitor_name: string | null
  visitor_org: string | null
  contact_name: string | null
  access_area: string | null
  vehicle_number: string | null
}

interface StatusRow {
  pass_id: string
  visitor_name: string | null
  lastEntryAt: string | null
  lastExitAt: string | null
  lastEventAt: number
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  })
}

export default function ScannerStatusPage() {
  const searchParams = useSearchParams()
  const gate = searchParams.get("gate") ?? "main"
  const [rows, setRows] = useState<StatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const scanSiteParam = gate === "pier_1" ? "pier_1" : gate === "pier_2" ? "pier_2" : "main"

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/qr-scans?scan_site=${scanSiteParam}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || "출입 현황을 불러오지 못했습니다.")
      }
      const json = await res.json()
      const raw: ApiScanRow[] = json.data || []
      const byPass = new Map<string, Omit<StatusRow, "lastEventAt"> & { lastEventAt: number }>()
      for (const row of raw) {
        const key = row.pass_id
        if (!byPass.has(key)) {
          byPass.set(key, {
            pass_id: row.pass_id,
            visitor_name: row.visitor_name,
            lastEntryAt: null,
            lastExitAt: null,
            lastEventAt: 0,
          })
        }
        const rec = byPass.get(key)!
        if (row.result === "ALLOW" && row.direction === "ENTRY" && row.scanned_at) {
          const t = new Date(row.scanned_at).getTime()
          if (!rec.lastEntryAt || t > new Date(rec.lastEntryAt).getTime()) rec.lastEntryAt = row.scanned_at
          if (t > rec.lastEventAt) rec.lastEventAt = t
        }
        if (row.result === "ALLOW" && row.direction === "EXIT" && row.scanned_at) {
          const t = new Date(row.scanned_at).getTime()
          if (!rec.lastExitAt || t > new Date(rec.lastExitAt).getTime()) rec.lastExitAt = row.scanned_at
          if (t > rec.lastEventAt) rec.lastEventAt = t
        }
      }
      const sorted = Array.from(byPass.values()).sort((a, b) => b.lastEventAt - a.lastEventAt)
      setRows(sorted)
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 중 오류가 발생했습니다.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [gate])

  const TEN_MINUTES_MS = 10 * 60 * 1000
  const getRecentClass = (row: StatusRow) => {
    const entryMs = row.lastEntryAt ? Date.now() - new Date(row.lastEntryAt).getTime() : Infinity
    const exitMs = row.lastExitAt ? Date.now() - new Date(row.lastExitAt).getTime() : Infinity
    const entryRecent = entryMs >= 0 && entryMs <= TEN_MINUTES_MS
    const exitRecent = exitMs >= 0 && exitMs <= TEN_MINUTES_MS
    if (!entryRecent && !exitRecent) return ""
    const lastExit = row.lastExitAt ? new Date(row.lastExitAt).getTime() : 0
    const lastEntry = row.lastEntryAt ? new Date(row.lastEntryAt).getTime() : 0
    return lastExit >= lastEntry ? "bg-red-500/20" : "bg-emerald-500/20"
  }

  const gateLabel = GATE_LABELS[gate] ?? "정문"

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
        <Link
          href={`/scanner?gate=${gate}`}
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium"
        >
          <ArrowLeft size={18} />
          스캐너
        </Link>
        <span className="text-amber-400 font-bold text-sm truncate">{gateLabel} 출입 현황</span>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 disabled:opacity-50 text-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/50">
            <RefreshCw size={32} className="animate-spin mb-3" />
            <p className="text-sm">출입 현황 불러오는 중...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-white/40 text-sm">
            이 출입구에서 처리된 출입 이력이 없습니다.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2.5 text-xs font-bold text-white/60 uppercase tracking-wider">방문자</th>
                  <th className="px-3 py-2.5 text-xs font-bold text-white/60 uppercase tracking-wider">입장 시각</th>
                  <th className="px-3 py-2.5 text-xs font-bold text-white/60 uppercase tracking-wider">퇴장 시각</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.pass_id}
                    className={`border-t border-white/5 ${getRecentClass(row)}`}
                  >
                    <td className="px-3 py-2.5 text-sm font-medium text-white/90">
                      {row.visitor_name || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-emerald-300/90">
                      {formatDateTime(row.lastEntryAt)}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-amber-300/90">
                      {formatDateTime(row.lastExitAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Link
          href={`/scanner?gate=${gate}`}
          className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-amber-500/50 bg-amber-500/20 text-amber-400 font-bold text-base hover:bg-amber-500/30 transition-colors"
        >
          <QrCode size={22} />
          QR 스캔하기
        </Link>
      </main>

      <footer className="px-4 py-3 text-center text-[10px] text-white/20 tracking-widest uppercase border-t border-white/5">
        B-LINK · 출입 현황
      </footer>
    </div>
  )
}
