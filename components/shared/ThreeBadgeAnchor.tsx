// Shared safety-anchor primitive — three separate visible badges per item:
// authority class · risk tier · review status. Never collapse into "verified."
// Used by Spotting Board (workbench) AND GONR runtime (recommendation cards).
// SB locked label set per TASK-145 SB review gate.

import type { ReactNode } from 'react'

export type AuthorityClass =
  | 'source-backed'
  | 'plant-local'
  | 'unverified-tribal'
  | 'supervisor-only'
  | 'rejected'

export type RiskTier =
  | 'safe-default'
  | 'requires-supervisor'
  | 'high-risk'
  | 'claim-sensitive'

export type ReviewStatus =
  | 'unreviewed'
  | 'in-review'
  | 'reviewed-accept'
  | 'reviewed-reject'

const AUTHORITY_LABEL: Record<AuthorityClass, string> = {
  'source-backed': 'GONR-backed source',
  'plant-local': 'Plant rule',
  'unverified-tribal': 'Unverified note',
  'supervisor-only': 'Supervisor-only',
  'rejected': 'Rejected',
}

const RISK_LABEL: Record<RiskTier, string> = {
  'safe-default': 'Safe default',
  'requires-supervisor': 'Requires supervisor',
  'high-risk': 'High risk',
  'claim-sensitive': 'Claim-sensitive',
}

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  'unreviewed': 'Unreviewed',
  'in-review': 'In review',
  'reviewed-accept': 'Reviewed · accepted',
  'reviewed-reject': 'Reviewed · rejected',
}

export type ThreeBadgeAnchorProps = {
  authorityClass: AuthorityClass
  riskTier: RiskTier
  reviewStatus: ReviewStatus
  size?: 'sm' | 'md'
}

export function ThreeBadgeAnchor({ authorityClass, riskTier, reviewStatus, size = 'md' }: ThreeBadgeAnchorProps) {
  return (
    <div className={size === 'sm' ? 'tba tba-sm' : 'tba'} role="group" aria-label="Authority, risk, and review status">
      <Badge tone={`authority-${authorityClass}`}>{AUTHORITY_LABEL[authorityClass]}</Badge>
      <Badge tone={`risk-${riskTier}`}>{RISK_LABEL[riskTier]}</Badge>
      <Badge tone={`review-${reviewStatus}`}>{REVIEW_LABEL[reviewStatus]}</Badge>
    </div>
  )
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`tba-badge ${tone}`}>{children}</span>
}
