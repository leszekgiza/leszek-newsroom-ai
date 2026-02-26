# Leszek Newsroom AI - Low-Level Design (LLD)

**Wersja:** 1.4
**Data:** 2026-02-09
**Status:** Draft

---

## 0. Provider-agnostic + BYO keys (OSS)
- Core OSS nie jest zwiazany z jednym dostawca LLM/TTS
- Uzytkownik OSS dostarcza wlasne klucze API (BYO keys)
- Nazwy dostawcow w dokumentacji sa tylko przykladami

## 1. Schemat Bazy Danych

### 1.0 Architektura Źródeł (Catalog vs Private)

System rozróżnia dwa typy źródeł:

| Typ | Opis | Scraping | Widoczność |
|-----|------|----------|------------|
| **CatalogSource** | Publiczne blogi/portale (shared) | Raz dla wszystkich | Subskrybenci |
| **PrivateSource** | Auth sites, Gmail, LinkedIn | Per-user | Tylko owner |

```
┌─────────────────────────────────────────────────────────────────┐
│                    CATALOG (shared)                              │
│  Ethan Mollick, Simon Willison, Eugene Yan...                   │
│  → Scrapowane RAZ, widoczne dla wszystkich subskrybentów        │
└─────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────┐
│                    PRIVATE (per-user)                            │
│  strefainwestora.pl (auth), Gmail, LinkedIn                     │
│  → Scrapowane PER-USER, widoczne tylko dla ownera               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Diagram ERD

```
┌─────────────────┐
│      users      │
├─────────────────┤
│ id (PK)         │─────────────────────────────────────────┐
│ email           │                                         │
│ password_hash   │                                         │
│ name            │                                         │
│ theme           │                                         │
│ default_view    │                                         │
│ tts_voice       │                                         │
│ created_at      │                                         │
└─────────────────┘                                         │
         │                                                  │
         │         ┌─────────────────────┐                  │
         │         │ user_subscriptions  │                  │
         │         ├─────────────────────┤                  │
         └────────▶│ user_id (FK)        │                  │
                   │ catalog_source_id   │◄──┐              │
                   │ subscribed_at       │   │              │
                   └─────────────────────┘   │              │
                                             │              │
┌─────────────────────┐                      │              │
│   catalog_sources   │  (SHARED)            │              │
├─────────────────────┤                      │              │
│ id (PK)             │──────────────────────┘              │
│ name                │                                     │
│ url (UNIQUE)        │──────────────────────┐              │
│ description         │                      │              │
│ category            │                      │              │
│ logo_url            │                      │              │
│ is_active           │                      │              │
│ last_scraped_at     │                      │              │
│ article_count       │                      │              │
└─────────────────────┘                      │              │
                                             │              │
┌─────────────────────┐                      │              │
│   private_sources   │  (PER-USER)          │              │
├─────────────────────┤                      │              │
│ id (PK)             │──────────────────────┼───┐          │
│ user_id (FK)        │◄─────────────────────┼───┼──────────┘
│ name                │                      │   │
│ url                 │                      │   │
│ type                │                      │   │
│ config (JSON)       │                      │   │
│ credentials (enc)   │                      │   │
│ is_active           │                      │   │
│ last_scraped_at     │                      │   │
└─────────────────────┘                      │   │
                                             │   │
┌─────────────────────┐                      │   │
│      articles       │                      │   │
├─────────────────────┤                      │   │
│ id (PK)             │                      │   │
│ url (UNIQUE)        │                      │   │
│ title               │                      │   │
│ intro               │                      │   │
│ summary             │                      │   │
│ image_url           │                      │   │
│ author              │                      │   │
│ published_at        │                      │   │
│ search_vector       │                      │   │
│ catalog_source_id   │◄─────────────────────┘   │  (nullable)
│ private_source_id   │◄─────────────────────────┘  (nullable)
└─────────────────────┘
         │
         │    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
         │    │  saved_articles │    │  read_articles  │    │ dismissed_articles  │
         │    ├─────────────────┤    ├─────────────────┤    ├─────────────────────┤
         └───▶│ article_id (FK) │    │ article_id (FK) │◄───│ article_id (FK)     │
              │ user_id (FK)    │    │ user_id (FK)    │    │ user_id (FK)        │
              │ saved_at        │    │ read_at         │    │ dismissed_at        │
              └─────────────────┘    └─────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      editions       │    │    sessions     │    │  user_topics    │
├─────────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)             │    │ id (PK)         │    │ id (PK)         │
│ user_id (FK)        │    │ user_id (FK)    │    │ user_id (FK)    │
│ date (UNIQUE w/uid) │    │ token           │    │ name            │
│ title               │    │ expires_at      │    │ keywords[]      │
│ summary             │    └─────────────────┘    │ is_active       │
│ article_count       │                           └─────────────────┘
│ unread_count        │                           (FUTURE: topic-based)
│ created_at          │
└─────────────────────┘
         │
         │ 1:N
         ▼
    articles.edition_id (FK, nullable)

