import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Surface container.
 *
 * The same border/background/radius/shadow quartet appeared in fourteen
 * components with three different radius values and two different shadows,
 * which is why panels that sat next to each other did not look related.
 */

type Elevation = 'flat' | 'raised' | 'overlay'

const ELEVATIONS: Record<Elevation, string> = {
  /** Sits on the page. Grouping only. */
  flat: 'bg-surface border border-border',
  /** Lifted off the page. The default for content panels. */
  raised: 'bg-surface border border-border shadow-[var(--shadow-md)]',
  /** Floats above everything. Dialogs and popovers. */
  overlay: 'bg-surface-raised border border-border-strong shadow-[var(--shadow-lg)]',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation
  /** Adds a hover treatment. Only for cards that are themselves interactive. */
  interactive?: boolean
  as?: 'div' | 'article' | 'aside' | 'section'
  children?: ReactNode
}

export function Card({
  elevation = 'raised',
  interactive = false,
  as: Component = 'div',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        'rounded-[var(--radius-lg)]',
        ELEVATIONS[elevation],
        interactive &&
          'transition-[border-color,box-shadow,background-color] duration-200 ease-out ' +
            'hover:border-border-strong hover:shadow-[var(--shadow-lg)]',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

/** Consistent header row for a card: title on the left, actions on the right. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary">{title}</div>
        {description ? <p className="mt-1 text-xs text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/**
 * Section label used above grouped content.
 * Uppercase with wide tracking, which needs a slightly larger size to stay
 * readable — hence `text-xs` rather than the 11px this replaced.
 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-xs font-semibold uppercase tracking-[0.12em] text-text-muted', className)}>
      {children}
    </div>
  )
}

/** Hairline separator. Uses a border colour so it tracks the theme. */
export function Divider({ className }: { className?: string }) {
  return <div role="presentation" className={cn('h-px w-full bg-border', className)} />
}
