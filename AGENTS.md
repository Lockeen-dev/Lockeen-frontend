# AGENTS.md

## 1. Scope del progetto

Questo workspace operativo è:

`/Users/federicodeluca/Documents/lockeen front`

Non usare cartelle simili o legacy:

`/Users/federicodeluca/Documents/lock`

Questa repo è frontend-first con:
- React + Vite
- API serverless in `api/`
- Supabase client/auth/db
- script custom in `scripts/`
- documentazione e runbook in `docs/`

## 2. Stack tecnico

- React 18
- Vite 5
- JavaScript (non TypeScript)
- Supabase client
- API serverless in `api/`
- Tailwind/PostCSS
- Script custom in `scripts/`

## 3. Regole generali per gli agent

- Non lavorare mai direttamente su `main`.
- Un task = un branch dedicato.
- Un agente lavora su una area definita; evitare sovrapposizioni non coordinate.
- Non modificare file fuori scope del task.
- Non implementare feature non richieste dal ticket.
- Non fare refactor non richiesti.
- Non cancellare file senza autorizzazione esplicita.
- Non installare librerie senza motivazione e approvazione preventiva.
- Prima di modificare codice, spiegare sempre:
  - piano d’azione,
  - file coinvolti,
  - rischi.

## 4. File e cartelle sensibili

Considerati sensibili:

- `.env*`
- `vercel.json`
- `package*.json`
- `vite.config.js`
- `.github/workflows/**`
- `src/main.jsx`
- `src/App.jsx`
- `src/LockeenRuntime.jsx`
- `src/marketingBoot.js`
- `src/context/AuthContext.jsx`
- `src/lib/**`
- `src/services/auth.js`
- `src/services/storage.js`
- `api/**`
- `supabase/**`
- `scripts/**`

Questi file/aree vanno toccati solo se il task lo richiede esplicitamente.

## 5. Workflow git

- Branch con prefisso `codex/<task-name>`.
- Nessun commit su `main`.
- Commit piccoli e focalizzati.
- PR monotematiche e di dimensione contenuta.
- Nessun merge senza review.
- All’inizio:
  - `git status --short --branch`
- Alla fine:
  - riportare `git status`
  - riportare summary diff (`git diff --stat` o equivalente)

## 6. Worktree e agent paralleli

Obiettivo: lavoro multi-agent sicuro.

- Ogni agente usa una worktree separata.
- Ogni worktree lavora su un branch dedicato.
- Nessun agente modifica gli stessi file senza coordinamento.
- Se un file è condiviso/critico, segnalarlo prima di editarlo.
- Evitare overlap su aree ad alto rischio:
  - Calendar/Planner
  - Auth
  - Supabase
  - API
  - config/deploy
  - script di sicurezza

Esempio:
```bash
git worktree add ../lockeen-ui -b codex/ui-task main
git worktree add ../lockeen-api -b codex/api-task main
git worktree add ../lockeen-db -b codex/db-task main
```

## 7. Ownership degli agent

Frontend/UI agent:

- `src/components/**`
- `src/styles/**`
- `src/index.css`

Calendar/Planner agent:

- `src/components/AIStudyPlanner.jsx`
- `src/components/CalendarView.jsx`
- `src/components/Dashboard*.jsx`
- `src/components/calendarData.js`
- `src/services/studyPlans*`
- `src/services/calendar*`

Backend/API agent:

- `api/**`
- `docs/api/**`

Database/Supabase agent:

- `supabase/migrations/**`
- `supabase/README.md`

Auth/Security agent:

- `src/context/AuthContext.jsx`
- `src/lib/**`
- `src/services/auth.js`
- `src/services/storage.js`
- `scripts/check-*.mjs`

QA/Testing agent:

- `scripts/**`
- `docs/qa/**`
- check manuali
- `build` e `ci`

Reviewer agent:

- non implementa
- verifica diff, regressioni, sicurezza, edge case, file fuori scope
- valida rischi residui

## 8. Comandi disponibili

Usare solo comandi presenti:

- `npm install` oppure `npm ci`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run setup:check`
- `npm run security:frontend-env`
- `npm run security:real-mode`
- `npm run security:rls`
- `npm run planner:check`
- `npm run ci`

Nota:
al momento non risultano script standard per:

- `npm run lint`
- `npm run test`
- `npm run typecheck`

Non inventare questi comandi.

## 9. Regole security

- Non modificare `.env*`.
- Non esporre chiavi API.
- Non inserire secret nel codice.
- Non disattivare RLS.
- Non modificare policy/RLS Supabase senza task esplicito e revisione.
- Non introdurre dati finti in produzione.
- Non bypassare controlli di sicurezza.

## 10. Workflow Codex + Claude Code

1. Codex implementa su branch/worktree separata.
2. Claude Code fa review del diff.
3. Claude verifica:
   - bug reali
   - regressioni
   - sicurezza
   - edge case non coperti
   - file modificati fuori scope
   - check mancanti
4. Codex corregge secondo feedback.
5. Claude fa final review.
6. Merge solo dopo controlli + approvazione umana.

## 11. Formato finale obbligatorio (per ogni task)

Ogni agente deve includere nel report finale:

- Branch usato
- Worktree usata
- File modificati
- Cosa è stato cambiato
- Comandi eseguiti
- Risultati dei comandi
- Rischi residui
- File da revisionare da parte di Claude Code
- Problemi non risolti

## 12. Regola finale

Se non sei sicuro, non modificare.
Prima esplicitare dubbio, poi proporre opzioni e attendere consenso.
