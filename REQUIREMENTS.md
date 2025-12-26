# Leszek Newsroom AI - Wymagania

## 1. Funkcjonalnosci podstawowe

### 1.1 Prezentacja newsow
- [x] Prezentacja Reveal.js z przegledem artykulow z 14 zrodel AI/ML
- [x] Slajdy z artykulami pogrupowane wedlug autorow/blogow
- [x] Wyswietlanie tytulu, URL, opisu i tagow dla kazdego artykulu

### 1.2 Panel boczny ze streszczeniem
- [x] Przycisk "Wiecej" przy kazdym artykule
- [x] Panel wysuwany z prawej strony
- [x] Streszczenie generowane przez Claude API na podstawie URL artykulu
- [x] Kluczowe insighty i implikacje

### 1.3 Text-to-Speech (TTS)
- [x] Odsluchiwanie artykulow glosowo
- [x] Edge TTS (Microsoft) - darmowe, wysokiej jakosci polskie glosy
- [x] Wybor glasu (Zofia/Marek)
- [x] Kontrolki: Play, Pause, Stop
- [ ] Automatyczne TTS na slajdach z atrybutem data-tts

## 2. Funkcjonalnosci zapisywania danych

### 2.1 Historia wyswietlonych artykulow
- [x] Backend: API do oznaczania artykulow jako przeczytane
- [x] Zapis w data/articles.json
- [ ] Frontend: Oznaczenie wizualne nowych vs. widzianych artykulow

### 2.2 Historia pobierania newsow
- [x] Backend: API do logowania zdarzen fetch
- [x] Zapis w data/fetch_log.json z data i zrodlem
- [ ] Frontend: Wyswietlanie informacji kiedy ostatnio pobrano dane

### 2.3 Zapisz na pozniej
- [x] Backend: API do zapisywania artykulow
- [x] Zapis w data/saved.json
- [x] Frontend: Przycisk "Zapisz na pozniej" przy artykulach
- [x] Strona /saved z lista zapisanych artykulow
- [x] Mozliwosc usuniecia z zapisanych

## 3. Panel ustawien

### 3.0 Strona /settings
- [ ] Strona ustawien z formularzem
- [ ] Konfiguracja LinkedIn (sesja przegladarki + MFA)
- [ ] Konfiguracja Twitter/X (sesja przegladarki)
- [ ] Konfiguracja Gmail (OAuth 2.0)
- [ ] Zapis konfiguracji w data/settings.json

## 4. Integracje zewnetrzne

### 4.1 Zrodla danych (istniejace)
Lista 14 blogow z config_newsroom.md:
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

### 4.2 LinkedIn (planowane)
**UWAGA:** Wymaga logowania przez przegladarke z MFA (brak publicznego API)
- [ ] Puppeteer/Playwright do logowania
- [ ] Obsluga MFA (manual lub TOTP)
- [ ] Pobieranie postow z feeda
- [ ] Integracja z prezentacja

### 4.3 Twitter/X (planowane)
**UWAGA:** API Twitter jest platne - uzywamy web scrapingu dla bezkosztowego rozwiazania
- [ ] Puppeteer/Playwright do logowania
- [ ] Web scraping zamiast platnego API
- [ ] Pobieranie tweetow z feeda
- [ ] Integracja z prezentacja

### 4.4 Gmail - Newslettery AI (planowane)
- [ ] Integracja z Gmail API (OAuth 2.0)
- [ ] Filtrowanie emaili po nadawcach newsletterow
- [ ] Lista nadawcow do sledzenia:
  - The Batch (deeplearning.ai)
  - TLDR AI
  - Import AI
  - The Algorithm (MIT Technology Review)
  - AI Weekly
  - (inne do uzupelnienia)
- [ ] Parsowanie tresci emaili HTML
- [ ] Ekstrakcja linkow do artykulow
- [ ] Automatyczne dodawanie do prezentacji
- [ ] Oznaczanie przetworzonych emaili

#### Wymagania techniczne Gmail:
- Google Cloud Project z wlaczonym Gmail API
- OAuth 2.0 Client ID i Client Secret
- Scope: gmail.readonly
- Token refresh dla dlugotrwalego dostepu

## 4. Wymagania techniczne

### 4.1 Serwer lokalny
- [x] Node.js + Express
- [x] Serwowanie statycznych plikow
- [x] API endpoints dla wszystkich funkcjonalnosci
- [x] Zapis danych w plikach JSON

### 4.2 Deployment (planowane)
- [ ] Vercel serverless functions
- [ ] Migracja API do folderu /api
- [ ] Konfiguracja zmiennych srodowiskowych na Vercel

### 4.3 Wymagane klucze API
- [x] ANTHROPIC_API_KEY - do generowania streszczen

## 5. Struktura projektu

```
D:\Projekty\Blog\
├── index.html          # Glowna prezentacja
├── saved.html          # Strona zapisanych artykulow (TODO)
├── server.js           # Serwer Node.js z API
├── package.json        # Zaleznosci npm
├── .env                # Klucze API (nie commitowac!)
├── .env.example        # Przyklad konfiguracji
├── .gitignore          # Wykluczenia git
├── config_newsroom.md  # Konfiguracja zrodel
├── REQUIREMENTS.md     # Ten plik
└── data/               # Dane aplikacji
    ├── articles.json   # Historia artykulow
    ├── saved.json      # Zapisane artykuly
    └── fetch_log.json  # Log pobierania
```

## 6. Uruchomienie

```bash
# Instalacja zaleznosci
npm install

# Utworzenie pliku .env z kluczem API
cp .env.example .env
# Edytuj .env i dodaj ANTHROPIC_API_KEY

# Uruchomienie serwera
npm run dev

# Aplikacja dostepna pod:
# http://localhost:3000
```

## 7. Przyszle rozszerzenia

- [ ] Automatyczne pobieranie RSS z blogow
- [ ] Powiadomienia o nowych artykulach
- [ ] Filtrowanie artykulow wedlug tagow
- [ ] Eksport do PDF/Newsletter
- [ ] Integracja z Obsidian/Notion
- [ ] Aplikacja mobilna (PWA)
