'use client'

import { Loader2, MessageSquare, Send } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import type { AnalysisSession } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'What are my strongest skills?',
  "What's the biggest gap?",
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
    <div data-testid="chat-tab" className="flex flex-col gap-3">
      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isLoading}
            onClick={() => void sendMessage(prompt)}
            className="rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] px-3 py-1.5 text-xs text-text-muted transition-all duration-200 hover:border-[hsl(var(--text-subtle))] hover:text-text-primary disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex max-h-[400px] min-h-[200px] flex-col gap-3 overflow-auto rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] p-4"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' ? (
              <div className="flex max-w-[85%] gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--violet-dim))]">
                  <MessageSquare className="h-3 w-3 text-[hsl(var(--violet))]" />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-[hsl(var(--card))] px-4 py-2.5 text-sm leading-relaxed text-text-primary">
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[hsl(var(--violet))] px-4 py-2.5 text-sm leading-relaxed text-white">
                {message.content}
              </div>
            )}
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="flex gap-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--violet-dim))]">
                <MessageSquare className="h-3 w-3 text-[hsl(var(--violet))]" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-[hsl(var(--card))] px-4 py-2.5 text-sm text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Input */}
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
          className="flex-1 rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] px-4 py-2.5 text-sm text-text-primary outline-none transition-all duration-200 focus:border-[hsl(var(--violet))] focus:shadow-[0_0_0_3px_hsl(var(--violet)/0.1)] disabled:opacity-50"
          placeholder="Ask about your analysis..."
          aria-label="Chat message"
          maxLength={500}
        />
        <button
          data-testid="chat-send"
          type="button"
          disabled={isLoading || !input.trim()}
          onClick={() => void sendMessage(input)}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--violet))] text-white transition-all duration-200 hover:shadow-[0_0_16px_hsl(var(--violet)/0.3)] disabled:opacity-50 disabled:shadow-none active:scale-[0.95]"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
