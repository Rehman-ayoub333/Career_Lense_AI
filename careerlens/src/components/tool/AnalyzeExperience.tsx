'use client'

import { AnalyzeTool } from '@/components/tool/AnalyzeTool'
import { useAnalysis } from '@/hooks/useAnalysis'

/**
 * Client boundary for the analyse route.
 *
 * This exists only so `app/analyze/page.tsx` can stay a server component and own
 * the route's metadata: `useAnalysis` is a hook, and a file that calls one
 * cannot also export `metadata`.
 *
 * It replaces `HomeExperience`, which was 76 lines because the tool shared a
 * route with the landing page. That arrangement forced the page to unmount the
 * marketing sections when results arrived, restore scroll position across the
 * swap, and publish its state to a module-level store so the navbar could tell
 * whether the anchors it linked to still existed. Separating the routes deletes
 * all three problems rather than managing them; `AnalyzeTool` already handles
 * its own input, loading and results states.
 */
export function AnalyzeExperience() {
  const analysis = useAnalysis()

  return <AnalyzeTool analysis={analysis} />
}
