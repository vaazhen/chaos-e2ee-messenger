const S = { stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };

export function MicIcon() {
  return (
    <svg className="btn-icon mic-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3.5" width="6" height="11" rx="3" {...S} />
      <path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0" {...S} />
      <path d="M12 17.7V21" {...S} />
      <path d="M8.7 21h6.6" {...S} />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg className="btn-icon send-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12h14" {...S} />
      <path d="M13 6.5 18.5 12 13 17.5" {...S} />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg className="btn-icon pause-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7v10" {...S} />
      <path d="M15 7v10" {...S} />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg className="btn-icon play-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6.5v11l8-5.5-8-5.5Z" {...S} />
    </svg>
  );
}

export function TimerIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M10 2h4" />
    </svg>
  );
}

export function EmojiIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M8.5 14.5c.8 1.2 2 2 3.5 2s2.7-.8 3.5-2" {...S} />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AttachIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" {...S} />
    </svg>
  );
}

export function PhotoIcon() {
  return (
    <svg className="attach-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" {...S} />
      <circle cx="9" cy="9" r="2" {...S} />
      <path d="M21 15l-5-5L5 21" {...S} />
    </svg>
  );
}

export function DocIcon() {
  return (
    <svg className="attach-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...S} />
      <polyline points="14 2 14 8 20 8" {...S} />
      <line x1="16" y1="13" x2="8" y2="13" {...S} />
      <line x1="16" y1="17" x2="8" y2="17" {...S} />
      <polyline points="10 9 9 9 8 9" {...S} />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.35-4.35" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function BellOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-4.69" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function DoubleCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M18 6L7 17l-5-5" />
      <path d="M22 10l-7.5 7.5" />
    </svg>
  );
}

export function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function ForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M5 12h14" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function MuteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export function UnmuteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function ComposeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function DeviceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" /><path d="M12 17v4" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><path d="M12 15V3" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2" /><path d="M12 21v2" />
      <path d="M4.22 4.22l1.42 1.42" /><path d="M18.36 18.36l1.42 1.42" />
      <path d="M1 12h2" /><path d="M21 12h2" />
      <path d="M4.22 19.78l1.42-1.42" /><path d="M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><path d="M21 12H9" />
    </svg>
  );
}