┌─────────────────────┐
│  hidden_catalog_src │
├─────────────────────┤
│ user_id (FK)        │
│ catalog_source_id   │
│ hidden_at           │
└─────────────────────┘
```

### 1.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USERS & AUTH
// ============================================

model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String      @map("password_hash")
  name         String?
  avatarUrl    String?     @map("avatar_url")
  theme        Theme       @default(SYSTEM)
  defaultView  DefaultView @default(FEED) @map("default_view")
  ttsVoice     String      @default("pl-PL-MarekNeural") @map("tts_voice")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  // Relations
  subscriptions        UserSubscription[]
  privateSources       PrivateSource[]
  savedArticles        SavedArticle[]
  readArticles         ReadArticle[]
  dismissedArticles    DismissedArticle[]
  hiddenCatalogSources HiddenCatalogSource[]
  sessions             Session[]
  topics               UserTopic[]  // FUTURE: topic-based discovery
  editions             Edition[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

enum Theme {
  LIGHT
  DARK
  SYSTEM
}

enum DefaultView {
  FEED
  EDITIONS
}

// ============================================
// CATALOG SOURCES (SHARED)
// ============================================

model CatalogSource {
  id            String    @id @default(cuid())
  name          String
  url           String    @unique
  description   String?
  category      String?   // "AI/ML", "Tech", "Finance", "Startups"
  logoUrl       String?   @map("logo_url")
  isActive      Boolean   @default(true) @map("is_active")
  lastScrapedAt DateTime? @map("last_scraped_at")
  articleCount  Int       @default(0) @map("article_count")
  createdAt     DateTime  @default(now()) @map("created_at")

  // Relations
  articles      Article[]
  subscriptions UserSubscription[]
  hiddenBy      HiddenCatalogSource[]

  @@map("catalog_sources")
}

model UserSubscription {
  userId          String   @map("user_id")
  catalogSourceId String   @map("catalog_source_id")
  subscribedAt    DateTime @default(now()) @map("subscribed_at")

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  catalogSource CatalogSource @relation(fields: [catalogSourceId], references: [id], onDelete: Cascade)

  @@id([userId, catalogSourceId])
  @@map("user_subscriptions")
}

model HiddenCatalogSource {
  userId          String   @map("user_id")
  catalogSourceId String   @map("catalog_source_id")
  hiddenAt        DateTime @default(now()) @map("hidden_at")

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  catalogSource CatalogSource @relation(fields: [catalogSourceId], references: [id], onDelete: Cascade)

  @@id([userId, catalogSourceId])
  @@map("hidden_catalog_sources")
}

// ============================================
// PRIVATE SOURCES (PER-USER)
// ============================================

model PrivateSource {
  id            String              @id @default(cuid())
  userId        String              @map("user_id")
  name          String
  url           String
  type          PrivateSourceType   @default(WEBSITE)
  status        ConnectorStatus     @default(DISCONNECTED)
  config        Json?               // Per-type config (see Connector Config Schemas below)
  credentials   String?             // Encrypted (AES-256-GCM) - OAuth tokens, passwords, cookies
  syncInterval  Int                 @default(60) @map("sync_interval") // minutes
  isActive      Boolean             @default(true) @map("is_active")
  lastScrapedAt DateTime?           @map("last_scraped_at")
  lastSyncError String?             @map("last_sync_error")
  createdAt     DateTime            @default(now()) @map("created_at")

  // Relations
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  articles Article[]

  @@unique([userId, url])
  @@map("private_sources")
}

enum PrivateSourceType {
  WEBSITE   // Auth-required websites (strefainwestora.pl)
  GMAIL     // User's Gmail newsletters (OAuth + 3-path sender selection)
  LINKEDIN  // User's LinkedIn observed profiles (Voyager API / cookies)
  TWITTER   // User's Twitter/X timeline (Twikit / cookies)
  RSS       // Private RSS feeds
}

enum ConnectorStatus {
  CONNECTED     // Active, last sync OK
  SYNCING       // Sync in progress
  ERROR         // Last sync failed (retrying)
  EXPIRED       // Credentials expired, needs re-auth
  DISCONNECTED  // Disconnected by user (or never connected)
}

// ============================================
// ARTICLES (POLYMORPHIC SOURCE)
// ============================================

model Article {
  id          String    @id @default(cuid())
  url         String    @unique
  title       String
  intro       String?   // 2-sentence AI intro
  summary     String?   // Full AI summary
  imageUrl    String?   @map("image_url")
  author      String?
  publishedAt DateTime? @map("published_at")
  scrapedAt   DateTime  @default(now()) @map("scraped_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  // Polymorphic source relation (one or the other, not both)
  catalogSourceId String? @map("catalog_source_id")
  privateSourceId String? @map("private_source_id")

  // Edition relation (optional)
  editionId String? @map("edition_id")

  // Full-text search vector (managed by trigger)
  searchVector Unsupported("tsvector")? @map("search_vector")

  // Relations
  catalogSource CatalogSource? @relation(fields: [catalogSourceId], references: [id], onDelete: Cascade)
  privateSource PrivateSource? @relation(fields: [privateSourceId], references: [id], onDelete: Cascade)
  edition       Edition?       @relation(fields: [editionId], references: [id], onDelete: SetNull)
  savedBy       SavedArticle[]
  readBy        ReadArticle[]
  dismissedBy   DismissedArticle[]

  @@index([catalogSourceId])
  @@index([privateSourceId])
  @@index([publishedAt(sort: Desc)])
  @@index([editionId])
  @@map("articles")
}

model SavedArticle {
  userId    String   @map("user_id")
  articleId String   @map("article_id")
  savedAt   DateTime @default(now()) @map("saved_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@id([userId, articleId])
  @@map("saved_articles")
}

model ReadArticle {
  userId    String   @map("user_id")
  articleId String   @map("article_id")
  readAt    DateTime @default(now()) @map("read_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@id([userId, articleId])
  @@map("read_articles")
}

model DismissedArticle {
  userId      String   @map("user_id")
  articleId   String   @map("article_id")
  dismissedAt DateTime @default(now()) @map("dismissed_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@id([userId, articleId])
  @@map("dismissed_articles")
}

// ============================================
// EDITIONS (Daily article groupings)
// ============================================

model Edition {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  date         DateTime @db.Date
  title        String?  // Optional title like "Wydanie poranne"
  summary      String?  // AI-generated summary of the edition
  articleCount Int      @default(0) @map("article_count")
  unreadCount  Int      @default(0) @map("unread_count")
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  articles Article[]

  @@unique([userId, date])
  @@index([userId])
  @@index([date(sort: Desc)])
  @@map("editions")
}

// ============================================
// USER TOPICS (FUTURE: topic-based discovery)
// ============================================

model UserTopic {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  name      String   // "AI Agents", "MLOps", "Polish Startups"
  keywords  String[] // ["LLM", "RAG", "fine-tuning"]
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_topics")
}
```

### 1.3 Query: User's Feed (Catalog + Private)

```sql
-- Artykuły z subskrybowanych źródeł katalogowych
SELECT a.*, cs.name as source_name, cs.logo_url, 'catalog' as source_type
FROM articles a
JOIN catalog_sources cs ON a.catalog_source_id = cs.id
JOIN user_subscriptions us ON cs.id = us.catalog_source_id
WHERE us.user_id = :userId
  AND cs.id NOT IN (
    SELECT catalog_source_id FROM hidden_catalog_sources WHERE user_id = :userId
  )

UNION ALL

-- Artykuły z prywatnych źródeł użytkownika
SELECT a.*, ps.name as source_name, NULL as logo_url, 'private' as source_type
FROM articles a
JOIN private_sources ps ON a.private_source_id = ps.id
WHERE ps.user_id = :userId
  AND ps.is_active = true

ORDER BY published_at DESC
LIMIT :limit OFFSET :offset;
```

### 1.4 Migracja Full-Text Search (SQL)

```sql
-- migrations/add_fts.sql

-- Dodanie kolumny tsvector
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- Utworzenie indeksu GIN
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Funkcja aktualizujaca search_vector
CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.polish', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.polish', COALESCE(NEW.intro, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.polish', COALESCE(NEW.summary, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER articles_search_update
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION articles_search_vector_update();

-- Aktualizacja istniejacych rekordow
UPDATE articles SET search_vector =
  setweight(to_tsvector('pg_catalog.polish', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('pg_catalog.polish', COALESCE(intro, '')), 'B') ||
  setweight(to_tsvector('pg_catalog.polish', COALESCE(summary, '')), 'C');
```

---

## 2. API Endpoints

### 2.1 Przegląd

