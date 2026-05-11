import { redirect } from 'next/navigation'

// Clean login entry point for spottingboard.com/login
// Keeps users on spottingboard.com domain without exposing /auth/login path.
export default function SpottingBoardLogin() {
  redirect('/auth/login?brand=spottingboard&next=/spottingboard/setup')
}
