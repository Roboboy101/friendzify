import React, { useEffect, useMemo, useState } from 'react'

const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const Avatar = ({ src, name, size = 96, className = '', version }) => {
  const [objectUrl, setObjectUrl] = useState('')
  const [failed, setFailed] = useState(false)

  // Cache buster to avoid stale cached images when uploading new ones
  const cacheKey = useMemo(() => {
    if (!src) return ''
    const ver = version ?? '1'
    const sep = src.includes('?') ? '&' : '?'
    return `${src}${sep}v=${encodeURIComponent(ver)}`
  }, [src, version])

  useEffect(() => {
    let revokedUrl = ''
    setObjectUrl('')
    setFailed(false)

    if (!cacheKey) return

    // Fetch as blob and create object URL to avoid odd rendering issues
    ;(async () => {
      try {
        const resp = await fetch(cacheKey, { cache: 'no-store' })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        setObjectUrl(url)
        revokedUrl = url
      } catch (e) {
        setFailed(true)
      }
    })()

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl)
    }
  }, [cacheKey])

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '9999px',
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
    // Prefer object URL when available
    backgroundImage: objectUrl ? `url(${objectUrl})` : (src ? `url(${cacheKey})` : 'none'),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }

  return (
    <div className={`mx-auto ${className}`} style={containerStyle}>
      {/* Hidden img as an additional fallback path */}
      {src && !objectUrl && !failed && <img src={cacheKey} alt={name} style={{ display: 'none' }} />}

      {/* Fallback initials when no src or fetch failed */}
      {(!src || failed) && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-primary-600 font-bold" style={{ fontSize: Math.max(14, size * 0.35) }}>
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  )
}

export default Avatar


