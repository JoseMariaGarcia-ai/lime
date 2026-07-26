import { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-lime-500 text-navy-950 hover:bg-lime-400 focus-visible:ring-lime-400',
  secondary: 'bg-navy-700 text-navy-50 hover:bg-navy-600 focus-visible:ring-navy-400',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400',
  ghost: 'bg-transparent text-navy-200 hover:bg-navy-800 focus-visible:ring-navy-500',
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  )
}
