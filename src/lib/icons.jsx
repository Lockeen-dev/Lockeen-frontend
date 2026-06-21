/* ===================== ICONS (inline SVG, stroke=currentColor) ===================== */
export const Icon = ({ d, fill, size = 20, sw = 1.8, children, viewBox = "0 0 24 24", style, color }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill || "none"} stroke="currentColor" style={style} color={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || (d ? <path d={d} /> : null)}
  </svg>
);
export const ZapSolid    = (p) => <Icon {...p} fill="currentColor" sw={0}><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></Icon>;
export const BookOpen    = (p) => <Icon {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>;
export const MsgCircle   = (p) => <Icon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></Icon>;
export const BarChart3   = (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/></Icon>;
export const Sparkles    = (p) => <Icon {...p}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></Icon>;
export const Check       = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
export const CheckCircle = (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>;
export const Zap         = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
export const ArrowRight  = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>;
export const Search      = (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>;
export const Plus        = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
export const Paperclip   = (p) => <Icon {...p}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Icon>;
export const Send        = (p) => <Icon {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Icon>;
export const Eye         = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>;
export const EyeOff      = (p) => <Icon {...p}><path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-6.5 0-10-7-10-7a17.4 17.4 0 0 1 4.06-4.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a17.34 17.34 0 0 1-2.16 3.08"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/></Icon>;
export const Bell        = (p) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>;
export const LogOut      = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Icon>;
export const FileText    = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>;
export const Layers      = (p) => <Icon {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>;
export const Lightning   = (p) => <Icon {...p}><polygon points="13 2 3 14 11 14 10 22 21 9 13 9 13 2"/></Icon>;
export const Trend       = (p) => <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>;
export const Clock       = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>;
export const Flame       = (p) => <Icon {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></Icon>;
export const Trophy      = (p) => <Icon {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></Icon>;
export const Pencil      = (p) => <Icon {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></Icon>;
export const Trash2      = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></Icon>;
export const Pin         = (p) => <Icon {...p}><path d="M12 17v5"/><path d="M5 17h14"/><path d="M8 17l1-8-3-3V4h12v2l-3 3 1 8"/></Icon>;
export const Google      = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16.1 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2C40.9 36.6 44 30.9 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);
export const LockeenLogo = ({ size = 20, muted = false }) => (
  <img
    src={muted ? "Lockeen-icon-muted.png" : "Lockeen-icon.png"}
    alt=""
    aria-hidden="true"
    onError={(e) => {
      if (e.currentTarget.dataset.fallback) return;
      e.currentTarget.dataset.fallback = '1';
      e.currentTarget.src = 'logo-icon.png';
    }}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block', borderRadius: muted ? 0 : 4 }}
  />
);
export const XMark       = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
export const Sun         = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></Icon>;
export const Moon        = (p) => <Icon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></Icon>;
export const Brain       = (p) => <Icon {...p}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></Icon>;
export const CalendarIcon = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>;
export const ChevronLeft  = (p) => <Icon {...p}><polyline points="15 18 9 12 15 6"/></Icon>;
export const ChevronRight = (p) => <Icon {...p}><polyline points="9 18 15 12 9 6"/></Icon>;
export const SidebarPanel = (p) => <Icon {...p} viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="3"/><path d="M9 8v8"/></Icon>;
export const Trash        = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Icon>;
export const ChevronUp    = (p) => <Icon {...p}><polyline points="18 15 12 9 6 15"/></Icon>;
export const ChevronDown  = (p) => <Icon {...p}><polyline points="6 9 12 15 18 9"/></Icon>;
export const RefreshCw    = (p) => <Icon {...p}><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></Icon>;
export const Play     = (p) => <Icon {...p}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
export const Pause    = (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Icon>;
export const Stop     = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/></Icon>;
export const GripDots = (p) => <Icon {...p} viewBox="0 0 12 12" sw={0} fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="6" cy="3" r="1.2"/><circle cx="9" cy="3" r="1.2"/><circle cx="3" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/><circle cx="3" cy="9" r="1.2"/><circle cx="6" cy="9" r="1.2"/><circle cx="9" cy="9" r="1.2"/></Icon>;
export const Coins    = (p) => <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><line x1="16.71" y1="13.88" x2="13.83" y2="17.29"/></Icon>;
