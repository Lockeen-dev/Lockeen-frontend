# LOCKEEN — Project Context for Frontend Development

> Usa questo file come prompt di sistema su qualsiasi piattaforma (Codex, v0, Cursor, ecc.)
> per continuare lo sviluppo mantenendo coerenza visiva e logica con il progetto originale.

---

## 🧠 Cos'è Lockeen

**Lockeen** è una web app AI-powered per lo studio. Permette agli studenti di:
- Caricare note e generare quiz/flashcard automaticamente con AI
- Interagire con un AI Tutor via chat
- Monitorare i progressi con analytics dettagliati

**Stack attuale:** React (single file JSX), inline styles, nessun CSS framework (Tailwind importato ma non usato nei componenti). Icone SVG inline custom. Font: Inter (Google Fonts).

---

## 🎨 Design System — Token esatti

```css
:root {
  --indigo:     #3730E8;   /* primary brand, CTA, active state */
  --indigo-2:   #5B53F0;   /* hover/secondary indigo */
  --purple:     #8B5CF6;   /* accenti, gradient end */
  --ink:        #0F1035;   /* testo principale */
  --gray:       #6B7280;   /* testo secondario / placeholder */
  --gray-2:     #9CA3AF;   /* testo terziario / divider text */
  --border:     #E5E7EB;   /* tutti i bordi */
  --sidebar-bg: #F8F9FF;   /* background sidebar */
  --lavender:   #EEF2FF;   /* card sfondi leggeri */
  --pink:       #FDF2F8;   /* accento caldo */
  --mint:       #ECFEFF;   /* accento fresco */
  --teal:       #E0F7FA;   /* bubble AI chat */
}
```

**Font:** `Inter` (weights: 400, 500, 600, 700, 800)
**Letter-spacing titoli:** `-0.02em`

---

## 📐 Regole di stile — Euristiche visive

### Bordi e arrotondamenti
| Elemento | border-radius |
|---|---|
| Card principale / outer | `24px` |
| Card secondarie | `18–20px` |
| Input, bottoni secondari | `12px` |
| Bottoni primari pill | `999px` |
| Icon box / avatar | `10–12px` |
| Progress bar | `999px` |

### Ombre
- Card principale: `0 30px 60px -30px rgba(55,48,232,.25)`
- Auth card: `0 20px 60px -20px rgba(15,16,53,.15)`
- CTA button: `0 10px 30px -8px rgba(55,48,232,.45)`
- Sidebar item attivo: `0 8px 22px -10px rgba(55,48,232,.6)`

### Gradienti ricorrenti
```
Avatar/AI icon:   linear-gradient(135deg, var(--indigo), var(--purple))
Gradient bar:     linear-gradient(90deg, var(--indigo), var(--purple))
Bar chart:        linear-gradient(180deg, var(--indigo), var(--purple))
```

### Decorazioni blob (solo auth screen)
```css
blob1: radial-gradient(closest-side, rgba(55,48,232,.18), transparent 70%) — top-left
blob2: radial-gradient(closest-side, rgba(139,92,246,.18), transparent 70%) — bottom-right
```

---

## 🏗️ Architettura componenti

```
App
├── AuthScreen          ← signin / signup + Google OAuth
│   └── Field           ← label wrapper riutilizzabile
└── Dashboard
    ├── Header          ← logo + bell + avatar + signout
    ├── Sidebar         ← nav tabs + weekly goal card
    └── Main (tab-based router)
        ├── DashboardHome   ← greeting + quick cards + AI preview
        ├── NotesView       ← grid note con search + azioni AI
        ├── TutorView       ← chat AI con typing indicator
        └── AnalyticsView   ← stats grid + bar chart + subject mastery
```

---

## 🧩 Pattern di layout

### Shell principale
```
maxWidth: 1280px, margin: auto, padding: 24px
outerCard: border 2px solid --indigo, borderRadius 24, overflow hidden
grid: 220px sidebar | 1fr main content
```

### Grid note
```
repeat(auto-fill, minmax(260px, 1fr)), gap: 18px
```

### Analytics stats
```
repeat(4, 1fr), gap: 14px
```

### Analytics row (chart + subjects)
```
1.6fr | 1fr, gap: 18px
```

---

## 🔘 Componenti UI — Specifiche

### Bottone primario (pill)
```js
padding: '11px 16px', borderRadius: 999
background: 'var(--indigo)', color: '#fff'
fontWeight: 600, fontSize: 14
```

### Bottone outline (pill)
```js
padding: '11px 16px', borderRadius: 999
background: '#fff', border: '1px solid var(--border)'
color: 'var(--ink)', fontWeight: 600
```