| Method | Endpoint | Opis | Auth |
|--------|----------|------|------|
| **Auth** |
| POST | `/api/auth/register` | Rejestracja | - |
| POST | `/api/auth/login` | Logowanie | - |
| POST | `/api/auth/logout` | Wylogowanie | ✓ |
| POST | `/api/auth/reset-password` | Reset hasła | - |
| **Articles** |
| GET | `/api/articles` | User's feed (catalog + private) | ✓ |
| GET | `/api/articles/:id` | Szczegóły artykułu | ✓ |
| POST | `/api/articles/:id/read` | Oznacz jako przeczytany | ✓ |
| GET | `/api/articles/search` | Wyszukiwanie FTS | ✓ |
| **Saved** |
| GET | `/api/saved` | Zapisane artykuły | ✓ |
| POST | `/api/saved/:articleId` | Zapisz artykuł | ✓ |
| DELETE | `/api/saved/:articleId` | Usuń z zapisanych | ✓ |
| **Catalog Sources (shared)** |
| GET | `/api/catalog` | Lista źródeł w katalogu | ✓ |
| GET | `/api/catalog/:id` | Szczegóły źródła | ✓ |
| POST | `/api/catalog/:id/subscribe` | Subskrybuj źródło | ✓ |
| DELETE | `/api/catalog/:id/subscribe` | Anuluj subskrypcję | ✓ |
| POST | `/api/catalog/:id/hide` | Ukryj źródło | ✓ |
| DELETE | `/api/catalog/:id/hide` | Pokaż ukryte | ✓ |
| **Private Sources (per-user)** |
| GET | `/api/private-sources` | Prywatne źródła usera | ✓ |
| POST | `/api/private-sources` | Dodaj prywatne źródło (WEBSITE/RSS) | ✓ |
| PUT | `/api/private-sources/:id` | Edytuj źródło | ✓ |
| DELETE | `/api/private-sources/:id` | Usuń źródło + credentials | ✓ |
| **Connectors (Source Integrations)** |
| GET | `/api/connectors` | Lista connectorów ze statusem | ✓ |
| GET | `/api/connectors/:id/status` | Status + stats connectora | ✓ |
| POST | `/api/connectors/:id/sync` | Manual sync (SSE progress) | ✓ |
| DELETE | `/api/connectors/:id` | Rozłącz connector (usuń credentials) | ✓ |
| **Gmail Connector** |
| GET | `/api/auth/gmail` | Redirect do Google OAuth consent | ✓ |
| GET | `/api/auth/gmail/callback` | OAuth callback (exchange code → tokens) | - |
| POST | `/api/connectors/gmail/search-sender` | Szukaj maili po nadawcy (Paste & Match) | ✓ |
| POST | `/api/connectors/gmail/llm-query` | LLM konwersja intencji → Gmail query (Search) | ✓ |
| GET | `/api/connectors/gmail/browse` | Przeglądaj skrzynkę (Browse & Select) | ✓ |
| POST | `/api/connectors/gmail/senders` | Zapisz wybranych nadawców do importu | ✓ |
| **LinkedIn Connector** |
| POST | `/api/connectors/linkedin/connect` | Login/hasło → Voyager session (via Python) | ✓ |
| POST | `/api/connectors/linkedin/cookie` | Manual cookie li_at (fallback) | ✓ |
| POST | `/api/connectors/linkedin/test` | Test połączenia | ✓ |
| POST | `/api/connectors/linkedin/search-profiles` | Wyszukiwanie profili LinkedIn (via Python scraper) | ✓ |
| **X/Twitter Connector** |
| POST | `/api/connectors/twitter/connect` | Cookies (auth_token+ct0) lub login/hasło (via Python) | ✓ |
| POST | `/api/connectors/twitter/test` | Test połączenia | ✓ |
| **TTS** |
| POST | `/api/tts` | Generuj audio | ✓ |
| **User** |
| GET | `/api/user/settings` | Pobierz ustawienia | ✓ |
| PUT | `/api/user/settings` | Zapisz ustawienia | ✓ |
| **Editions** |
| GET | `/api/editions` | Lista wydań użytkownika | ✓ |
| GET | `/api/editions/:id` | Szczegóły wydania z artykułami | ✓ |
| POST | `/api/editions/:id/tts` | Generuj audio dla całego wydania | ✓ |
| **User Preferences** |
| GET | `/api/user/preferences` | Pobierz preferencje użytkownika | ✓ |
| PUT | `/api/user/preferences` | Zapisz preferencje użytkownika | ✓ |
| **Scraping** |
| POST | `/api/scrape/trigger` | Uruchom scraping dla źródła | ✓ |
| GET | `/api/scrape/all` | SSE - sync wszystkich źródeł z postępem | ✓ |
| **Dismissed (Trash)** |
| GET | `/api/trash` | Lista odrzuconych artykułów | ✓ |
| POST | `/api/articles/:id/dismiss` | Odrzuć artykuł (przenieś do kosza) | ✓ |
| DELETE | `/api/articles/:id/dismiss` | Przywróć artykuł z kosza | ✓ |
| **Q&A (Planned - OSS)** |
| POST | `/api/articles/:id/chat` | Text Q&A z artykułem (SSE streaming) | ✓ |
| **Cron** |
| GET | `/api/cron/editions` | Automatyczne tworzenie wydań (Vercel Cron) | - |
| GET | `/api/cron/cleanup-trash` | Czyszczenie kosza po 15 dniach (Vercel Cron, 01:00 UTC) | - |

### 2.2 Szczegóły Endpoints

#### POST /api/auth/register

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "Jan Kowalski"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "Jan Kowalski"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `400` - Validation error (email format, password too weak)
- `409` - Email already exists

---

#### POST /api/auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "Jan Kowalski",
    "theme": "DARK"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `401` - Invalid credentials

---

#### GET /api/articles

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Numer strony |
| `limit` | number | 20 | Ilość na stronę (max 50) |
| `sourceId` | string | - | Filtr po źródle |
| `unreadOnly` | boolean | false | Tylko nieprzeczytane |

