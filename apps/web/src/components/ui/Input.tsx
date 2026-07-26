import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

const baseClasses =
  'w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-navy-50 placeholder-navy-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={clsx(baseClasses, className)} {...props} />
  }
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={clsx(baseClasses, className)} {...props} />
  }
)

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-navy-300">{children}</label>
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(baseClasses, className)} {...props} />
}