### Input field
```js
padding: '12px 14px', borderRadius: 12
border: '1px solid var(--border)'
fontSize: 15, color: 'var(--ink)'
```

### Sidebar nav item attivo
```js
background: 'var(--indigo)', color: '#fff', borderRadius: 999
boxShadow: '0 8px 22px -10px rgba(55,48,232,.6)'
```

### Chat bubble AI
```js
background: '#F4F6FF', borderRadius: 18, borderTopLeftRadius: 6
```

### Chat bubble User
```js
background: 'var(--indigo)', color: '#fff'
borderRadius: 18, borderTopRightRadius: 6
```

### Subject color chips (note cards)
| Materia | Background card | Dot color |
|---|---|---|
| Biology | `#EEF2FF` | `var(--indigo)` |
| Chemistry | `#FDF2F8` | `var(--purple)` |
| History | `#FEF3C7` | `#F59E0B` |
| Math | `#ECFEFF` | `#06B6D4` |
| Economics | `#DCFCE7` | `#10B981` |
| Literature | `#FEE2E2` | `#EF4444` |

---

## 📊 Dati seed (mock)

### Analytics KPI
- Study time: **10h 45m** (somma settimanale)
- Streak: **42 days**
- Avg quiz score: **88%**
- Rank: **#12**

### Weekly study minutes
Mon:45, Tue:80, Wed:60, Thu:110, Fri:90, Sat:140, Sun:75

### Subject mastery
Biology:84%, Chemistry:67%, Math:92%, History:41%, Literature:58%

### Weekly goal: **78%**

---

## 🤖 AI Tutor — Comportamento

- Typing indicator: 3 dot bounce animation (`tdot` keyframe)
- Delay risposta: `900ms + random(0-600ms)`
- Suggestion chips: 4 domande predefinite cliccabili
- Replies rotate su array di 5 risposte (su calcolo derivate come topic demo)

---

## 📝 Naming convention

- Style objects: `nomeComponenteS` (es. `authS`, `shellS`, `sideS`, `homeS`, `notesS`, `tutorS`, `analS`)
- Icone: PascalCase descrittivo (es. `ZapSolid`, `BookOpen`, `MsgCircle`)
- Tab IDs: `'dashboard' | 'notes' | 'tutor' | 'analytics'`

---

## 🚀 Prossimi sviluppi suggeriti

Queste feature sono visivamente coerenti col design system attuale:

1. **Upload file note** → drag & drop card con preview + progress bar indigo
2. **Flashcard viewer** → modal full-screen con flip animation (card-face style)
3. **Quiz interattivo** → step-by-step con progress pill e feedback animato
4. **Dark mode** → già predisposto con CSS variables, basta ridefinire :root
5. **Mobile responsive** → sidebar collassabile a bottom nav su < 768px
6. **Onboarding flow** → 3-step wizard post-signup con soggetti preferiti
7. **Leaderboard** → sezione Analytics con avatar + rank + streak dei peer

---

## ⚡ Prompt di continuazione rapida

Incolla questo all'inizio di ogni sessione su Codex o altra piattaforma:

```
Stiamo costruendo Lockeen: un sito web per lo studio AI-powered.

🚨 PRIORITÀ ASSOLUTA: SOLO FRONTEND.
Non suggerire, aggiungere o anticipare nulla di backend.
Nessuna API reale, nessun database, nessuna autenticazione vera.
Il nostro unico obiettivo ora è completare l'interfaccia visiva e l'esperienza
utente al 100%. Tutto rimane mock. Backend = fase successiva, non ora.

STACK FRONTEND:
- HTML + React (via CDN, single file o componenti separati)
- Inline styles in oggetti JS (nessun Tailwind nei componenti)
- Icone SVG inline custom
- Font: Inter (Google Fonts)

DESIGN SYSTEM:
- Primary: #3730E8 (--indigo), Accent: #8B5CF6 (--purple), Testo: #0F1035 (--ink)
- Border-radius: card 24px, secondari 18-20px, pill buttons 999px, inputs 12px
- Ombre CTA: 0 10px 30px -8px rgba(55,48,232,.45)
- Layout: sidebar 220px + main 1fr, outerCard border 2px solid indigo
- Letter-spacing titoli: -0.02em

PAGINE/SEZIONI GIÀ FATTE:
- Landing page (marketing)
- Auth (signin / signup / Google)
- Dashboard con sidebar (Dashboard Home, My Notes, AI Tutor, Analytics)

REGOLA: non introdurre logica backend, database o autenticazione reale.
Tutti i dati rimangono mock. Il backend verrà integrato in una fase successiva
partendo da questo frontend come base.
```