**Response (200):**
```json
{
  "articles": [
    {
      "id": "clx9876543210",
      "title": "The Future of AI Agents",
      "intro": "Artykuł analizuje rosnącą rolę autonomicznych agentów AI...",
      "imageUrl": "https://example.com/image.jpg",
      "author": "Ethan Mollick",
      "publishedAt": "2025-12-28T10:00:00Z",
      "source": {
        "id": "clx1111111111",
        "name": "One Useful Thing",
        "url": "https://oneusefulthing.substack.com"
      },
      "isRead": false,
      "isSaved": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

#### GET /api/articles/search

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✓ | Fraza wyszukiwania |
| `page` | number | - | Numer strony |
| `limit` | number | - | Ilość na stronę |

**Response (200):**
```json
{
  "articles": [
    {
      "id": "clx9876543210",
      "title": "The Future of AI Agents",
      "intro": "Artykuł analizuje rosnącą rolę autonomicznych agentów AI...",
      "highlight": "...autonomicznych <mark>agentów</mark> AI w środowiskach...",
      "source": { ... },
      "relevance": 0.95
    }
  ],
  "query": "agentów AI",
  "pagination": { ... }
}
```

---

#### POST /api/tts

**Request:**
```json
{
  "text": "Tekst do przeczytania przez syntezator mowy...",
  "voice": "pl-PL-ZofiaNeural",
  "rate": 1.5
}
```

**Response (200):**
```json
{
  "audioUrl": "/api/tts/audio/abc123.mp3",
  "duration": 45.2
}
```

**Available Voices:**
| Voice ID | Language | Gender |
|----------|----------|--------|
| `pl-PL-ZofiaNeural` | Polski | Female |
| `pl-PL-MarekNeural` | Polski | Male |
| `en-US-JennyNeural` | English | Female |
| `en-US-GuyNeural` | English | Male |


---

#### GET /api/editions

**Response (200):**
```json
{
  "editions": [
    {
      "id": "clx1234567890",
      "date": "2026-01-15",
      "title": "Wydanie z 15 stycznia 2026",
      "summary": "AI podsumowanie wydania...",
      "articleCount": 25,
      "unreadCount": 12,
      "createdAt": "2026-01-15T00:00:00Z"
    }
  ]
}
```

---

#### GET /api/editions/:id

**Response (200):**
```json
{
  "id": "clx1234567890",
  "date": "2026-01-15",
  "title": "Wydanie z 15 stycznia 2026",
  "summary": "AI podsumowanie wydania...",
  "articleCount": 25,
  "unreadCount": 12,
  "articles": [
    {
      "id": "clx9876543210",
      "title": "The Future of AI Agents",
      "intro": "Artykuł analizuje...",
      "url": "https://example.com/article",
      "imageUrl": "https://example.com/image.jpg",
      "publishedAt": "2026-01-15T10:00:00Z",
      "source": "One Useful Thing",
      "sourceLogoUrl": "https://example.com/logo.png",
      "isRead": false,
      "isSaved": true
    }
  ]
}
```

---

#### POST /api/editions/:id/tts (DEPRECATED)

> **Deprecated:** Zastąpione przez playlist player, który wywołuje `POST /api/tts`
> per artykuł. Ten endpoint generował jedno monolityczne audio ze wszystkich artykułów.

**Request:**
```json
{
  "voice": "pl-PL-MarekNeural"
}
```

**Response (200):**
- Content-Type: audio/mpeg
- Binary audio data (MP3)

**Errors:**
- 400 - Brak artykulow w wydaniu lub wydanie za dlugie (max 50000 znakow)
- 404 - Wydanie nie znalezione

#### EditionTTSPlayer.tsx (Playlist)
- Props: articles[] (id, title, intro, summary, source)
- Stan: currentTrack, isPlaying, audioCacheRef (Map<index, blobURL>)
- Generowanie: POST /api/tts per artykuł (reuse istniejącego endpointu)
- Prefetch: generuj track N+1 gdy N gra
- Nawigacja: prev (restart/back), play/pause, next
- Koordynacja: playerStore.stop() przy starcie, pause przy card-level TTS
- Auto-read: gdy onended fires, wywołaj onArticleListened(articleId) callback
- Parent (edition page) przekazuje markAsRead jako onArticleListened
- Fires tylko na naturalny koniec tracku, NIE na next/prev/skip/error

---

#### GET /api/user/preferences

**Response (200):**
```json
{
  "theme": "SYSTEM",
  "defaultView": "FEED",
  "ttsVoice": "pl-PL-MarekNeural"
}
```

---

#### PUT /api/user/preferences

**Request:**
```json
{
  "theme": "DARK",
  "defaultView": "EDITION",
  "ttsVoice": "pl-PL-ZofiaNeural"
}
```

**Response (200):**
```json
{
  "theme": "DARK",
  "defaultView": "EDITION",
  "ttsVoice": "pl-PL-ZofiaNeural"
}
```

---

#### GET /api/scrape/all (SSE)

**Response:** Server-Sent Events stream

```
event: progress
data: {"sourceId":"clx123","sourceName":"One Useful Thing","status":"scraping","current":1,"total":5}

event: article
data: {"sourceId":"clx123","articleTitle":"New AI Article","isNew":true}

event: complete
data: {"totalSources":5,"newArticles":12,"editionCreated":true,"editionId":"clx456"}

