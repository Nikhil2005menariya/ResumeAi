type NewtonLoaderProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function NewtonLoader({ size = 'md', className }: NewtonLoaderProps) {
  const sizeClass =
    size === 'sm'
      ? 'newtons-cradle--sm'
      : size === 'lg'
        ? 'newtons-cradle--lg'
        : 'newtons-cradle--md'

  return (
    <div className={`newtons-cradle ${sizeClass} ${className ?? ''}`}>
      <div className="newtons-cradle__dot" />
      <div className="newtons-cradle__dot" />
      <div className="newtons-cradle__dot" />
      <div className="newtons-cradle__dot" />
    </div>
  )
}
