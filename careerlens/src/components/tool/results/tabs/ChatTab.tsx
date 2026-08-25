'use client'

import { LoaderCircle, MessageSquare, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import type { ChatRequest, ChatResponse } from '@/lib/api/contract'
import { postJson, toDisplayMessage } from '@/lib/api/client'
import { INPUT_LIMITS } from '@/lib/analysis/constants'
import { cn } from '@/lib/cn'
import type { AnalysisSession, ChatMessage } from '@/types'

const QUICK_PROMPTS = [
  'What are my strongest skills?',
  "What's the biggest gap?",
  'How should I position myself?',
  'What should I learn first?',
] as const

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    'Ask me anything about your CV analysis. I have full context of your CV, the job description, and your match results.',
  status: 'ok',
}

/**
 * The requirements the model found no evidence for, as plain strings.
 *
 * `result.skills_missing` used to supply this. It no longer exists, and the
 * chat wire shape is specified as unchanged, so the same list is derived from
 * the claims that replaced it (ADR-13). `status: 'gap'` is the model's own
 * judgment, which is the right source here — this is context for a conversation
 * about what to work on, not a verification result.
 *
 * That the field stays gone is enforced by `tests/api/schema-regression.test.ts`,
 * not by this paragraph. It used to be the other way round, which is what
 * `TESTING_STRATEGY_FINAL.md` §Regression meant by "protected by a schema test
 * not just a convention".
 *
 * The richer version, where chat can also see verification tiers and explain
 * why something reads as unresolved, is a documented SHOULD-HAVE and stays
 * deferred rather than pulled forward for convenience.
 */
function gapRequirements(session: AnalysisSession): string[] {
  return session.result.claims
    .filter((claim) => claim.status === 'gap')
    .map((claim) => claim.requirement)
}

function AssistantAvatar() {
  return (
    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--violet)/0.12)]">
      <MessageSquare className="h-3.5 w-3.5 text-violet-text" strokeWidth={2.25} aria-hidden="true" />
    </div>
  )
}

export function ChatTab({ session }: { session: AnalysisSession }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const message = text.trim()
    if (!message || isLoading) return

    setInput('')
    setMessages((current) => [...current, { role: 'user', content: message, status: 'ok' }])
    setIsLoading(true)

    try {
      const { reply } = await postJson<ChatResponse>('/api/chat', {
        message,
        cvText: session.cvText,
        jdText: session.jdText,
        score: session.result.score,
        verdict: session.result.verdict,
        missingSkills: gapRequirements(session),
      } satisfies ChatRequest)

      setMessages((current) => [...current, { role: 'assistant', content: reply, status: 'ok' }])
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: toDisplayMessage(error), status: 'error' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div data-testid="chat-tab" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="secondary"
            size="sm"
            disabled={isLoading}
            onClick={() => void sendMessage(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>

      <div
        ref={listRef}
        // Polite: replies should be announced, but never interrupt the user
        // part-way through composing the next question.
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex max-h-[400px] min-h-[200px] flex-col gap-3 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-bg p-4"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {message.role === 'assistant' ? (
              <div className="flex max-w-[85%] gap-2.5">
                <AssistantAvatar />
                <div
                  className={cn(
                    'rounded-[var(--radius-lg)] rounded-tl-[var(--radius-sm)] px-4 py-2.5 text-sm',
                    message.status === 'error'
                      ? 'border border-[hsl(var(--red)/0.35)] bg-[hsl(var(--red)/0.1)] text-red-text'
                      : 'bg-surface-raised text-text-primary'
                  )}
                >
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] rounded-[var(--radius-lg)] rounded-tr-[var(--radius-sm)] bg-violet px-4 py-2.5 text-sm text-white">
                {message.content}
              </div>
            )}
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="flex gap-2.5">
              <AssistantAvatar />
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] rounded-tl-[var(--radius-sm)] bg-surface-raised px-4 py-2.5 text-sm text-text-secondary">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} aria-hidden="true" />
                Thinking…
              </div>
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
          maxLength={INPUT_LIMITS.chatMessage.max}
          placeholder="Ask about your analysis…"
          aria-label="Chat message"
          className={cn(
            'h-10 flex-1 rounded-full border border-border bg-bg px-4 text-sm text-text-primary',
            'placeholder:text-text-muted outline-none disabled:opacity-45',
            'transition-[border-color] duration-200 ease-out focus:border-violet'
          )}
        />
        <Button
          data-testid="chat-send"
          disabled={isLoading || !input.trim()}
          onClick={() => void sendMessage(input)}
          aria-label="Send message"
          className="h-10 w-10 shrink-0 px-0"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
