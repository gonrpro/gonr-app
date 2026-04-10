'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Lesson } from '@/lib/courses/module1'

function VisualBadge({ type }: { type: string }) {
  const badges: Record<string, { icon: string; label: string; labelEs: string; bg: string; color: string; border: string }> = {
    'decision-loop': {
      icon: '🔄',
      label: 'Decision Framework',
      labelEs: 'Marco de Decisión',
      bg: 'rgba(34,197,94,0.08)',
      color: '#22c55e',
      border: 'rgba(34,197,94,0.3)',
    },
    'tip': {
      icon: '💡',
      label: 'Pro Tip',
      labelEs: 'Consejo Pro',
      bg: 'rgba(56,189,248,0.08)',
      color: '#38bdf8',
      border: 'rgba(56,189,248,0.3)',
    },
    'warning': {
      icon: '⚠️',
      label: 'Critical',
      labelEs: 'Crítico',
      bg: 'rgba(245,158,11,0.08)',
      color: '#f59e0b',
      border: 'rgba(245,158,11,0.3)',
    },
    'scenario': {
      icon: '📋',
      label: 'Real Scenario',
      labelEs: 'Escenario Real',
      bg: 'rgba(147,51,234,0.08)',
      color: '#a855f7',
      border: 'rgba(147,51,234,0.3)',
    },
    'key-concept': {
      icon: '🎯',
      label: 'Key Concept',
      labelEs: 'Concepto Clave',
      bg: 'rgba(34,197,94,0.06)',
      color: '#22c55e',
      border: 'rgba(34,197,94,0.25)',
    },
  }

  const { lang } = useLanguage()
  const b = badges[type]
  if (!b) return null

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}` }}
    >
      {b.icon} {lang === 'es' ? b.labelEs : b.label}
    </span>
  )
}

interface LessonCardProps {
  lesson: Lesson
  lessonIndex: number
  totalLessons: number
}

export default function LessonCard({ lesson, lessonIndex, totalLessons }: LessonCardProps) {
  const { lang } = useLanguage()
  const title = lang === 'es' ? lesson.titleEs : lesson.title
  const objective = lang === 'es' ? lesson.objectiveEs : lesson.objective
  const takeaway = lang === 'es' ? lesson.keyTakeawayEs : lesson.keyTakeaway

  return (
    <div className="space-y-4">
      {/* Lesson header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{lesson.icon}</span>
          <div>
            <p className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'es' ? 'Lección' : 'Lesson'} {lessonIndex + 1} / {totalLessons}
            </p>
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
        </div>
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', color: 'var(--text-secondary)' }}
        >
          <span style={{ color: '#22c55e', fontWeight: 600 }}>
            {lang === 'es' ? 'Objetivo' : 'Objective'}:
          </span>{' '}
          {objective}
        </div>
      </div>

      {/* Sections */}
      {lesson.sections.map((section, i) => {
        const heading = lang === 'es' ? section.headingEs : section.heading
        const body = lang === 'es' ? section.bodyEs : section.body

        return (
          <div
            key={i}
            className="card space-y-2"
            style={section.visual === 'warning' ? {
              borderColor: 'rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.03)',
            } : section.visual === 'scenario' ? {
              borderColor: 'rgba(147,51,234,0.3)',
              background: 'rgba(147,51,234,0.03)',
            } : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">{heading}</h3>
              {section.visual && <VisualBadge type={section.visual} />}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {body}
            </p>
          </div>
        )
      })}

      {/* Key Takeaway */}
      <div
        className="rounded-xl px-4 py-3 space-y-1"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.04))',
          border: '1.5px solid rgba(34,197,94,0.3)',
        }}
      >
        <p className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: '#22c55e' }}>
          {lang === 'es' ? '💡 Punto Clave' : '💡 Key Takeaway'}
        </p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {takeaway}
        </p>
      </div>
    </div>
  )
}