event: error
data: {"sourceId":"clx123","error":"Connection timeout"}
```

---

#### POST /api/sources

**Request:**
```json
{
  "name": "Simon Willison",
  "url": "https://simonwillison.net",
  "type": "WEBSITE",
  "config": {
    "articleSelector": "article.h-entry",
    "titleSelector": "h1.p-name",
    "contentSelector": ".e-content"
  }
}
```

**Response (201):**
```json
{
  "source": {
    "id": "clx2222222222",
    "name": "Simon Willison",
    "url": "https://simonwillison.net",
    "type": "WEBSITE",
    "isActive": true,
    "createdAt": "2025-12-28T12:00:00Z"
  }
}
```

---

#### POST /api/connectors/gmail/search-sender (Ścieżka A: Paste & Match)

**Request:**
```json
{
  "email": "newsletter@deeplearning.ai"
}
```

**Response (200):**
```json
{
  "found": true,
  "sender": {
    "email": "newsletter@deeplearning.ai",
    "name": "The Batch",
    "lastSubject": "What's new in ML this week",
    "lastDate": "2026-02-06T10:00:00Z",
    "frequency": "weekly",
    "messageCount": 24,
    "matchQuery": "from:newsletter@deeplearning.ai"
  }
}
```

---

#### POST /api/connectors/gmail/llm-query (Ścieżka B: LLM Search)

**Request:**
```json
{
  "intent": "cotygodniowe newslettery o AI i machine learning"
}
```

**Response (200):**
```json
{
  "gmailQuery": "subject:(\"AI\" OR \"machine learning\" OR \"weekly\") newer_than:90d",
  "senders": [
    {
      "email": "newsletter@deeplearning.ai",
      "name": "The Batch",
      "messageCount": 24,
      "matchQuery": "from:newsletter@deeplearning.ai"
    },
    {
      "email": "dan@tldrnewsletter.com",
      "name": "TLDR AI",
      "messageCount": 30,
      "matchQuery": "from:dan@tldrnewsletter.com"
    }
  ]
}
```

---

#### GET /api/connectors/gmail/browse (Ścieżka C: Browse & Select)

**Response (200):**
```json
{
  "senders": [
    {
      "email": "newsletter@deeplearning.ai",
      "name": "The Batch",
      "classification": "newsletter",
      "messageCount": 24,
      "frequency": "weekly",
      "lastSubject": "What's new in ML this week"
    },
    {
      "email": "noreply@amazon.com",
      "name": "Amazon",
      "classification": "marketing",
      "messageCount": 156,
      "frequency": "daily",
      "lastSubject": "Your order has shipped"
    }
  ],
  "classifications": {
    "newsletter": 12,
    "marketing": 45,
    "transactional": 23,
    "personal": 8
  }
}
```

---

#### POST /api/connectors/gmail/senders

**Request:**
```json
{
  "senders": [
    {
      "email": "newsletter@deeplearning.ai",
      "name": "The Batch",
      "matchQuery": "from:newsletter@deeplearning.ai"
    }
  ],
  "maxAgeDays": 7,
  "syncInterval": 60
}
```

**Response (201):**
```json
{
  "connector": {
    "id": "clx2222222222",
    "type": "GMAIL",
    "status": "CONNECTED",
    "config": {
      "senders": [{ "email": "newsletter@deeplearning.ai", "name": "The Batch" }],
      "maxAgeDays": 7,
      "syncInterval": 60
    }
  }
}
```

---

#### POST /api/connectors/linkedin/connect

**Request:**
```json
{
  "username": "user@example.com",
  "password": "...",
  "disclaimerAccepted": true,
  "config": {
    "profiles": [
      { "publicId": "karpathy", "name": "Andrej Karpathy", "profileUrl": "https://www.linkedin.com/in/karpathy" }
    ],
    "maxPostsPerProfile": 10
  }
}
```

**Response (200):**
```json
{
  "connector": {
    "id": "clx3333333333",
    "type": "LINKEDIN",
    "status": "CONNECTED",
    "profileName": "User Name",
    "config": { ... }
  }
}
```

**Errors:**
- `401` - Invalid LinkedIn credentials
- `403` - Disclaimer not accepted
- `429` - LinkedIn rate limit / anti-bot

---

#### POST /api/connectors/twitter/connect

**Request (cookies - preferowane):**
```json
{
  "authMethod": "cookies",
  "authToken": "abc123...",
  "ct0": "def456...",
  "disclaimerAccepted": true,
  "config": {
    "timeline": "following",
    "includeRetweets": false,
    "includeReplies": false,
    "includeThreads": true
  }
}
```

**Response (200):**
```json
{
  "connector": {
    "id": "clx4444444444",
    "type": "TWITTER",
    "status": "CONNECTED",
    "username": "@user",
    "config": { ... }
  }
}
```

---

## 3. Struktura Komponentów React

### 3.1 Drzewo Komponentów

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   ├── (main)/                   # Main app group (with layout)
│   │   ├── layout.tsx            # Sidebar/navbar layout
│   │   ├── page.tsx              # Home (feed)
│   │   ├── saved/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx          # Settings overview
│   │       ├── sources/
│   │       │   └── page.tsx
│   │       ├── integrations/
│   │       │   └── page.tsx
│   │       └── appearance/
│   │           └── page.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── articles/
│   │   ├── sources/
│   │   ├── saved/
│   │   ├── integrations/
│   │   └── tts/
│   ├── layout.tsx                # Root layout
│   └── globals.css
│
├── components/
│   ├── ui/                       # Primitive UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   │
│   ├── layout/                   # Layout components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── Container.tsx
│   │
│   ├── articles/                 # Article components
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleList.tsx
│   │   ├── ArticleGrid.tsx
│   │   ├── SourceFilter.tsx
│   │   └── SearchBar.tsx
│   │
│   ├── summary/                  # AI Summary components
│   │   ├── SummaryModal.tsx
│   │   ├── SummaryContent.tsx
│   │   ├── KeyInsights.tsx
│   │   └── TTSPlayer.tsx
│   │
│   ├── sources/                  # Source management
│   │   ├── SourceList.tsx
│   │   ├── SourceCard.tsx
│   │   ├── AddSourceForm.tsx
│   │   └── HiddenSourcesList.tsx
│   │
│   ├── connectors/               # Source Integration components
│   │   ├── ConnectorDashboard.tsx    # Status dashboard (all connectors)
│   │   ├── ConnectorCard.tsx         # Single connector status card
│   │   ├── ConnectorSyncProgress.tsx # Inline sync progress (bars, stats)
│   │   ├── GmailWizard.tsx           # 3-tab wizard (Paste/Search/Browse)
│   │   ├── GmailSenderList.tsx       # Sender selection list
│   │   ├── GmailSenderPreview.tsx    # Sender details preview
│   │   ├── LinkedInWizard.tsx        # Login + disclaimer + test
│   │   ├── TwitterWizard.tsx         # Cookies/login + disclaimer
│   │   └── CredentialsExpired.tsx    # Re-auth notification (banner+toast)
│   │
│   └── auth/                     # Auth components
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       ├── ResetPasswordForm.tsx
│       └── ProfileMenu.tsx
│
├── hooks/                        # Custom React hooks
│   ├── useArticles.ts
│   ├── useSearch.ts
│   ├── useSources.ts
│   ├── useSaved.ts
│   ├── useTTS.ts
│   ├── useAuth.ts
│   ├── useConnectors.ts          # Connector CRUD, status, sync
│   └── useDebounce.ts
│
├── stores/                       # Zustand stores
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── playerStore.ts
│
├── lib/                          # Utilities
│   ├── prisma.ts                 # Prisma client
│   ├── auth.ts                   # Auth utilities
│   ├── encryption.ts             # AES-256 encryption
│   ├── api.ts                    # API client
│   └── utils.ts                  # General utilities
│
├── types/                        # TypeScript types
│   ├── article.ts
│   ├── source.ts
│   ├── user.ts
│   └── api.ts
│
├── lib/connectors/               # Connector implementations
│   ├── connectorInterface.ts     # SourceConnector interface + types
│   ├── connectorFactory.ts       # ConnectorFactory (type → implementation)
│   ├── gmailConnector.ts         # Gmail: googleapis (Node.js native)
│   ├── linkedinConnector.ts      # LinkedIn: delegates to Python /linkedin/*
│   ├── twitterConnector.ts       # X/Twitter: delegates to Python /twitter/*
│   └── credentialEncryption.ts   # AES-256-GCM encrypt/decrypt
│
└── services/                     # Backend services
    ├── articleService.ts
    ├── scrapeService.ts
    ├── summaryService.ts
    ├── ttsService.ts
    ├── searchService.ts
    ├── connectorService.ts       # Connector orchestration (sync, health, schedule)
    ├── gmailService.ts           # Gmail API client (search, fetch, senders)
    ├── linkedinService.ts        # LinkedIn → Python microservice proxy
    └── twitterService.ts         # X/Twitter → Python microservice proxy
```

### 3.2 Kluczowe Komponenty

#### ArticleCard.tsx

```tsx
interface ArticleCardProps {
  article: Article;
  onSave: (id: string) => void;
  onOpenSummary: (article: Article) => void;
}

export function ArticleCard({ article, onSave, onOpenSummary }: ArticleCardProps) {
  return (
    <Card className="...">
      {/* Image */}
      {article.imageUrl && <img src={article.imageUrl} />}

      {/* Header */}
      <div className="flex justify-between">
        <Badge>{article.source.name}</Badge>
        {!article.isRead && <Badge variant="new">NEW</Badge>}
      </div>

      {/* Title */}
      <h3>{article.title}</h3>

      {/* Intro (2 sentences) */}
      <p className="text-muted">{article.intro}</p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => onOpenSummary(article)}>
          AI Summary
        </Button>
        <Button variant="ghost" onClick={() => onSave(article.id)}>
          {article.isSaved ? <BookmarkFilled /> : <Bookmark />}
        </Button>
        <Button variant="ghost" asChild>
          <a href={article.url} target="_blank">
            <ExternalLink />
          </a>
        </Button>
      </div>
    </Card>
  );
}
```

#### TTSPlayer.tsx

```tsx
interface TTSPlayerProps {
  text: string;
  voice: string;
  onVoiceChange: (voice: string) => void;
}

export function TTSPlayer({ text, voice, onVoiceChange }: TTSPlayerProps) {
  const { isPlaying, progress, play, pause, seek, setRate } = useTTS(text, voice);

  return (
    <div className="...">
      {/* Progress Bar */}
      <Slider value={progress} onValueChange={seek} />

      {/* Time Display */}
      <div className="flex justify-between text-sm">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Speed */}
        <SpeedSelector value={rate} onChange={setRate} />

        {/* Playback */}
        <Button onClick={isPlaying ? pause : play}>
          {isPlaying ? <Pause /> : <Play />}
        </Button>

        {/* Voice */}
        <VoiceSelector value={voice} onChange={onVoiceChange} />
      </div>
    </div>
  );
}
```

