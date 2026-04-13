const AUTH_REASONS = ['login_required', 'tier_required', 'auth_error']

export function isAuthError(status: number, body: { error?: string }): boolean {
  return status === 401 && AUTH_REASONS.includes(body.error ?? '')
}

export function needsLogin(body: { error?: string }): boolean {
  return body.error === 'login_required' || body.error === 'auth_error'
}
