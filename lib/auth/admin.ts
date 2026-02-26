export interface AdminUser {
  id: string
  username: string
  name: string
  role: string
}

// TODO: Replace with proper authentication in production
export const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "0000", // Changed password from admin123 to 0000
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password
}

export function generateAdminToken(user: AdminUser): string {
  // TODO: Replace with proper JWT implementation
  const tokenData = JSON.stringify({ ...user, exp: Date.now() + 24 * 60 * 60 * 1000 })
  return Buffer.from(tokenData, "utf8").toString("base64")
}

export function validateAdminToken(token: string): AdminUser | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"))
    if (decoded.exp < Date.now()) {
      return null
    }
    return {
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

export const MOCK_ADMIN_USER: AdminUser = {
  id: "admin-1",
  username: "admin",
  name: "관리자",
  role: "admin",
}