#### SummaryModal.tsx

```tsx
interface SummaryModalProps {
  article: Article;
  isOpen: boolean;
  onClose: () => void;
}

export function SummaryModal({ article, isOpen, onClose }: SummaryModalProps) {
  const [voice, setVoice] = useState('pl-PL-ZofiaNeural');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <ModalHeader>
        <AIIcon />
        <span>AI Streszczenie</span>
        <CloseButton onClick={onClose} />
      </ModalHeader>

      {/* Article Info */}
      <div className="bg-muted p-4">
        <h3>{article.title}</h3>
        <p>{article.author} • {article.source.name}</p>
      </div>

      {/* Content Grid (Desktop: 2 columns) */}
      <div className="grid md:grid-cols-3">
        {/* Summary */}
        <div className="md:col-span-2">
          <SummaryContent summary={article.summary} />
        </div>

        {/* Key Insights */}
        <div>
          <KeyInsights insights={article.insights} />
        </div>
      </div>

      {/* TTS Player */}
      <TTSPlayer
        text={article.summary}
        voice={voice}
        onVoiceChange={setVoice}
      />

      {/* Actions */}
      <ModalFooter>
        <Button onClick={() => window.open(article.url)}>
          Otwórz artykuł
        </Button>
        <SaveButton articleId={article.id} />
        <ShareButton article={article} />
      </ModalFooter>
    </Modal>
  );
}
```

---

## 4. State Management (Zustand)

### 4.1 Auth Store

```typescript
// stores/authStore.ts

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const { user, token } = await api.post('/auth/login', { email, password });
        set({ user, token, isLoading: false });
      },

      logout: () => {
        api.post('/auth/logout');
        set({ user: null, token: null });
      },

      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null
        }));
      }
    }),
    { name: 'auth-storage' }
  )
);
```

### 4.2 UI Store

```typescript
// stores/uiStore.ts

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  summaryModalOpen: boolean;
  selectedArticle: Article | null;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  openSummaryModal: (article: Article) => void;
  closeSummaryModal: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  theme: 'system',
  sidebarOpen: true,
  summaryModalOpen: false,
  selectedArticle: null,

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openSummaryModal: (article) => set({ summaryModalOpen: true, selectedArticle: article }),
  closeSummaryModal: () => set({ summaryModalOpen: false, selectedArticle: null }),
}));
```

### 4.3 Player Store

```typescript
// stores/playerStore.ts

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  voice: string;
  audioUrl: string | null;

  // Actions
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setRate: (rate: number) => void;
  setVoice: (voice: string) => void;
  loadAudio: (text: string) => Promise<void>;
}
```

---

## 5. Diagramy Sekwencji

### 5.1 Logowanie

```
┌──────┐          ┌──────────┐          ┌─────────┐          ┌────────────┐
│Client│          │ Next.js  │          │  API    │          │ PostgreSQL │
└──┬───┘          └────┬─────┘          └────┬────┘          └─────┬──────┘
   │                   │                     │                     │
   │ POST /login       │                     │                     │
   │──────────────────>│                     │                     │
   │                   │ POST /api/auth/login│                     │
   │                   │────────────────────>│                     │
   │                   │                     │ SELECT user         │
   │                   │                     │────────────────────>│
   │                   │                     │     user data       │
   │                   │                     │<────────────────────│
   │                   │                     │ Compare bcrypt      │
   │                   │                     │─────────┐           │
   │                   │                     │         │           │
   │                   │                     │<────────┘           │
   │                   │                     │ INSERT session      │
   │                   │                     │────────────────────>│
   │                   │                     │     OK              │
   │                   │                     │<────────────────────│
   │                   │  { user, token }    │                     │
   │                   │<────────────────────│                     │
   │  Set cookie + redirect                  │                     │
   │<──────────────────│                     │                     │
   │                   │                     │                     │
```

### 5.2 Wyszukiwanie FTS

```
┌──────┐          ┌──────────┐          ┌─────────┐          ┌────────────┐
│Client│          │ Next.js  │          │  API    │          │ PostgreSQL │
└──┬───┘          └────┬─────┘          └────┬────┘          └─────┬──────┘
   │                   │                     │                     │
   │ GET /search?q=AI  │                     │                     │
   │──────────────────>│                     │                     │
   │                   │ GET /api/articles/search?q=AI             │
   │                   │────────────────────>│                     │
   │                   │                     │ SELECT ... WHERE    │
   │                   │                     │ search_vector @@    │
   │                   │                     │ plainto_tsquery(    │
   │                   │                     │ 'polish', 'AI')     │
   │                   │                     │────────────────────>│
   │                   │                     │   matching articles │
   │                   │                     │<────────────────────│
   │                   │                     │ ts_headline()       │
   │                   │                     │ for highlights      │
   │                   │                     │────────────────────>│
   │                   │                     │   with highlights   │
   │                   │                     │<────────────────────│
   │                   │  { articles, ... }  │                     │
   │                   │<────────────────────│                     │
   │  Render results   │                     │                     │
   │<──────────────────│                     │                     │
```

### 5.3 Scraping Flow

```
┌────────┐      ┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│  Cron  │      │ Backend │      │ Crawl4AI │      │ Claude  │      │   DB     │
└───┬────┘      └────┬────┘      └────┬─────┘      └────┬────┘      └────┬─────┘
    │                │                │                 │                │
    │ trigger        │                │                 │                │
    │───────────────>│                │                 │                │
    │                │ GET sources    │                 │                │
    │                │───────────────────────────────────────────────────>│
    │                │<───────────────────────────────────────────────────│
    │                │                │                 │                │
    │                │ For each source:                 │                │
    │                │ POST /scrape   │                 │                │
    │                │───────────────>│                 │                │
    │                │                │ Fetch HTML      │                │
    │                │                │ Extract content │                │
    │                │ markdown       │                 │                │
    │                │<───────────────│                 │                │
    │                │                │                 │                │
    │                │ POST /messages │                 │                │
    │                │ (generate intro + summary)       │                │
    │                │─────────────────────────────────>│                │
    │                │       { intro, summary }         │                │
    │                │<─────────────────────────────────│                │
    │                │                │                 │                │
    │                │ INSERT article │                 │                │
    │                │───────────────────────────────────────────────────>│
    │                │<───────────────────────────────────────────────────│
    │                │                │                 │                │
```

---

## 6. Walidacja (Zod Schemas)

