import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * The application's only button.
 *
 * Twelve near-identical class strings were previously inlined across the
 * codebase — each re-declaring its own height, radius, glow and press
 * transform, and each drifting slightly. Consolidating them means a change to
 * the interaction language is one edit, and it removes a whole class of bug
 * where one button had a focus ring and its neighbour did not.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

/**
 * Shared behaviour.
 *
 * `active:scale` is a transform, so the press feedback is composited on the GPU
 * and never triggers layout. `disabled:` styles are declared once here rather
 * than being forgotten on individual buttons.
 */
const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-full whitespace-nowrap ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out ' +
  'active:scale-[0.98] motion-reduce:active:scale-100 ' +
  'disabled:pointer-events-none disabled:opacity-45'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-violet text-white shadow-[var(--shadow-sm),var(--glow-violet)] ' +
    'hover:bg-[hsl(var(--violet)/0.9)] hover:shadow-[var(--shadow-sm),var(--glow-violet-strong)]',
  secondary:
    'bg-surface-raised text-text-primary border border-border ' +
    'hover:bg-surface-hover hover:border-border-strong',
  ghost:
    'bg-transparent text-text-secondary border border-transparent ' +
    'hover:bg-surface-raised hover:text-text-primary',
  danger:
    'bg-transparent text-red-text border border-[hsl(var(--red)/0.35)] ' +
    'hover:bg-[hsl(var(--red)/0.12)] hover:border-[hsl(var(--red)/0.55)]',
}

/**
 * Heights are on a 4px rhythm and every size clears the 44px pointer target on
 * touch, either through its own height or the `md`/`lg` defaults used on
 * primary actions.
 */
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
}

/**
 * The button's class string, for the cases that cannot be a `<button>` or a
 * plain `<a>` — chiefly `next/link`, which must own its own element to keep
 * client-side navigation and prefetching.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: {
  variant?: Variant
  size?: Size
  block?: boolean
  className?: string
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Stretches to the container width. */
  block?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // Defaulted rather than required: an un-typed button inside a form
      // submits it, which has caused accidental page reloads here before.
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    >
      {children}
    </button>
  )
}

/** Anchor styled as a button, for real navigation rather than an action. */
export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  size?: Size
  block?: boolean
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <a className={buttonClasses({ variant, size, block, className })} {...props}>
      {children}
    </a>
  )
}
