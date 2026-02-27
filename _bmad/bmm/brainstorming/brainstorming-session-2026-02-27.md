---
stepsCompleted: [1]
inputDocuments: []
session_topic: 'Redesign UX desktopowego layoutu Newsroom AI - uproszczenie flow dodawania źródeł, czytania i słuchania'
session_goals: 'Nowy layout inspirowany Genspark AI Workspace - centralny input box + sidebar ze źródłami + feed/wydania poniżej'
selected_approach: ''
techniques_used: []
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Leszek
**Date:** 2026-02-27

## Session Overview

**Topic:** Redesign UX desktopowego layoutu Newsroom AI
**Goals:** Uproszczenie flow: dodawanie źródeł, czytanie, słuchanie — szczególnie mobilnie

### Inspiracja

Genspark AI Workspace 2.0 - centralny chat-like input box, lewy sidebar z narzędziami, clean layout z dużą ilością białej przestrzeni.

### Kontekst obecnego layoutu

**Desktop (lg+):**
- Lewy sidebar (264px) z nawigacją (Feed, Editions, Saved, Trash, Sources, Integrations)
- Górny header ze searchem i "Add Source"
- Główna treść z EditionTabs, SourceFilter, ArticleList

**Mobile:**
- Top navbar z logo + user menu
- Bottom navigation (Home, Saved, Editions, Settings)
- Mobile search bar
- User jest zadowolony z mobile UX

### Wizja użytkownika

1. Centralny boks chat-like na URL do obserwowania (dodawanie źródeł)
2. Źródła generowane po lewej stronie
3. Pod boksem: feed + wydania
4. Kliknięcie wydania → szczegóły na tym samym ekranie
5. Zakładki: Feed / Wydania
6. Dużo wolnego miejsca do wykorzystania na desktopie

### Kluczowe ustalenia z dyskusji

**Centralny boks = Universal Command Interface:**
- Wklej URL → dodaj źródło (F4.2)
- Szukaj artykułów (F3.4 FTS)
- Q&A per artykuł (F9.1-F9.6) — TODO
- Voice input STT → TTS odpowiedź (F10.1-F10.4) — TODO
- "Dodaj newslettery z Gmaila" → wizard (F6.1)
- "Obserwuj X na LinkedIn" (F6.2 + LNKD.6-8)
- "Przeczytaj wydanie" → TTS playlist (F8.6)
- "Porównaj artykuły o X" → Multi-Article Q&A (F12.1-F12.3) — Premium
- "Znajdź źródła o X" → Topic discovery (v3.0 Future)
- Zarządzanie źródłami: "Jakie mam?" / "Usuń X"
- Briefing tematyczny (BRIEF.1-5) — Premium

**Sidebar:** Zachowujemy obecną nawigację. LinkedIn/Gmail ikony wymagają naprawy (nic nie robią).

**Design:** Minimalizm jak Genspark — jasne prowadzenie użytkownika od pierwszego ekranu.

**Kluczowy problem:** Otwierając aplikację, użytkownik nie wie co robić. Potrzeba conversational onboarding — czat jako brama do całej aplikacji.

**Mobile:** Obecny mobile UX jest OK — nie zmieniamy.

---

## Makiety HTML

Przygotowane 3 warianty do porównania:

### Wariant A: Conversational Hub
**Plik:** `superdesign/design_iterations/ux_redesign_variant_a_conversational_hub.html`
- Pełny sidebar 260px z nawigacją + integracje + źródła
- Duży centralny command box z hero greeting ("Dzień dobry, Leszek")
- Przyciski: Dodaj URL / Szukaj / Zapytaj AI / Mikrofon
- Quick hints: "Przeczytaj wydanie", "Co nowego o AI?", URL, "Dodaj Gmail"
- Pod spodem: zakładki Wydanie dnia / Feed / Briefing
- Edition date strip + article cards

### Wariant B: Minimal Genspark-Style
**Plik:** `superdesign/design_iterations/ux_redesign_variant_b_minimal_genspark.html`
- Wąski icon sidebar (64px) — jak Genspark
- Centralny command box z integrations bar (Gmail/LinkedIn/Twitter ikony)
- Quick action buttons: Odsłuchaj wydanie / Co nowego? / Dodaj źródło / Zapytaj
- Zakładki: Wydanie dnia / Cały feed
- TTS player bar na dole ekranu (fixed, widoczny podczas odtwarzania)

### Wariant C: Onboarding-First
**Plik:** `superdesign/design_iterations/ux_redesign_variant_c_onboarding_first.html`
- Wąski icon sidebar (64px) — nieaktywne ikony w empty state
- Chat-like interface z AI asystentem (konwersacyjny onboarding)
- AI wyjaśnia 3 kroki: dodaj URL → przeglądaj wydanie → odsłuchaj
- Sugerowane źródła jako chipy
- Progress indicator (1-2-3)
- Poniżej: podgląd "filled state" — jak wygląda po dodaniu źródeł
