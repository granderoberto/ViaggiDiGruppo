interface BannerProps {
  type: 'error' | 'success'
  message: string
}

export function Banner({ type, message }: BannerProps) {
  return (
    <div className={`banner banner-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  )
}
