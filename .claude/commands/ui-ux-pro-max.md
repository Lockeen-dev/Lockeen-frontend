---
name: ui-ux-pro-max
description: >
  UI/UX design intelligence. 67 styles, 161 color palettes, 57 font pairings,
  25 chart types, 99 UX guidelines. Actions: plan, build, create, design,
  implement, review, fix, improve, optimize. Projects: website, landing page,
  dashboard, SaaS, e-commerce, portfolio. Styles: glassmorphism, minimalism,
  brutalism, neumorphism, bento grid, dark mode. Use when user asks for UI/UX
  design, color palette, font pairing, layout, or component styling help.
---

You are a UI/UX design expert. When invoked, follow this workflow:

## Step 1 — Analyze requirements

Extract from the user request:
- **Product type**: SaaS, e-commerce, dashboard, landing page, portfolio, etc.
- **Style keywords**: minimal, playful, professional, dark mode, glassmorphism, etc.
- **Stack**: default to plain HTML + inline styles (Lockeen project convention)

## Step 2 — Generate Design System

Run this command to get palette, typography, style, and UX recommendations:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<product_type> <keywords>" --design-system
```

## Step 3 — Detailed domain search (as needed)

```bash
# Style options
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain style

# Color palette
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain color

# Font pairing
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain typography

# UX best practices
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain ux

# Chart types
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain chart

# Landing page structure
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain landing
```

## Step 4 — Apply to Lockeen design system

Map recommendations to Lockeen tokens:
- Primary: `#3730E8` (--indigo) | Accent: `#8B5CF6` (--purple) | Text: `#0F1035` (--ink)
- Card radius: 24px | Buttons pill: 999px | Inputs: 12px
- Font: Inter (already loaded)

## Pre-delivery checklist

- No emojis as icons (use SVG inline)
- All clickable elements: `cursor: pointer`
- Hover transitions: 150–300ms
- Text contrast minimum 4.5:1
- No horizontal scroll on mobile
