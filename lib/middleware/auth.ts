import jwt from 'jsonwebtoken'

export type AdminPayload = {
  username: string
  role: 'admin'
  iat?: number
  exp?: number
}

export function verifyAdminToken(token: string): AdminPayload | null {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment')
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AdminPayload
    // Pastikan role admin
    if (decoded.role !== 'admin') {
      return null
    }
    return decoded
  } catch (error) {
    // Token invalid / expired
    return null
  }
}