type BrandMarkProps = {
  label?: string
  compact?: boolean
}

export function BrandMark({ label = '墨引', compact = false }: BrandMarkProps) {
  return <div className={compact ? 'wordmark small' : 'wordmark'}><svg className="brand-icon" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#1c1b1a"/><path d="M18 17h28v7H35v23h-7V24H18z" fill="#e96745"/><path d="M18 40h8v7h-8z" fill="#f6efe7"/></svg>{label}</div>
}
