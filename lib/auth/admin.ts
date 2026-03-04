import bcrypt from "bcryptjs"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export type AdminRole = "super_admin" | "security" | "manager"

export interface AdminUser {
  id: string
  username: string
  name: string
  role: AdminRole
  must_change_password?: boolean
}

// JWT 서명에 사용할 시크릿 (env에서 읽고 없으면 fallback)
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "blink-admin-secret-2024"
const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000 // 8시간

/** DB에서 계정을 조회해 비밀번호를 검증하고 AdminUser 반환 */
export async function validateAdminCredentials(
  username: string,
  password: string
): Promise<AdminUser | null> {
  try {
    const account = await AzureSqlDB.getAccountByUsername(username)
    if (!account) return null

    const isValid = await bcrypt.compare(password, account.password_hash)
    if (!isValid) return null

    // 마지막 로그인 시각 업데이트
    await AzureSqlDB.updateLastLogin(account.account_id).catch(() => {})

    return {
      id: String(account.account_id),
      username: account.username,
      name: account.name,
      role: account.role as AdminRole,
      must_change_password: !!account.must_change_password,
    }
  } catch (error) {
    console.error("[auth] validateAdminCredentials error:", error)
    return null
  }
}

/** 비밀번호를 bcrypt 해시로 변환 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

/** AdminUser를 Base64 JWT 토큰으로 인코딩 (서명 포함) */
export function generateAdminToken(user: AdminUser): string {
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    must_change_password: user.must_change_password ?? false,
    exp: Date.now() + TOKEN_EXPIRY_MS,
    sig: JWT_SECRET,
  }
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64")
}

/** 토큰을 검증해 AdminUser 반환 (만료 또는 서명 불일치 시 null) */
export function validateAdminToken(token: string): AdminUser | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"))
    if (decoded.exp < Date.now()) return null
    if (decoded.sig !== JWT_SECRET) return null
    return {
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      role: decoded.role as AdminRole,
      must_change_password: decoded.must_change_password ?? false,
    }
  } catch {
    return null
  }
}

/** 역할별 접근 권한 확인 */
export function canViewAllApplications(role: AdminRole): boolean {
  return role === "super_admin" || role === "security"
}

export function canManageAccounts(role: AdminRole): boolean {
  return role === "super_admin"
}

export function canCheckApplication(role: AdminRole): boolean {
  return role !== undefined
}