```typescript
// lib/validations.ts

import { z } from 'zod';

// Auth
export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z
    .string()
    .min(8, 'Hasło musi mieć min. 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
    .regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'Imię musi mieć min. 2 znaki').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła muszą być identyczne',
  path: ['confirmPassword'],
});

// Sources
export const sourceSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(100),
  url: z.string().url('Nieprawidłowy URL'),
  type: z.enum(['WEBSITE', 'GMAIL', 'LINKEDIN', 'TWITTER', 'RSS']),
  config: z.object({
    articleSelector: z.string().optional(),
    titleSelector: z.string().optional(),
    contentSelector: z.string().optional(),
    credentials: z.object({
      username: z.string(),
      password: z.string(),
    }).optional(),
  }).optional(),
});

// Search
export const searchSchema = z.object({
  q: z.string().min(2, 'Wpisz min. 2 znaki').max(200),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// TTS
export const ttsSchema = z.object({
  text: z.string().min(1).max(10000),
  voice: z.enum([
    'pl-PL-ZofiaNeural',
    'pl-PL-MarekNeural',
    'en-US-JennyNeural',
    'en-US-GuyNeural',
  ]).default('pl-PL-ZofiaNeural'),
  rate: z.number().min(0.5).max(2).default(1),
});

// Gmail Connector
export const gmailSenderSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  matchQuery: z.string().optional(),
});

export const gmailConfigSchema = z.object({
  senders: z.array(gmailSenderSchema).min(1, 'Wybierz min. 1 nadawcę'),
  maxAgeDays: z.number().min(1).max(365).default(7),
  syncInterval: z.number().min(15).max(1440).default(60),
});

export const gmailLlmQuerySchema = z.object({
  intent: z.string().min(3, 'Opisz co szukasz').max(500),
});

// LinkedIn Connector
export const linkedinConnectSchema = z.object({
  username: z.string().email('Podaj email LinkedIn'),
  password: z.string().min(1, 'Hasło jest wymagane'),
  disclaimerAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Musisz zaakceptować disclaimer' }),
  }),
  config: z.object({
    profiles: z.array(z.object({
      publicId: z.string(),
      name: z.string(),
      headline: z.string().optional(),
      profileUrl: z.string().url(),
    })).default([]),
    maxPostsPerProfile: z.number().min(1).max(50).default(10),
  }).optional(),
});

export const linkedinCookieSchema = z.object({
  liAtCookie: z.string().min(10, 'Nieprawidłowy cookie li_at'),
  disclaimerAccepted: z.literal(true),
});

// X/Twitter Connector
export const twitterConnectSchema = z.object({
  authMethod: z.enum(['cookies', 'login']),
  // cookies auth
  authToken: z.string().optional(),
  ct0: z.string().optional(),
  // login auth
  username: z.string().optional(),
  password: z.string().optional(),
  disclaimerAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Musisz zaakceptować disclaimer' }),
  }),
  config: z.object({
    timeline: z.enum(['following', 'foryou']).default('following'),
    includeRetweets: z.boolean().default(false),
    includeReplies: z.boolean().default(false),
    includeThreads: z.boolean().default(true),
  }).optional(),
}).refine(
  (data) => data.authMethod === 'cookies'
    ? (data.authToken && data.ct0)
    : (data.username && data.password),
  { message: 'Podaj wymagane dane uwierzytelniające' }
);
```

---

## 7. Error Handling

### 7.1 Error Types

```typescript
// lib/errors.ts

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests', 429, 'RATE_LIMIT');
  }
}
```

### 7.2 API Error Response

```typescript
// app/api/middleware.ts

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          ...(error instanceof ValidationError && { errors: error.errors }),
        },
      },
      { status: error.statusCode }
    );
  }

  console.error('Unexpected error:', error);

  return NextResponse.json(
    {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  );
}
```

---

## 8. Connector Config Schemas (JSON in PrivateSource.config)

### 8.1 Gmail Config
```json
{
  "senders": [
    {
      "email": "newsletter@deeplearning.ai",
      "name": "The Batch",
      "lastSubject": "What's new in ML this week",
      "matchQuery": "from:newsletter@deeplearning.ai"
    }
  ],
  "maxAgeDays": 7,
  "syncInterval": 60,
  "lastSyncMessageId": "18d4f5a2b3c4d5e6"
}
```

### 8.2 LinkedIn Config
```json
{
  "profiles": [
    {
      "publicId": "string",
      "name": "string",
      "headline?": "string",
      "profileUrl": "string"
    }
  ],
  "maxPostsPerProfile": 10
}
```

### 8.3 X/Twitter Config
```json
{
  "timeline": "following",
  "includeRetweets": false,
  "includeReplies": false,
  "includeThreads": true,
  "maxTweets": 100,
  "syncInterval": 180
}
```

---

## 9. Python Microservice Endpoints (scraper/)

### 9.1 Istniejące (Crawl4AI)
| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/scrape` | Scrape URL → markdown |
| GET | `/health` | Health check |

### 9.2 Nowe (LinkedIn)
| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/linkedin/auth` | Login → Voyager session |
| POST | `/linkedin/auth/cookie` | Manual cookie auth |
| POST | `/linkedin/search-profiles` | Wyszukiwanie profili LinkedIn |
| POST | `/linkedin/profile-posts` | Pobieranie postów konkretnego profilu |
| GET | `/linkedin/status` | Sprawdź status sesji |

#### POST /linkedin/search-profiles
**Request:**
```json
{
  "credentials": "encrypted_session_cookies",
  "query": "Andrej Karpathy"
}
```
**Response (200):**
```json
{
  "profiles": [
    {
      "publicId": "karpathy",
      "name": "Andrej Karpathy",
      "headline": "AI @ Tesla, former Research Director @ OpenAI",
      "profileUrl": "https://www.linkedin.com/in/karpathy"
    }
  ]
}
```

#### POST /linkedin/profile-posts
**Request:**
```json
{
  "credentials": "encrypted_session_cookies",
  "profileId": "karpathy",
  "maxPosts": 10
}
```
**Response (200):**
```json
{
  "posts": [
    {
      "id": "urn:li:activity:123",
      "author": { "name": "Andrej Karpathy", "profileId": "karpathy" },
      "content": "Post content in markdown...",
      "publishedAt": "2026-02-08T15:00:00Z",
      "hashtags": ["#AI", "#LLM"],
      "likes": 1234,
      "comments": 56,
      "isRepost": false
    }
  ]
}
```

