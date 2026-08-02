type IconProps = { className?: string }

const base = (className?: string) => className ?? 'w-3.5 h-3.5'

export const ChevronIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const PlusIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const PencilIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M11.5 2.5l2 2L5 13l-2.7.7L3 11l8.5-8.5z" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export const TrashIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export const XIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const SearchIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const FolderIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M1.5 3.5h5l1.5 2h6.5v7h-13v-9z" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export const DownloadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M8 2v8M4.5 7L8 10.5 11.5 7M3 13h10" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const UploadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <path d="M8 10.5V2.5M4.5 6L8 2.5 11.5 6M3 13h10" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const SpinnerIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={`animate-spin ${base(className)}`} aria-hidden>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const UsersIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={base(className)} aria-hidden>
    <circle cx="6" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M11 8.5c2 .3 3.5 1.7 3.5 4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M10.5 3.2a2.5 2.5 0 010 4.6" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)
