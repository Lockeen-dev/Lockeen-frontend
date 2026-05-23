# AI Baseline

Goal: add an AI server-side gate without exposing provider keys or creating unlimited cost.

## Endpoint

- `POST /api/ai-study-assist`
- server file: `api/ai-study-assist.js`
- frontend service: `src/services/ai.js`

## Server-only environment

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AI_DAILY_QUOTA`

Never use `VITE_` prefix for provider secrets.

## Client contract

Components must call:

- `askTutor({ prompt, context })`
- `generateStudyPlan({ prompt, context })`

Components must not call OpenAI directly.

## Guardrails

- POST only
- requires `x-lockeen-user-id` or bearer token
- max prompt length: 4000 characters
- default daily quota: 20 requests per user key
- fallback response when provider key is missing or provider fails
- no file parsing in Day 6
- no streaming in Day 6

## Provider

The endpoint uses OpenAI Responses API when `OPENAI_API_KEY` exists. `gpt-4.1-mini` is the default model because it supports the Responses API and is cost-conscious for short study-assistant responses.

## Definition of Done

- no provider key in frontend bundle
- mock mode works without provider config
- real mode calls same-origin API endpoint
- quota/rate-limit error is explicit
- provider failure returns safe fallback
