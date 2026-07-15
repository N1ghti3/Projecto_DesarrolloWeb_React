// POST /api/auth/refresh - Intercambia un refresh token por un nuevo access token
import { db } from '@/lib/db'
import { verifyRefreshToken, signAccessToken, JwtUser } from '@/lib/auth'
import { ok, fail, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const refreshToken =
      body?.refreshToken || req.headers.get('x-refresh-token') || null

    if (!refreshToken) {
      return fail('Refresh token requerido', 401)
    }

    const decoded = verifyRefreshToken(String(refreshToken))
    if (!decoded) {
      return fail('Refresh token inválido o expirado', 401)
    }

    const user = await db.user.findUnique({ where: { id: decoded.id } })
    if (!user) {
      return fail('Usuario no encontrado', 401)
    }

    const safe: JwtUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }

    // Emitimos un nuevo access token (el refresh token se mantiene hasta su expiración)
    return ok({ accessToken: signAccessToken(safe), user: safe })
  } catch (err) {
    return handleRouteError(err)
  }
}
