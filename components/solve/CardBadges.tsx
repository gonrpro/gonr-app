'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import Badge from '@/components/ui/Badge'
import BadgeLink from '@/components/ui/BadgeLink'
import QuickReferenceModal, { type QuickReferenceContent } from '@/components/ui/QuickReferenceModal'
import { stainFamily, familyReferenceUrl } from '@/lib/ui/chemistryFamily'
import { getQuickReference } from '@/lib/ui/quickReferenceContent'

interface CardBadgesProps {
  stainType?: string
  riskLevel?: string
  difficulty?: number
  tags?: string[]
  source?: string
}

// TASK-badges-v2 (2026-04-24):
// - Stain-family badge is now a <BadgeLink> that opens the shared
//   QuickReferenceModal. Tap the Tannin/Protein/Oil/... badge on the
//   ResultCard → modal shows explainer + caution + examples + deep link
//   into the chemicals reference page pre-filtered by family.
// - Chemistry-family colors come from the locked v2 palette via
//   `stainFamily(stainType)` — same color for the same family across
//   ResultCard and the chemicals page (Atlas 8053 + Nova 8049).
// - risk / difficulty / safety tags remain on the shared Badge (v1 tones).
// - `eisen-method` source badge is still inline (v1 scope) — the
//   verified/provenance tones are separate and haven't landed yet.

export default function CardBadges({ stainType, riskLevel, difficulty, tags, source }: CardBadgesProps) {
  const { t } = useLanguage()
  const [modalContent, setModalContent] = useState<QuickReferenceContent | null>(null)

  const tagKeyMap: Record<string, string> = {
    'cold-water': 'badgeColdWater',
    'no-enzyme': 'badgeNoEnzyme',
    'no-bleach': 'badgeNoBleach',
    'no-heat': 'badgeNoHeat',
    'silk-safe': 'badgeSilkSafe',
    'dry-clean-only': 'badgeDryCleanOnly',
    'test-first': 'badgeTestFirst',
  }

  const openFamilyReference = (stainTypeRaw: string) => {
    const family = stainFamily(stainTypeRaw)
    if (family.familyKey === 'unknown') return
    const content = getQuickReference(family.familyKey)
    if (!content) return
    setModalContent({
      title: family.label,
      tone: family.tone,
      icon: '🧪',
      explainer: content.explainer,
      caution: content.caution,
      examples: content.examples,
      referenceHref: familyReferenceUrl(family.familyKey),
      referenceLabel: 'See full chemistry reference',
    })
  }

  const badges: React.ReactNode[] = []

  // 1. Stain Family Badge — clickable into the shared quick-reference modal.
  if (stainType) {
    const family = stainFamily(stainType)
    if (family.familyKey === 'unknown') {
      // Unknown families stay non-clickable per Atlas 8053 (no content yet).
      badges.push(
        <Badge key="family" tone={family.tone} size="sm">
          {family.label}
        </Badge>
      )
    } else {
      badges.push(
        <BadgeLink
          key="family"
          tone={family.tone}
          size="sm"
          ariaLabel={`Open ${family.label} quick reference`}
          onOpen={() => openFamilyReference(stainType)}
        >
          {family.label}
        </BadgeLink>
      )
    }
  }

  // 2. Risk Level Badge — v1 safety tones, kept unchanged.
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

  // 3. Difficulty Badge (only >= 5) — both tiers map to caution; text carries
  //    the Advanced vs Moderate distinction.
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
      <span
        key="eisen"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '1px 6px',
          borderRadius: '9999px',
          fontSize: '10px',
          fontWeight: 500,
          lineHeight: '16px',
          backgroundColor: eisenColors.bg,
          color: eisenColors.color,
          border: `1px solid ${eisenColors.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {t('eisenMethod')}
      </span>
    )
  }

  // 5. Key Tag Badges — max 2, only allowed tags. Neutral tone.
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
    <>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '4px 0',
      }}>
        {badges}
      </div>
      <QuickReferenceModal
        open={modalContent !== null}
        content={modalContent}
        onClose={() => setModalContent(null)}
      />
    </>
  )
}
