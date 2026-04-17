import { cn } from '@/lib/utils'

interface BrandProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

interface BrandWordmarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: {
    wrap: 'gap-2',
    mark: 'h-9 w-9 rounded-xl',
    icon: 'h-4 w-4',
    text: 'text-xl',
  },
  md: {
    wrap: 'gap-3',
    mark: 'h-11 w-11 rounded-2xl',
    icon: 'h-5 w-5',
    text: 'text-2xl',
  },
  lg: {
    wrap: 'gap-3',
    mark: 'h-14 w-14 rounded-2xl',
    icon: 'h-6 w-6',
    text: 'text-3xl',
  },
}

export function Brand({ size = 'md', showText = true, className }: BrandProps) {
  const styles = sizeMap[size]

  return (
    <div className={cn('flex items-center', styles.wrap, className)}>
      <div
        className={cn(
          'flex items-center justify-center border border-blue-200 bg-gradient-to-br from-[#4F7DFF] to-[#6A6FD1] shadow-[0_14px_28px_-18px_rgba(59,130,246,0.7)]',
          styles.mark
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn('text-white', styles.icon)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.5 4.5h7l3 3v12h-10z" />
          <path d="M14.5 4.5v3h3" />
          <path d="M9.5 11.5h6" />
          <path d="M9.5 14.5h5" />
          <path d="m9.4 17.1 1.2 1.2 2-2" />
        </svg>
      </div>
      {showText ? (
        <h1 className={cn('leading-none font-extrabold tracking-tight', styles.text)}>
          <span className="text-slate-900">Resum</span>
          <span className="text-[#4F7DFF]">.Ai</span>
        </h1>
      ) : null}
    </div>
  )
}

const wordmarkSizeMap = {
  sm: {
    text: 'text-[1.6rem]',
    line: 'w-[72px]',
  },
  md: {
    text: 'text-[1.8rem]',
    line: 'w-[84px]',
  },
  lg: {
    text: 'text-[2rem]',
    line: 'w-[96px]',
  },
}

export function BrandWordmark({ size = 'sm', className }: BrandWordmarkProps) {
  const styles = wordmarkSizeMap[size]

  return (
    <div className={cn('inline-flex flex-col', className)}>
      <h1 className={cn('font-semibold leading-tight tracking-[-0.03em] text-[#111827]', styles.text)}>Resum.Ai</h1>
      <div className={cn('mt-2 h-[2px] rounded-full bg-gradient-to-r from-[#0a72ef] via-[#8b5cf6] to-[#de1d8d]', styles.line)} />
    </div>
  )
}
