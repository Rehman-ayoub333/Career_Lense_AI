import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <article className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-text-primary">Privacy Policy</h1>
        <p className="mt-2 text-xs text-text-subtle">Last updated: July 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="mb-2 text-base font-semibold text-text-primary">What we collect</h2>
            <p>
              CareerLens AI does not require an account and does not collect personal information.
              When you run an analysis, your CV text and job description are sent to our server solely
              to generate the analysis. They are processed in memory and never written to a database
              or file system.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-text-primary">Local storage</h2>
            <p>
              Your analysis history is stored in your browser&apos;s localStorage so you can revisit
              previous results. This data never leaves your device. You can clear it at any time
              using the &quot;Clear all&quot; button in the History panel.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-text-primary">AI processing</h2>
            <p>
              CV and job description text is sent to Anthropic&apos;s Claude API (or Google&apos;s
              Gemini API as a fallback) for analysis. These providers process the text according to
              their own privacy policies. We do not send any identifying information — only the
              document text you provide.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-text-primary">Cookies and tracking</h2>
            <p>
              CareerLens AI does not use cookies, analytics trackers, or any third-party tracking
              scripts. We do not track your usage, behaviour, or device information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-text-primary">Rate limiting</h2>
            <p>
              To prevent abuse, we apply rate limiting based on your IP address. IP addresses are
              stored only in server memory for the duration of the rate-limit window (60 seconds)
              and are never persisted.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-text-primary">File uploads</h2>
            <p>
              When you upload a PDF or text file, the file is processed in memory to extract text.
              The file is never stored on disk. Only the extracted text is used for analysis and is
              discarded after the response is sent.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-text-primary">Contact</h2>
            <p>
              If you have questions about this policy, you can reach the project maintainer via the
              GitHub repository linked in the footer.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
