'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Numbered list
    const numbered = line.match(/^(\d+)\.\s+(.+)/)
    if (numbered) {
      elements.push(
        <div key={key++} className="flex gap-2 mt-2">
          <span className="font-bold shrink-0" style={{ color: 'var(--accent)' }}>{numbered[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMd(numbered[2]) }} />
        </div>
      )
      continue
    }

    // Bullet list
    const bullet = line.match(/^[-•]\s+(.+)/)
    if (bullet) {
      elements.push(
        <div key={key++} className="flex gap-2 mt-1 ml-2">
          <span className="shrink-0 mt-1" style={{ color: 'var(--accent)', fontSize: '8px' }}>●</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMd(bullet[1]) }} />
        </div>
      )
      continue
    }

    // Empty line = spacer
    if (line.trim() === '') {
      elements.push(<div key={key++} className="mt-2" />)
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="mt-1 first:mt-0" dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />
    )
  }

  return elements
}

function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function StainBrainChat() {
  const { t, lang } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stain-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, lang }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Stain Brain unavailable')
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Stain Brain</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Expert textile chemistry chat · Dan Eisen methodology</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: '420px' }}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Ask me anything about stain chemistry</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Fiber safety · Agent selection · Problem cases</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                'Blood on silk — what agents are safe?',
                'Rust stain on white linen',
                'Hair dye on polyester blend',
                'Old grease stain, already pressed',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                    background: 'var(--surface)',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-2xl px-3 py-2 max-w-[85%] text-sm leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap' : ''}`}
              style={msg.role === 'user' ? {
                background: 'var(--accent)',
                color: '#fff',
                borderBottomRightRadius: '4px',
              } : {
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderBottomLeftRadius: '4px',
              }}
            >
              {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderBottomLeftRadius: '4px' }}>
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-center" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about a stain, fiber, or technique..."
            rows={2}
            className="flex-1 rounded-xl px-3 py-2 text-sm resize-none outline-none border transition-colors"
            style={{
              background: 'var(--surface)',
              color: 'var(--text)',
              borderColor: 'var(--border)',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            →
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-secondary)' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
