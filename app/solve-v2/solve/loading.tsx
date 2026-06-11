import SolveBootShell from '@/components/consumer/SolveBootShell'

// TASK-240 — route-level loading UI: the boot shell (with first-aid guidance)
// prerenders for the route transition, so navigation from Home shows a
// meaningful state immediately instead of layout chrome only.
export default function Loading() {
  return <SolveBootShell />
}
