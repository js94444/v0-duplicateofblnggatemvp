// 스캐너 토큰 검증 유틸리티

const SCANNER_TOKEN_KEY = "scanner-token"

/** 스캐너 토큰을 sessionStorage에 저장 */
export function saveScannerToken(token: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SCANNER_TOKEN_KEY, token)
  }
}

/** 스캐너 토큰 가져오기 */
export function getScannerToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(SCANNER_TOKEN_KEY)
}

/** 스캐너 토큰 삭제 */
export function clearScannerToken() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SCANNER_TOKEN_KEY)
  }
}

/** 스캐너 토큰이 유효한지 클라이언트에서 확인 */
export function isScannerAuthenticated(): boolean {
  const token = getScannerToken()
  if (!token) return false

  try {
    const decoded = JSON.parse(atob(token))
    return decoded.type === "scanner" && decoded.exp > Date.now()
  } catch {
    return false
  }
}

/** 스캐너 토큰 검증 (서버/클라이언트 모두 사용 가능) */
export function validateScannerToken(token: string | null): boolean {
  if (!token) return false

  try {
    const decoded = JSON.parse(atob(token))
    return decoded.type === "scanner" && decoded.exp > Date.now()
  } catch {
    return false
  }
}
