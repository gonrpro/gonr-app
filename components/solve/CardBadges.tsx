'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import Badge from '@/components/ui/Badge'

interface CardBadgesProps {
  stainType?: string
  riskLevel?: string
  difficulty?: number
  tags?: string[]
  source?: string
}

// TASK-badges-v1 (2026-04-24):
// - riskLevel / difficulty / safety tags migrated to the shared Badge.
// - stainFamily colors kept inline below. Reason: v1 spec defers the
//   chemistry-family color taxonomy (protein / tannin / oil / dye / rust /
//   combination) — Atlas flagged collision risk with safety tones and asked
//   Lab not to guess. Migrate in a follow-on pass after the chemistry-family
//   colors are approved.
// - `eisen-method` badge kept inline. Reason: it's a "verification / source
//   provenance" signal; v1 does not yet include `verified` or `provenance`
//   tones (deferred). Gold is reserved for the Operator tier, so Eisen must
//   not use Badge tone="operator". Keep the warm-gold inline styling until
//   the trust-tones are approved.

export default function CardBadges({ stainType, riskLevel, difficulty, tags, source }: CardBadgesProps) {
  const { t } = useLanguage()

  // Stain-family inline colors — DEFERRED (see note above).
  const stainFamilyColors: Record<string, { bg: string; color: string; border: string }> = {
    protein:     { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', border: 'rgba(239,68,68,0.3)' },
    tannin:      { bg: 'rgba(180,83,9,0.1)',   color: '#b45309', border: 'rgba(180,83,9,0.3)' },
    'oil-grease': { bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.3)' },
    dye:         { bg: 'rgba(147,51,234,0.1)', color: '#7c3aed', border: 'rgba(147,51,234,0.3)' },
    oxidizable:  { bg: 'rgba(234,88,12,0.1)',  color: '#c2410c', border: 'rgba(234,88,12,0.3)' },
    combination: { bg: 'rgba(59,130,246,0.1)', color: '#2563eb', border: 'rgba(59,130,246,0.3)' },
  }

  const defaultColors = { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', border: 'rgba(107,114,128,0.3)' }

  const tagKeyMap: Record<string, string> = {
    'cold-water': 'badgeColdWater',
    'no-enzyme': 'badgeNoEnzyme',
    'no-bleach': 'badgeNoBleach',
    'no-heat': 'badgeNoHeat',
    'silk-safe': 'badgeSilkSafe',
    'dry-clean-only': 'badgeDryCleanOnly',
    'test-first': 'badgeTestFirst',
  }

  const pillStyle = (colors: { bg: string; color: string; border: string }): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 6px',
    borderRadius: '9999px',
    fontSize: '10px',
    fontWeight: 500,
    lineHeight: '16px',
    backgroundColor: colors.bg,
    color: colors.color,
    border: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  })

  const badges: React.ReactNode[] = []

  // 1. Stain Family Badge — INLINE (chemistry-family colors deferred).
  if (stainType) {
    const normalized = stainType.toLowerCase().replace(/[\s_]/g, '-')
    const colors = stainFamilyColors[normalized] || defaultColors
    badges.push(
      <span key="family" style={pillStyle(colors)}>
        {normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/-/g, ' ')}
      </span>
    )
  }

  // 2. Risk Level Badge — mapped to v1 tones.
  //    high/critical → danger ; medium → caution ; low/none → not shown.
  if (riskLevel && ['medium', 'high', 'critical'].includes(riskLevel.toLowerCase())) {
    const isHighOrCritical = ['high', 'critical'].includes(riskLevel.toLowerCase())
    const tone = isHighOrCritical ? 'danger' : 'caution'
    const riskKey = isHighOrCritical ? 'badgeHighRisk' : 'badgeMediumRisk'
    badges.push(
      <Badge key="risk" tone={tone} size="sm">
        {t(riskKey)}
      </Badge>
    )
  }

  // 3. Difficulty Badge (only >= 5) — both tiers read as "handle with care",
  //    so they map to the single caution tone. Text carries the granular
  //    distinction (Advanced vs Moderate).
  if (difficulty !== undefined && difficulty >= 5) {
    const isAdvanced = difficulty >= 7
    const diffKey = isAdvanced ? 'badgeAdvanced' : 'badgeModerate'
    badges.push(
      <Badge key="diff" tone="caution" size="sm">
        {t(diffKey)}
      </Badge>
    )
  }

  // 4. Eisen Method Badge — INLINE (trust/verification tones deferred).
  if (source === 'eisen-method') {
    const eisenColors = { bg: 'rgba(180,150,50,0.08)', color: '#a87d20', border: 'rgba(180,150,50,0.25)' }
    badges.push(
      <span key="eisen" style={pillStyle(eisenColors)}>
        {t('eisenMethod')}
      </span>
    )
  }

  // 5. Key Tag Badges — max 2, only allowed tags. Safety-info labels.
  //    Neutral tone — they're informational, not safety-outcome colors.
  if (tags && tags.length > 0) {
    const allowedTags = tags.filter(tag => tag in tagKeyMap).slice(0, 2)
    allowedTags.forEach((tag, i) => {
      badges.push(
        <Badge key={`tag-${i}`} tone="neutral" size="sm">
          {t(tagKeyMap[tag])}
        </Badge>
      )
    })
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      padding: '4px 0',
    }}>
      {badges}
    </div>
  )
}
