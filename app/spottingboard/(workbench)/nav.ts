// app/spottingboard/(workbench)/nav.ts — TASK-169
//
// Single source of truth for workbench nav items. Imported by layout.tsx
// (server, renders the desktop left rail) and MobileNav.tsx (client,
// renders the mobile slide-out drawer).

export interface WorkbenchNavItem {
  href: string
  label: string
  description: string
}

export const WORKBENCH_NAV: WorkbenchNavItem[] = [
  { href: '/spottingboard/dashboard',  label: 'Dashboard',         description: 'Workbench overview' },
  { href: '/spottingboard/library',    label: 'Brain Library',     description: 'Plant-owned protocol cards' },
  { href: '/spottingboard/intake',     label: 'Capture rule',      description: 'Add chemistry, procedure, or plant rule' },
  { href: '/spottingboard/chemistry',  label: 'Chemistry Stack',   description: 'Agents · solvents · equipment' },
  { href: '/spottingboard/supervisor', label: 'Supervisor Review', description: 'Promote · reject · escalate' },
  { href: '/spottingboard/export',     label: 'Export Center',     description: 'Own and export your brain' },
  { href: '/spottingboard/profile',    label: 'Plant Profile',     description: 'Plant DNA · risk boundaries' },
]
