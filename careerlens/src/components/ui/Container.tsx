import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Page width and gutter.
 *
 * `mx-auto max-w-6xl px-4 sm:px-6` was repeated verbatim in seven places, so the
 * page gutter was seven independent decisions that happened to agree. Changing
 * the measure now means changing it here.
 */

type Width = 'content' | 'prose' | 'panel'

const WIDTHS: Record<Width, string> = {
  /** Default application measure. */
  content: 'max-w-6xl',
  /** Comfortable reading measure for long-form copy. */
  prose: 'max-w-3xl',
  /** Narrow column for centred single-card pages. */
  panel: 'max-w-md',
}

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: Width
  as?: 'div' | 'section' | 'main' | 'article' | 'footer'
  children: ReactNode
}

export function Container({
  width = 'content',
  as: Component = 'div',
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Component className={cn('mx-auto w-full px-4 sm:px-6', WIDTHS[width], className)} {...props}>
      {children}
    </Component>
  )
}
