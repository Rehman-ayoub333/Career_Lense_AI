import { Send } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { useChat } from '@/hooks/useChat'

const QUICK_PROMPTS = [
  'What are my strongest skills?',
  "What's the biggest gap for this role?",
  'How should I position myself?',
  'What should I learn first?',
]

interface ChatTabProps {
  hasAnalysis: boolean
}

export function ChatTab({ hasAnalysis }: ChatTabProps) {
  const { status } = useChat()
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Run an analysis first to chat about your CV.' },
  ])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (!hasAnalysis) {
    return <div data-testid="chat-tab">Run an analysis first to chat about your CV.</div>
  }

  function handleSend() {
    if (!input.trim()) return
    setMessages((current) => [...current, { role: 'user', content: input.trim() }, { role: 'assistant', content: 'I can answer once the analysis context is available in the chat flow.' }])
    setInput('')
  }

  return (
    <div data-testid="chat-tab" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" className="rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-2 text-xs text-text-muted">
            {prompt}
          </button>
        ))}
      </div>

      <div ref={listRef} className="max-h-72 space-y-2 overflow-auto rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-violet text-white' : 'bg-card-hover text-text-primary'}`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          data-testid="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSend()
            }
          }}
          className="flex-1 rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3 py-2 text-sm text-text-primary outline-none focus:border-violet"
          placeholder="Ask a follow-up about your CV"
        />
        <button data-testid="chat-send" type="button" onClick={handleSend} className="rounded-full bg-violet px-3 py-2 text-white">
          <Send className="h-4 w-4" />
        </button>
      </div>

      <div className="text-xs text-text-muted">Chat status: {status}</div>
    </div>
  )
}
