type AdminPreferenceRecord = {
  googleAccessToken?: string | null
  googleRefreshToken?: string | null
  googleTokenExpiry?: Date | null
  [key: string]: unknown
}

/**
 * Backups are downloaded, uploaded to Drive, and stored on disk. OAuth access
 * and refresh tokens are credentials and must never be part of that payload.
 * The rest of the preference record (e.g. hiddenMenus) is still backed up.
 */
export function sanitizeAdminPreferences<T extends AdminPreferenceRecord>(preferences: T[]) {
  return preferences.map((preference) => {
    const {
      googleAccessToken: _accessToken,
      googleRefreshToken: _refreshToken,
      googleTokenExpiry: _tokenExpiry,
      ...safePreference
    } = preference
    return safePreference
  })
}
