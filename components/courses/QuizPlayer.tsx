'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { QuizQuestion } from '@/lib/courses/module1'

interface QuizPlayerProps {
  questions: QuizQuestion[]
  passThreshold: number
  onComplete: (score: number, passed: boolean) => void
}

export default function QuizPlayer({ questions, passThreshold, onComplete }: QuizPlayerProps) {
  const { lang } = useLanguage()
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const q = questions[current]
  const questionText = lang === 'es' ? q.questionEs : q.question
  const explanation = lang === 'es' ? q.explanationEs : q.explanation
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const pct = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
  const passed = pct >= passThreshold * 100

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
  }

  function handleCheck() {
    if (selected === null) return
    setRevealed(true)
    if (selected === q.correctIndex) {
      setScore(s => s + q.points)
    }
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      const finalScore = selected === q.correctIndex ? score + q.points : score
      // Re-check since score state may not have updated yet for the last question
      const finalPct = totalPoints > 0 ? Math.round((finalScore / totalPoints) * 100) : 0
      setFinished(true)
      onComplete(finalScore, finalPct >= passThreshold * 100)
      return
    }
    setCurrent(c => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  if (finished) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">{passed ? '🎉' : '📚'}</div>
        <h2 className="text-xl font-bold">
          {passed
            ? (lang === 'es' ? '¡Módulo Completado!' : 'Module Complete!')
            : (lang === 'es' ? 'Sigue Practicando' : 'Keep Practicing')}
        </h2>
        <div
          className="inline-block rounded-2xl px-6 py-4"
          style={{
            background: passed ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
            border: `2px solid ${passed ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}
        >
          <p className="text-3xl font-bold" style={{ color: passed ? '#22c55e' : '#f59e0b' }}>
            {pct}%
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {score} / {totalPoints} {lang === 'es' ? 'puntos' : 'points'}
          </p>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {passed
            ? (lang === 'es'
                ? `Necesitabas ${passThreshold * 100}% para aprobar. ¡Lo lograste!`
                : `You needed ${passThreshold * 100}% to pass. You got it!`)
            : (lang === 'es'
                ? `Necesitas ${passThreshold * 100}% para aprobar. Revisa las lecciones e inténtalo de nuevo.`
                : `You need ${passThreshold * 100}% to pass. Review the lessons and try again.`)}
        </p>
        {passed && (
          <div
            className="rounded-xl px-4 py-3 mt-2"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
              border: '1.5px solid rgba(34,197,94,0.4)',
            }}
          >
            <p className="text-sm font-bold" style={{ color: '#22c55e' }}>
              🏅 {lang === 'es' ? 'Insignia Desbloqueada: Mentalidad del Spotter' : 'Badge Unlocked: Spotter Mindset'}
            </p>
          </div>
        )}
      </div>
    )
  }

  const typeIcon = q.type === 'scenario' ? '📋' : q.type === 'true-false' ? '✅' : '🤔'
  const typeLabel = q.type === 'scenario'
    ? (lang === 'es' ? 'Escenario' : 'Scenario')
    : q.type === 'true-false'
    ? (lang === 'es' ? 'Verdadero o Falso' : 'True or False')
    : (lang === 'es' ? 'Opción Múltiple' : 'Multiple Choice')

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
          <span>{lang === 'es' ? 'Pregunta' : 'Question'} {current + 1} / {questions.length}</span>
          <span>{q.points} {lang === 'es' ? 'pts' : 'pts'}</span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((current + 1) / questions.length) * 100}%`,
              background: '#22c55e',
            }}
          />
        </div>
      </div>

      {/* Question type badge */}
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        {typeIcon} {typeLabel}
      </span>

      {/* Question */}
      <p className="text-base font-semibold leading-snug">{questionText}</p>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          const optText = lang === 'es' ? opt.textEs : opt.text
          const isSelected = selected === idx
          const isCorrect = idx === q.correctIndex

          let borderColor = 'var(--border)'
          let bg = 'transparent'
          let textColor = 'var(--text)'

          if (revealed && isCorrect) {
            borderColor = 'rgba(34,197,94,0.5)'
            bg = 'rgba(34,197,94,0.08)'
          } else if (revealed && isSelected && !isCorrect) {
            borderColor = 'rgba(239,68,68,0.5)'
            bg = 'rgba(239,68,68,0.06)'
            textColor = '#ef4444'
          } else if (isSelected) {
            borderColor = 'rgba(34,197,94,0.4)'
            bg = 'rgba(34,197,94,0.04)'
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={revealed}
              className="w-full text-left rounded-xl px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: bg,
                border: `1.5px solid ${borderColor}`,
                color: textColor,
                cursor: revealed ? 'default' : 'pointer',
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: isSelected ? (revealed ? (isCorrect ? '#22c55e' : '#ef4444') : '#22c55e') : 'var(--surface-2)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${isSelected ? 'transparent' : 'var(--border)'}`,
                  }}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                {optText}
              </span>
              {revealed && isCorrect && (
                <span className="ml-2 text-xs" style={{ color: '#22c55e' }}>✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Explanation (after reveal) */}
      {revealed && (
        <div
          className="rounded-xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: selected === q.correctIndex ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
            border: `1px solid ${selected === q.correctIndex ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
            color: 'var(--text-secondary)',
          }}
        >
          <p className="font-semibold mb-1" style={{ color: selected === q.correctIndex ? '#22c55e' : '#f59e0b' }}>
            {selected === q.correctIndex
              ? (lang === 'es' ? '✓ ¡Correcto!' : '✓ Correct!')
              : (lang === 'es' ? '✗ No exactamente' : '✗ Not quite')}
          </p>
          {explanation}
        </div>
      )}

      {/* Action button */}
      {!revealed ? (
        <button
          onClick={handleCheck}
          disabled={selected === null}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
          style={{ background: '#22c55e', color: '#fff' }}
        >
          {lang === 'es' ? 'Verificar Respuesta' : 'Check Answer'}
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          {current + 1 >= questions.length
            ? (lang === 'es' ? 'Ver Resultados' : 'See Results')
            : (lang === 'es' ? 'Siguiente Pregunta →' : 'Next Question →')}
        </button>
      )}
    </div>
  )
}
