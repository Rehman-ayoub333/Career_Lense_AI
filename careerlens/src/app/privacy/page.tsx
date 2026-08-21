import type { Metadata } from 'next'

import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

// `Container as="div"`: `layout.tsx` already renders the page's one `<main>`.
export default function PrivacyPage() {
  return (
    <Container as="div" width="prose" className="py-12">
      <Card as="article" className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-text-primary">Privacy Policy</h1>
        <p className="mt-2 text-xs text-text-muted">Last updated: July 2026</p>

        <div className="mt-6 space-y-6 text-sm text-text-secondary">
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
              CV and job description text is sent to Google&apos;s Gemini API for analysis. Google is
              the only third party that receives this text, and it processes the text according to
              its own privacy policy. We do not send any identifying information — only the document
              text you provide.
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
      </Card>
    </Container>
  )
}
