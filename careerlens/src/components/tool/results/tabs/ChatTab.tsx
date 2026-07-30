'use client'

import { Loader2, Send } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import type { AnalysisSession } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'What are my strongest skills?',
  "What's the biggest gap for this role?",
  'How should I position myself?',
  'What should I learn first?',
]

interface ChatTabProps {
  session: AnalysisSession
}

export function ChatTab({ session }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Ask me anything about your CV analysis. I have full context of your CV, the job description, and your match results.' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMessage = text.trim()
    setInput('')
    setMessages((current) => [...current, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          cvText: session.cvText,
          jdText: session.jdText,
          score: session.result.score,
          missingSkills: session.result.skills_missing,
          verdict: session.result.verdict,
        }),
      })

      const payload = (await response.json()) as {
        success?: boolean
        reply?: string
        message?: string
      }

      if (!response.ok || !payload.success || !payload.reply) {
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: payload.message ?? 'Something went wrong. Please try again.' },
        ])
        return
      }

      setMessages((current) => [...current, { role: 'assistant', content: payload.reply as string }])
    } catch {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: 'Check your internet connection and try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div data-testid="chat-tab" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isLoading}
            onClick={() => void sendMessage(prompt)}
            className="rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-2 text-xs text-text-muted transition hover:text-text-primary disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div ref={listRef} className="max-h-72 space-y-2 overflow-auto rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-[hsl(var(--violet))] text-white' : 'bg-[hsl(var(--card-hover))] text-text-primary'}`}>
              {message.content}
            </div>
          </div>
        ))}
        {isLoading ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-[hsl(var(--card-hover))] px-3 py-2 text-sm text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <input
          data-testid="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void sendMessage(input)
            }
          }}
          disabled={isLoading}
          className="flex-1 rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-2 text-sm text-text-primary outline-none transition focus:border-[hsl(var(--violet))] disabled:opacity-50"
          placeholder="Ask a follow-up about your CV"
          aria-label="Chat message"
          maxLength={500}
        />
        <button
          data-testid="chat-send"
          type="button"
          disabled={isLoading || !input.trim()}
          onClick={() => void sendMessage(input)}
          aria-label="Send message"
          className="rounded-full bg-[hsl(var(--violet))] px-3 py-2 text-white transition disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