### 9.3 Nowe (X/Twitter)
| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/twitter/auth` | Login (Twikit) |
| POST | `/twitter/auth/cookies` | Cookie auth (auth_token + ct0) |
| POST | `/twitter/timeline` | Pobierz timeline |
| GET | `/twitter/status` | Sprawdź status sesji |

#### POST /twitter/timeline
**Request:**
```json
{
  "credentials": "encrypted_cookies",
  "timeline": "following",
  "maxTweets": 100,
  "includeRetweets": false,
  "includeReplies": false
}
```
**Response (200):**
```json
{
  "tweets": [
    {
      "id": "1234567890",
      "author": { "name": "Andrej Karpathy", "username": "@karpathy" },
      "content": "Tweet content...",
      "publishedAt": "2026-02-08T15:00:00Z",
      "isRetweet": false,
      "isReply": false,
      "isThread": true,
      "threadTweets": ["..."],
      "likes": 5678,
      "retweets": 890,
      "mediaUrls": []
    }
  ],
  "rateLimit": {
    "remaining": 580,
    "resetAt": "2026-02-08T15:15:00Z"
  }
}
```

---

## 10. Connector Sync Sequence Diagram

### 10.1 Gmail Sync (Node.js native)

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────┐     ┌────────┐
│Scheduler │     │ConnectorSvc  │     │GmailSvc  │     │Gmail API│     │  DB    │
└────┬─────┘     └──────┬───────┘     └────┬─────┘     └────┬────┘     └───┬────┘
     │                  │                   │                │              │
     │ trigger sync     │                   │                │              │
     │─────────────────>│                   │                │              │
     │                  │ decrypt creds     │                │              │
     │                  │─────────┐         │                │              │
     │                  │<────────┘         │                │              │
     │                  │ set SYNCING       │                │              │
     │                  │──────────────────────────────────────────────────>│
     │                  │                   │                │              │
     │                  │ fetchItems()      │                │              │
     │                  │──────────────────>│                │              │
     │                  │                   │ for each sender│              │
     │                  │                   │ from:X query   │              │
     │                  │                   │───────────────>│              │
     │                  │                   │    messages    │              │
     │                  │                   │<───────────────│              │
     │                  │                   │ parse MIME     │              │
     │                  │                   │ → markdown     │              │
     │                  │  articles[]       │                │              │
     │                  │<──────────────────│                │              │
     │                  │                   │                │              │
     │                  │ AI intro+summary  │                │              │
     │                  │ (via aiService)   │                │              │
     │                  │                   │                │              │
     │                  │ save articles     │                │              │
     │                  │──────────────────────────────────────────────────>│
     │                  │ set CONNECTED     │                │              │
     │                  │──────────────────────────────────────────────────>│
```

### 10.2 LinkedIn/Twitter Sync (via Python)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐     ┌────────┐
│Scheduler │     │ConnectorSvc  │     │LinkedInSvc   │     │Python    │     │  DB    │
│          │     │  (Node.js)   │     │  (Node.js)   │     │scraper/  │     │        │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └────┬─────┘     └───┬────┘
     │                  │                    │                   │               │
     │ trigger sync     │                    │                   │               │
     │─────────────────>│                    │                   │               │
     │                  │ set SYNCING        │                   │               │
     │                  │──────────────────────────────────────────────────────>│
     │                  │                    │                   │               │
     │                  │ fetchItems()       │                   │               │
     │                  │───────────────────>│                   │               │
     │                  │                    │ POST /linkedin/   │               │
     │                  │                    │ feed (HTTP)       │               │
     │                  │                    │──────────────────>│               │
     │                  │                    │                   │ Voyager API   │
     │                  │                    │                   │ get_feed()    │
     │                  │                    │    posts[]        │               │
     │                  │                    │<──────────────────│               │
     │                  │  articles[]        │                   │               │
     │                  │<───────────────────│                   │               │
     │                  │                    │                   │               │
     │                  │ AI intro+summary   │                   │               │
     │                  │ save to DB         │                   │               │
     │                  │──────────────────────────────────────────────────────>│
     │                  │ set CONNECTED      │                   │               │
     │                  │──────────────────────────────────────────────────────>│
```

---

## 11. SourceConnector Interface

```typescript
// lib/connectors/connectorInterface.ts

interface AuthResult {
  success: boolean;
  error?: string;
  profileName?: string;  // e.g. Gmail email, LinkedIn name, X username
}

interface ConnectorItem {
  externalId: string;    // Gmail messageId, LinkedIn postId, Tweet id
  url: string;           // Unique URL for dedup
  title: string;
  content: string;       // Markdown
  author?: string;
  publishedAt?: Date;
  metadata?: Record<string, unknown>;  // Source-specific data
}

interface ConnectionStatus {
  status: ConnectorStatus;
  lastSync?: Date;
  articleCount: number;
  error?: string;
}

interface SyncProgress {
  phase: 'senders' | 'messages' | 'parsing' | 'ai';
  current: number;
  total: number;
  currentItem?: string;  // e.g. sender email or article title
}

interface SourceConnector {
  type: PrivateSourceType;

  authenticate(credentials: unknown): Promise<AuthResult>;
  fetchItems(source: PrivateSource): Promise<ConnectorItem[]>;
  validateConfig(config: unknown): boolean;
  getConnectionStatus(source: PrivateSource): Promise<ConnectionStatus>;
  disconnect(source: PrivateSource): Promise<void>;

  // Optional: progress callback for UI
  onProgress?: (progress: SyncProgress) => void;
}
```

---

## 12. Konfiguracja Środowiska

### 8.1 Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/newsroom?schema=public"

# Auth
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Encryption (for stored credentials - AES-256-GCM)
CREDENTIALS_ENCRYPTION_KEY="32-byte-hex-key-for-aes-256-gcm"

# LLM (provider-agnostic, BYO keys)
LLM_PROVIDER="anthropic" # example
LLM_API_KEY="sk-..."
# Example (current implementation):
ANTHROPIC_API_KEY="sk-ant-..."

# TTS (provider-agnostic, BYO keys)
TTS_PROVIDER="edge-tts" # example
TTS_API_KEY=""

# Gmail OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Crawl4AI
SCRAPER_URL="http://localhost:8000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 12.1 Edition Service — Dismiss Integration

### updateEditionCounts(editionId, userId)
Przelicza `articleCount` i `unreadCount` dla wydania z uwzględnieniem dismissed artykułów:
- Query: `articles WHERE dismissedBy.none(userId)` + `readBy WHERE userId`
- Update: `prisma.edition.update({ articleCount, unreadCount })`
- Wywoływana z: `POST/DELETE /api/articles/:id/dismiss`

### getUserEditions — dismissed filter
- Include articles z `where: { dismissedBy: { none: { userId } } }` + `readBy`
- Dynamiczne `articleCount` i `unreadCount` obliczane z przefiltrowanych artykułów
- Select minimalne pola (`id`, `readBy`) aby nie ładować pełnych artykułów

### getEditionWithArticles — dismissed filter
- Dodany `where: { dismissedBy: { none: { userId } } }` do articles query
- Dynamiczne counts z przefiltrowanych artykułów (zamiast DB counts)

## 12.2 Trash Service (trashService.ts)

### cleanupExpiredTrash()
- Cutoff: 15 dni od `dismissedAt`
- Private articles (`privateSourceId NOT NULL`): `prisma.article.deleteMany` (cascade)
- Catalog articles: DismissedArticle record persist (permanently hidden)
- Return: count of deleted articles

### Cron: GET /api/cron/cleanup-trash
- Schedule: `0 1 * * *` (01:00 UTC daily)
- Auth: `Bearer CRON_SECRET`
- Pattern: identyczny z `/api/cron/editions`

---

## 13. Następne Kroki

1. ✅ LLD (ten dokument)
2. ✅ Setup projektu (Next.js, Prisma, PostgreSQL)
3. ✅ Implementacja auth, articles, search, sources, TTS, editions
4. ⏳ **Sprint SI-1:** Connector infrastructure + Gmail OAuth
5. ⏳ **Sprint SI-2:** Gmail content + wizard (3 ścieżki)
6. ⏳ **Sprint SI-3:** Connector dashboard + health monitoring
7. ⏳ **Sprint SI-4:** LinkedIn connector (Voyager API)
8. ⏳ **Sprint SI-5:** X/Twitter connector (Twikit)
9. ⏳ Deployment (Oracle Cloud)
