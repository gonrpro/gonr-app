'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LessonCard from '@/components/courses/LessonCard'
import QuizPlayer from '@/components/courses/QuizPlayer'
import { earnBadge } from '@/lib/courses/badges'
import { MODULE_2_META, MODULE_2_LESSONS, MODULE_2_QUIZ } from '@/lib/courses/module2'

type Phase = 'overview' | 'lesson' | 'quiz' | 'complete'

export default function Module2Page() {
  const { lang } = useLanguage()
  const [phase, setPhase] = useState<Phase>('overview')
  const [currentLesson, setCurrentLesson] = useState(0)
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set())
  const [quizScore, setQuizScore] = useState(0)
  const [quizPassed, setQuizPassed] = useState(false)

  const meta = MODULE_2_META
  const lessons = MODULE_2_LESSONS
  const allLessonsComplete = completedLessons.size === lessons.length

  function handleStartLesson(idx: number) {
    setCurrentLesson(idx)
    setPhase('lesson')
  }

  function handleCompleteLesson() {
    setCompletedLessons(prev => new Set(prev).add(currentLesson))
    if (currentLesson + 1 < lessons.length) {
      setCurrentLesson(currentLesson + 1)
    } else {
      setPhase('overview')
    }
  }

  function handleQuizComplete(score: number, passed: boolean) {
    setQuizScore(score)
    setQuizPassed(passed)
    if (passed) earnBadge('stain-family-expert')
    setPhase('complete')
  }

  if (phase === 'overview') {
    return (
      <div className="space-y-5 pb-8">
        <Link href="/spotter" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          {lang === 'es' ? 'Volver a Spotter' : 'Back to Spotter'}
        </Link>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.icon}</span>
            <div>
              <p className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: '#22c55e' }}>
                {lang === 'es' ? 'Módulo' : 'Module'} {meta.number}
              </p>
              <h1 className="text-xl font-bold tracking-tight">{lang === 'es' ? meta.titleEs : meta.title}</h1>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lang === 'es' ? meta.descriptionEs : meta.description}</p>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>📖 {meta.lessonCount} {lang === 'es' ? 'lecciones' : 'lessons'}</span>
            <span>⏱ ~{meta.estimatedMinutes} min</span>
            <span>✅ {Math.round(meta.passThreshold * 100)}% {lang === 'es' ? 'para aprobar' : 'to pass'}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
            <span>{lang === 'es' ? 'Progreso' : 'Progress'}</span>
            <span>{completedLessons.size} / {lessons.length}</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(completedLessons.size / lessons.length) * 100}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
          </div>
        </div>

        <div className="space-y-2">
          {lessons.map((lesson, idx) => {
            const done = completedLessons.has(idx)
            return (
              <button key={lesson.id} onClick={() => handleStartLesson(idx)} className="card w-full text-left transition-all hover:border-green-500/30" style={done ? { borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.03)' } : undefined}>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: done ? '#22c55e' : 'var(--surface-2)', color: done ? '#fff' : 'var(--text-secondary)', border: `1px solid ${done ? 'transparent' : 'var(--border)'}` }}>
                    {done ? '✓' : lesson.icon}
                  </span>
                  <div>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{lang === 'es' ? 'Lección' : 'Lesson'} {idx + 1}</p>
                    <p className="text-sm font-semibold">{lang === 'es' ? lesson.titleEs : lesson.title}</p>
                  </div>
                  <svg className="ml-auto flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </button>
            )
          })}
        </div>

        <button onClick={() => setPhase('quiz')} disabled={!allLessonsComplete} className="w-full py-3 rounded-xl text-sm font-bold transition-all" style={{ background: allLessonsComplete ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'var(--surface-2)', color: allLessonsComplete ? '#fff' : 'var(--text-secondary)', border: allLessonsComplete ? 'none' : '1px solid var(--border)', cursor: allLessonsComplete ? 'pointer' : 'default', opacity: allLessonsComplete ? 1 : 0.5 }}>
          {allLessonsComplete ? (lang === 'es' ? '🧪 Tomar el Quiz del Módulo' : '🧪 Take Module Quiz') : (lang === 'es' ? '🔒 Completa todas las lecciones para desbloquear el quiz' : '🔒 Complete all lessons to unlock quiz')}
        </button>
      </div>
    )
  }

  if (phase === 'lesson') {
    return (
      <div className="space-y-5 pb-8">
        <button onClick={() => setPhase('overview')} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          {lang === 'es' ? 'Volver al Módulo' : 'Back to Module'}
        </button>
        <LessonCard lesson={lessons[currentLesson]} lessonIndex={currentLesson} totalLessons={lessons.length} />
        <button onClick={handleCompleteLesson} className="w-full py-3 rounded-xl text-sm font-bold transition-all" style={{ background: '#22c55e', color: '#fff' }}>
          {currentLesson + 1 < lessons.length ? (lang === 'es' ? 'Siguiente Lección →' : 'Next Lesson →') : (lang === 'es' ? '✓ Completar Lecciones' : '✓ Complete Lessons')}
        </button>
      </div>
    )
  }

  if (phase === 'quiz') {
    return (
      <div className="space-y-5 pb-8">
        <button onClick={() => setPhase('overview')} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          {lang === 'es' ? 'Volver al Módulo' : 'Back to Module'}
        </button>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">{lang === 'es' ? '🧪 Quiz: Familias de Manchas' : '🧪 Quiz: Stain Families'}</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? `${MODULE_2_QUIZ.length} preguntas • Necesitas ${meta.passThreshold * 100}% para aprobar` : `${MODULE_2_QUIZ.length} questions • Need ${meta.passThreshold * 100}% to pass`}
          </p>
        </div>
        <QuizPlayer questions={MODULE_2_QUIZ} passThreshold={meta.passThreshold} onComplete={handleQuizComplete} />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8 text-center">
      <div className="text-5xl mt-8">{quizPassed ? '🏅' : '📖'}</div>
      <h1 className="text-2xl font-bold">{quizPassed ? (lang === 'es' ? '¡Módulo 2 Completado!' : 'Module 2 Complete!') : (lang === 'es' ? 'Sigue Practicando' : 'Keep Practicing')}</h1>
      {quizPassed && (
        <div className="rounded-2xl px-6 py-4 mx-auto max-w-xs" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))', border: '2px solid rgba(34,197,94,0.4)' }}>
          <p className="text-lg font-bold" style={{ color: '#22c55e' }}>🧪 {lang === 'es' ? 'Experto en Familias de Manchas' : 'Stain Family Expert'}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{lang === 'es' ? 'Insignia desbloqueada' : 'Badge unlocked'}</p>
        </div>
      )}
      <div className="flex gap-3 justify-center mt-4">
        <button onClick={() => { setPhase('overview'); setCompletedLessons(new Set()) }} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          {lang === 'es' ? 'Revisar Lecciones' : 'Review Lessons'}
        </button>
        <Link href="/spotter" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#22c55e', color: '#fff' }}>
          {lang === 'es' ? 'Volver a Spotter' : 'Back to Spotter'}
        </Link>
      </div>
    </div>
  )
}
