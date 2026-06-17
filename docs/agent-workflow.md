# docs/agent-workflow.md

## 1. Obiettivo del workflow

L’obiettivo è far lavorare più agent in modo ordinato, come un piccolo team operativo:

- **Codex** per implementazione
- **Claude Code** per review tecnica e controllo qualità
- **Founder** per coordinamento e approvazione finale
- **branch/worktree separati** per isolamento reale
- `main` mantenuta pulita e verde

Questo documento ti dà la routine pratica per lavorare in parallelo senza collisioni.

## 2. Regola fondamentale

**Mai far lavorare più agent sulla stessa working directory.**

Usare sempre branch separati e, quando possibile, worktree separate. Questo riduce conflitti, aiuta la revisione e mantiene il codice recuperabile.

## 3. Setup base

Prima di iniziare:

```bash
git checkout main
git pull --ff-only origin main
git worktree list
```

Poi verificare lo stato:

```bash
git status --short --branch
```

## 4. Creare worktree parallele

Esempi consigliati:

```bash
git worktree add ../lockeen-ui -b codex/ui-task main
git worktree add ../lockeen-api -b codex/api-task main
git worktree add ../lockeen-db -b codex/db-task main
git worktree add ../lockeen-qa -b codex/qa-task main
```

## 5. Aprire più finestre

Avvia una finestra per ogni worktree:

```bash
cursor ../lockeen-ui
cursor ../lockeen-api
cursor ../lockeen-db
cursor ../lockeen-qa
```

## 6. Ruoli degli agent

- **Builder agent**
  - implementa task assegnati
  - propone piano, poi applica codice minimo richiesto
- **Frontend/UI agent**
  - `src/components/**`
  - `src/styles/**`
  - `src/index.css`
- **Backend/API agent**
  - `api/**`
  - `docs/api/**`
- **Database/Supabase agent**
  - `supabase/migrations/**`
  - `supabase/README.md`
- **QA agent**
  - `scripts/**`
  - `docs/qa/**`
- **Claude reviewer agent**
  - non implementa
  - verifica diff, regressioni, sicurezza, edge case

## 7. Workflow operativo standard

1. Crea task ben definito e proprietario.
2. Assegna ownership e branch/worktree.
3. Esegue Codex sull’area.
4. Codex comunica piano + file coinvolti + rischi.
5. Tu approvi il piano.
6. Codex implementa.
7. Codex esegue check richiesti.
8. Claude Code revisa diff.
9. Correzioni e finalizzazione.
10. PR e merge solo dopo CI verde.

## 8. Workflow Codex → Claude Code → Codex

Per revisione:

```bash
git diff origin/main...HEAD
```

Prompt consigliato:

> Fai una review severa di questo diff:
> - bug reali
> - regressioni
> - security
> - edge case
> - file fuori scope o ownership
> - test/check mancanti

## 9. Prompt standard per Codex

### Builder

> Implementa solo il task richiesto. Mantieni il minimo cambio necessario, senza refactor non richiesti.
> Rispetta `AGENTS.md` e la divisione per ownership. Prima di modificare, indica file e rischi.

### Frontend/UI

> Lavora solo su `src/components/**`, `src/styles/**`, `src/index.css` per il task.
> Non toccare backend, API, supabase, config o package.

### Backend/API

> Implementa endpoint/handler nel ramo `api/**` seguendo i contratti in `docs/api/*`.
> Non modificare codice frontend.

### Database/Supabase

> Applica solo migration e modifiche schema necessarie.
> Mantieni RLS/permessi sotto controllo e segnala l’impatto.

### QA

> Aggiorna o crea check/checklist in `scripts/**` o `docs/qa/**`.
> Esegui `npm run ci` e riporta gap di copertura.

## 10. Prompt standard per Claude Code

- Cerca bug e regressioni.
- Verifica sicurezza e file sensibili.
- Valuta edge case e rischi residui.
- Controlla che sia rispettato `AGENTS.md`.

Template:

> Review severa del diff seguendo `AGENTS.md`:
> 1) problemi blocking/high
> 2) rischi residui
> 3) test consigliati
> 4) decisione pre-merge

## 11. Comandi utili

```bash
git status --short --branch
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
git branch -vv
git worktree list
git worktree remove

npm audit --audit-level=high
npm run build
npm run ci
```

## 12. Checklist prima PR

- Branch corretto e dedicato
- Diff piccolo e monotematico
- File coerenti con ownership
- AGENTS.md seguito
- Build e CI passati
- Nessun `.env` o secret toccato
- File fuori scope non presenti

## 13. Checklist prima merge

- CI verde
- Vercel preview verde (se applicabile)
- Nessun conflitto
- Smoke test runtime se cambia esperienza
- Merge con approvazione umana

## 14. Pulizia worktree

```bash
git worktree list
git worktree remove ../lockeen-ui
git branch -d codex/ui-task
```

Dopo il merge: rimuovere worktree inutilizzate e chiudere finestre associate.

## 15. Errori da evitare

- più agent sulla stessa directory senza coordinamento
- modifiche dirette su `main`
- PR enormi e multi-dominio
- mettere fix security dentro PR funzionali
- aggiornare dipendenze dentro PR feature senza separazione
- toccare auth/supabase/config senza review
