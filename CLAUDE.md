# Lockeen — Frontend Project

## Progetto

Lockeen è una web app AI-powered per lo studio. Permette agli studenti di:
- Caricare note e generare quiz/flashcard automaticamente con AI
- Interagire con un AI Tutor via chat
- Monitorare i progressi con analytics dettagliati

**Stack:** HTML + React (via CDN), inline styles in oggetti JS, icone SVG inline custom, Font Inter (Google Fonts). Nessun Tailwind nei componenti.

## Regola fondamentale

**SOLO FRONTEND.** Nessuna API reale, nessun database, nessuna autenticazione vera. Tutto rimane mock. Backend = fase successiva.

## Design System

```css
--indigo:     #3730E8   /* primary brand, CTA, active state */
--indigo-2:   #5B53F0   /* hover/secondary indigo */
--purple:     #8B5CF6   /* accenti, gradient end */
--ink:        #0F1035   /* testo principale */
--gray:       #6B7280   /* testo secondario */
--border:     #E5E7EB   /* tutti i bordi */
--sidebar-bg: #F8F9FF   /* background sidebar */
```

**Border-radius:** card 24px | secondari 18-20px | pill buttons 999px | inputs 12px
**Letter-spacing titoli:** `-0.02em`

## Architettura

```
App
├── AuthScreen          ← signin / signup + Google OAuth
└── Dashboard
    ├── Header          ← logo + bell + avatar + signout
    ├── Sidebar         ← nav tabs + weekly goal card
    └── Main (tab router)
        ├── DashboardHome
        ├── NotesView
        ├── TutorView
        └── AnalyticsView
```

## File principali

- `index.html` — landing page marketing
- `lockeen-app.jsx` — app React completa (auth + dashboard)
- `about.html`, `blog.html`, `careers.html`, `earn.html`, `press.html`, `privacy.html`, `terms.html` — pagine statiche

## Naming convention

- Style objects: `nomeComponenteS` (es. `authS`, `shellS`, `sideS`)
- Icone: PascalCase (es. `ZapSolid`, `BookOpen`)
- Tab IDs: `'dashboard' | 'notes' | 'tutor' | 'analytics'`

## Dati mock seed

- Study time: 10h 45m | Streak: 42 days | Quiz score: 88% | Rank: #12
- Weekly minutes: Mon:45 Tue:80 Wed:60 Thu:110 Fri:90 Sat:140 Sun:75
- Subject mastery: Biology:84% Chemistry:67% Math:92% History:41% Literature:58%

## Prossimi sviluppi

1. Upload file note → drag & drop + progress bar
2. Flashcard viewer → modal con flip animation
3. Quiz interattivo → step-by-step con progress pill
4. Dark mode → ridefinire CSS variables :root
5. Mobile responsive → sidebar collassabile < 768px
