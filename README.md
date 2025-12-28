# Leszek Newsroom AI

Uniwersalny agregator treści z dowolnych źródeł internetowych z AI-generowanymi streszczeniami i funkcją Text-to-Speech.

## Status Projektu

**Faza:** Design & Planning
**Wersja:** 2.0 (redesign)

## Funkcje (MVP)

- **Agregacja treści** - scraping artykułów ze stron internetowych (Crawl4AI)
- **AI Streszczenia** - 2-zdaniowe intro + pełne streszczenie (Claude API)
- **Text-to-Speech** - odsłuchiwanie streszczeń (Edge TTS, polski głos)
- **Wyszukiwanie** - PostgreSQL Full-Text Search (język polski)
- **Zapisywanie** - artykuły do przeczytania później
- **Integracje** - Gmail (newslettery), LinkedIn (posty ekspertów)
- **Responsywność** - Mobile-first + Desktop layouts
- **Dark/Light mode** - przełączanie motywu

## Stack Technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Next.js 14+, Tailwind CSS, Zustand |
| Backend | Next.js API Routes, Prisma |
| Database | PostgreSQL 15+ (FTS polski) |
| Scraping | Crawl4AI (Python, Docker) |
| AI | Claude 3.5 Sonnet (Anthropic) |
| TTS | Edge TTS (Microsoft) |
| Infrastructure | Oracle Cloud Free Tier, Docker, Nginx |

## Dokumentacja

| Dokument | Opis |
|----------|------|
| [Requirements](docs/requirements.md) | Wymagania funkcjonalne i niefunkcjonalne |
| [User Stories](docs/user-stories.md) | Szczegółowe user stories dla MVP |
| [HLD](docs/hld.md) | High-Level Design - architektura systemu |

## UI Designs

Projekt zawiera 24 pliki designów w folderze `superdesign/`:

| Kategoria | Ilość | Opis |
|-----------|-------|------|
| UI Light (Mobile) | 10 | Jasny motyw, mobile-first |
| UI Dark (Mobile) | 3 | Ciemny motyw |
| UI Desktop | 3 | Layouty desktopowe |
| Wireframes | 8 | Szkice strukturalne |

**Galeria:** Otwórz `superdesign/gallery.html` w przeglądarce aby zobaczyć wszystkie designy.

## Struktura Projektu

```
leszek-newsroom-ai/
├── docs/
│   ├── requirements.md    # Wymagania
│   ├── user-stories.md    # User stories
│   └── hld.md             # High-Level Design
├── superdesign/
│   ├── gallery.html       # Galeria designów
│   └── design_iterations/ # Pliki HTML z designami
├── public/                # Statyczne zasoby
├── src/                   # Kod źródłowy (TODO)
└── README.md
```

## Roadmap

- [x] Wymagania i User Stories
- [x] Wireframes
- [x] UI Designs (Mobile + Desktop)
- [x] High-Level Design (HLD)
- [ ] Low-Level Design (LLD)
- [ ] Setup projektu (Next.js, PostgreSQL)
- [ ] Implementacja MVP
- [ ] Deployment (Oracle Cloud)

## Uruchomienie (Development)

```bash
# Instalacja zależności
npm install

# Uruchomienie serwera dev
npm run dev

# Otwórz http://localhost:3000
```

## Autor

Leszek Giza

## Licencja

Private - All rights reserved
