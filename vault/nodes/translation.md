---
id: translation
title: Machine-translation fallback
prefix: TRN
kind: integration
status: live
reviewed: 2026-10-21
code:
  - server/src/modules/translate/**
  - client/src/lib/translate.ts
  - client/src/context/TranslationContext.tsx
relations:
  - feeds i18n — fills in the missing language for single-language admin content
---
A public, best-effort translation endpoint. When admin content (a product
name, category or description) exists in only one language, the client asks
for a machine translation so the other language still reads naturally. The
results are cached for the life of the process, and the provider URL can be
overridden with `TRANSLATE_URL`.

## Rules
- **R-TRN-001** [must] Translation never throws and never blocks rendering. When it fails, the original text is shown.
- **R-TRN-002** [should] An admin-entered English or Bangla value always wins over a machine translation.

## Decisions
- **D-TRN-001** [confirmed 2026-09-15] Use a pluggable endpoint template (`{sl}/{tl}/{q}`) with an in-process cache.
  Why: no paid API is needed to start, and the provider can be swapped (for example to self-hosted LibreTranslate) without code changes.

## Ideas
- **I-TRN-001** [new · impact:low · effort:S] In admin product forms, show the machine translation as a suggested English name the admin can accept with one click, so the stored English twin improves over time.
