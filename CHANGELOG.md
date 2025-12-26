# Changelog

## [1.0.0] - 2025-12-26

### Added
- Prezentacja Reveal.js z artykulami z 14 blogow AI/ML
- Panel boczny ze streszczeniami generowanymi przez Claude API
- Text-to-Speech (Edge TTS) dla streszczen i slajdow
- Funkcja "Zapisz na pozniej" z osobna strona /saved
- Integracja z Supabase (PostgreSQL) zamiast lokalnych plikow JSON
- Vercel serverless functions dla API
- Domyslne uruchomienie od slajdu #2

### API Endpoints
- POST /api/summarize - streszczenia artykulow (Claude API)
- POST /api/tts - Text-to-Speech (Edge TTS)
- GET /api/tts/voices - lista dostepnych glosow
- GET /api/articles - historia artykulow
- POST /api/articles/seen - oznaczanie jako przeczytane
- GET/POST /api/saved - zapisane artykuly
- DELETE /api/saved/:url - usuwanie zapisanych
- GET/POST /api/fetch-log - log pobierania

### Technical
- Node.js + Express (lokalny development)
- Vercel serverless (produkcja)
- Supabase PostgreSQL (baza danych)
- Reveal.js (prezentacja)
- Edge TTS (synteza mowy)

### Zrodla artykulow
1. Ethan Mollick - One Useful Thing
2. Benedict Evans
3. Stratechery - Ben Thompson
4. Marginal Revolution
5. Hugging Face Blog
6. Jason Liu - jxnl.co
7. Hamel Husain
8. Phil Schmid
9. Eugene Yan
10. Lilian Weng
11. Machine Learning Mastery
12. Interconnects
13. Sebastian Raschka
14. Chip Huyen

### Deployment
- Production URL: https://leszek-newsroom-ai.vercel.app
- GitHub: https://github.com/leszekgiza/leszek-newsroom-ai
