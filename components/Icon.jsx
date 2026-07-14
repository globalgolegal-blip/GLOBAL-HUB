'use client'
// components/Icon.jsx — Set de íconos SVG de GoTrack (sin dependencias).
// Uso:  <Icon name="check" size={16} />
//       <Icon name="robot" size={18} style={{ color: '#185FA5' }} />
// El color se hereda del texto (currentColor); ajusta con style={{ color: ... }}.

const P = {
  'arrow-right':  <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left':   <path d="M19 12H5M11 6l-6 6 6 6" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-up':   <path d="M6 15l6-6 6 6" />,
  'lock':         <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  'scale':        <><path d="M12 3v18M7 21h10M5 7h14M12 3l-7 4M12 3l7 4" /><path d="M5 7l-2.5 5a2.5 2.5 0 0 0 5 0z" /><path d="M19 7l-2.5 5a2.5 2.5 0 0 0 5 0z" /></>,
  'robot':        <><rect x="5" y="8" width="14" height="11" rx="2" /><path d="M12 8V5" /><circle cx="12" cy="4" r="1" fill="currentColor" stroke="none" /><circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" /><path d="M9.5 16.5h5" /></>,
  'forms':        <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
  'motorbike':    <><circle cx="6" cy="16" r="3" /><circle cx="18" cy="16" r="3" /><path d="M6 16l3-5h6l1.5 3M9 11l-1-2H6M15 11h3" /></>,
  'refresh':      <><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" /><path d="M4 20v-4h4" /></>,
  'check':        <path d="M5 12l4.5 4.5L19 7" />,
  'eye':          <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="2.5" /></>,
  'clock':        <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  'send':         <path d="M21 3L3 10.5l7 3 3 7L21 3z" />,
  'paperclip':    <path d="M16 8l-6.4 6.4a2 2 0 0 0 2.8 2.8L19 10.6a4 4 0 0 0-5.6-5.6L6.2 12.2a6 6 0 0 0 8.5 8.5L20 15.4" />,
  'info':         <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  'user-circle':  <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18.5a6 6 0 0 1 11 0" /></>,
  'headset':      <><path d="M4 13a8 8 0 0 1 16 0" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M20 19a3 3 0 0 1-3 3h-3" /></>,
  'search':       <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  'upload':       <><path d="M12 16V4M8 8l4-4 4 4" /><path d="M5 20h14" /></>,
  'x':            <path d="M6 6l12 12M18 6L6 18" />,
  'dots-vertical':<><circle cx="12" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="18" r="1.1" fill="currentColor" stroke="none" /></>,
  'dots':         <><circle cx="6" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.1" fill="currentColor" stroke="none" /></>,
  'alert-triangle':<><path d="M12 4L2.5 20h19L12 4z" /><path d="M12 10v4M12 17h.01" /></>,
}

export default function Icon({ name, size = 16, stroke = 1.75, style, ...rest }) {
  const paths = P[name]
  if (!paths) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true" {...rest}
    >
      {paths}
    </svg>
  )
}
