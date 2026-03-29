'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface CardBadgesProps {
  stainType?: string
  riskLevel?: string
  difficulty?: number
  tags?: string[]
}

export default function CardBadges({ stainType, riskLevel, difficulty, tags }: CardBadgesProps) {
  const { t } = useLanguage()

  // Badge config
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

  // 1. Stain Family Badge
  if (stainType) {
    const normalized = stainType.toLowerCase().replace(/[\s_]/g, '-')
    const colors = stainFamilyColors[normalized] || defaultColors
    badges.push(
      <span key="family" style={pillStyle(colors)}>
        {normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/-/g, ' ')}
      </span>
    )
  }

  // 2. Risk Level Badge (only medium, high, critical)
  if (riskLevel && ['medium', 'high', 'critical'].includes(riskLevel.toLowerCase())) {
    const isHighOrCritical = ['high', 'critical'].includes(riskLevel.toLowerCase())
    const riskColors = isHighOrCritical
      ? { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', border: 'rgba(239,68,68,0.3)' }
      : { bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.3)' }
    const riskKey = isHighOrCritical ? 'badgeHighRisk' : 'badgeMediumRisk'
    badges.push(
      <span key="risk" style={pillStyle(riskColors)}>
        {t(riskKey)}
      </span>
    )
  }

  // 3. Difficulty Badge (only >= 5)
  if (difficulty !== undefined && difficulty >= 5) {
    const isAdvanced = difficulty >= 7
    const diffColors = isAdvanced
      ? { bg: 'rgba(234,88,12,0.1)', color: '#c2410c', border: 'rgba(234,88,12,0.3)' }
      : { bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.3)' }
    const diffKey = isAdvanced ? 'badgeAdvanced' : 'badgeModerate'
    badges.push(
      <span key="diff" style={pillStyle(diffColors)}>
        {t(diffKey)}
      </span>
    )
  }

  // 4. Eisen Method Badge — always shown
  const eisenColors = { bg: 'rgba(180,150,50,0.08)', color: '#a87d20', border: 'rgba(180,150,50,0.25)' }
  badges.push(
    <span key="eisen" style={pillStyle(eisenColors)}>
      {t('eisenMethod')}
    </span>
  )

  // 5. Key Tag Badges — max 2, only allowed tags
  if (tags && tags.length > 0) {
    const allowedTags = tags.filter(tag => tag in tagKeyMap).slice(0, 2)
    const tagColors = { bg: 'rgba(107,114,128,0.08)', color: '#6b7280', border: 'rgba(107,114,128,0.2)' }
    allowedTags.forEach((tag, i) => {
      badges.push(
        <span key={`tag-${i}`} style={pillStyle(tagColors)}>
          {t(tagKeyMap[tag])}
        </span>
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
