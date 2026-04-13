export function getStoredUserEmail(): string | undefined {
  if (typeof window === 'undefined') return undefined

  const email = localStorage.getItem('gonr_user_email')?.trim().toLowerCase()
  return email || undefined
}
