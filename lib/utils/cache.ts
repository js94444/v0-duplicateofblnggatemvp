interface CachedApplication {
  receipt: string
  type: string
  data: any
  timestamp: number
  status?: string
}

const CACHE_KEY = "blng-applications"
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24시간

export const ApplicationCache = {
  // 신청 데이터를 캐시에 저장
  saveApplication: (receipt: string, type: string, data: any) => {
    try {
      const cached: CachedApplication = {
        receipt,
        type,
        data,
        timestamp: Date.now(),
        status: "PENDING",
      }

      const existing = ApplicationCache.getAllApplications()
      const updated = existing.filter((app) => app.receipt !== receipt)
      updated.push(cached)

      localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
      console.log("[v0] Application cached:", receipt)
    } catch (error) {
      console.error("[v0] Failed to cache application:", error)
    }
  },

  // 특정 접수번호의 신청 데이터 조회
  getApplication: (receipt: string): CachedApplication | null => {
    try {
      const applications = ApplicationCache.getAllApplications()
      return applications.find((app) => app.receipt === receipt) || null
    } catch (error) {
      console.error("[v0] Failed to get cached application:", error)
      return null
    }
  },

  // 모든 캐시된 신청 데이터 조회
  getAllApplications: (): CachedApplication[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return []

      const applications: CachedApplication[] = JSON.parse(cached)
      const now = Date.now()

      // 만료된 캐시 제거
      const valid = applications.filter((app) => now - app.timestamp < CACHE_EXPIRY)

      if (valid.length !== applications.length) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(valid))
      }

      return valid
    } catch (error) {
      console.error("[v0] Failed to get cached applications:", error)
      return []
    }
  },

  // 신청 상태 업데이트
  updateApplicationStatus: (receipt: string, status: string) => {
    try {
      const applications = ApplicationCache.getAllApplications()
      const updated = applications.map((app) => (app.receipt === receipt ? { ...app, status } : app))
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
      console.log("[v0] Application status updated:", receipt, status)
    } catch (error) {
      console.error("[v0] Failed to update application status:", error)
    }
  },

  // 캐시 초기화
  clearCache: () => {
    try {
      localStorage.removeItem(CACHE_KEY)
      console.log("[v0] Application cache cleared")
    } catch (error) {
      console.error("[v0] Failed to clear cache:", error)
    }
  },
}
