# Leszek Newsroom AI - Low-Level Design (LLD)

**Wersja:** 1.0
**Data:** 2025-12-28
**Status:** Draft

---

## 1. Schemat Bazy Danych

### 1.1 Diagram ERD

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      users      │       │     sources     │       │    articles     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ email           │  │    │ user_id (FK)    │◄─┘    │ source_id (FK)  │◄─┐
│ password_hash   │  │    │ name            │       │ url (UNIQUE)    │  │
│ name            │  │    │ url             │       │ title           │  │
│ avatar_url      │  │    │ type            │       │ intro           │  │
│ theme           │  │    │ config          │       │ summary         │  │
│ created_at      │  │    │ is_active       │       │ image_url       │  │
│ updated_at      │  │    │ last_scraped_at │       │ author          │  │
└─────────────────┘  │    │ created_at      │       │ published_at    │  │
         │           │    └─────────────────┘       │ scraped_at      │  │
         │           │                              │ search_vector   │  │
         │           │                              │ created_at      │  │
         │           │                              └─────────────────┘  │
         │           │                                       │           │
         │           │    ┌─────────────────┐                │           │
         │           │    │  saved_articles │                │           │
         │           │    ├─────────────────┤                │           │
         │           └───▶│ user_id (FK)    │                │           │
         │                │ article_id (FK) │◄───────────────┘           │
         │                │ saved_at        │                            │
         │                └─────────────────┘                            │
         │                                                               │
         │           ┌─────────────────┐       ┌─────────────────┐      │
         │           │  read_articles  │       │  integrations   │      │
         │           ├─────────────────┤       ├─────────────────┤      │
         └──────────▶│ user_id (FK)    │       │ id (PK)         │      │
                     │ article_id (FK) │◄──────│ user_id (FK)    │◄─────┘
                     │ read_at         │       │ type            │
                     └─────────────────┘       │ config          │
                                               │ credentials     │
                                               │ last_synced_at  │
                                               │ created_at      │
                                               └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│ hidden_sources  │       │    sessions     │
├─────────────────┤       ├─────────────────┤
│ user_id (FK)    │       │ id (PK)         │
│ source_id (FK)  │       │ user_id (FK)    │
│ hidden_at       │       │ token           │
└─────────────────┘       │ expires_at      │
                          │ created_at      │
                          └─────────────────┘
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
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  avatarUrl    String?  @map("avatar_url")
  theme        Theme    @default(SYSTEM)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  sources        Source[]
  savedArticles  SavedArticle[]
  readArticles   ReadArticle[]
  integrations   Integration[]
  hiddenSources  HiddenSource[]
  sessions       Session[]

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

// ============================================
// SOURCES
// ============================================

model Source {
  id            String      @id @default(cuid())
  userId        String      @map("user_id")
  name          String
  url           String
  type          SourceType  @default(WEBSITE)
  config        Json?       // CSS selectors, auth config, etc.
  isActive      Boolean     @default(true) @map("is_active")
  lastScrapedAt DateTime?   @map("last_scraped_at")
  createdAt     DateTime    @default(now()) @map("created_at")

  // Relations
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  articles Article[]
  hiddenBy HiddenSource[]

  @@unique([userId, url])
  @@map("sources")
}

model HiddenSource {
  userId   String   @map("user_id")
  sourceId String   @map("source_id")
  hiddenAt DateTime @default(now()) @map("hidden_at")

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  source Source @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@id([userId, sourceId])
  @@map("hidden_sources")
}

enum SourceType {
  WEBSITE
  GMAIL
  LINKEDIN
  TWITTER
  RSS
}

// ============================================
// ARTICLES
// ============================================

model Article {
  id           String                  @id @default(cuid())
  sourceId     String                  @map("source_id")
  url          String                  @unique
  title        String
  intro        String?                 // 2-sentence AI intro
  summary      String?                 // Full AI summary
  imageUrl     String?                 @map("image_url")
  author       String?
  publishedAt  DateTime?               @map("published_at")
  scrapedAt    DateTime                @default(now()) @map("scraped_at")
  createdAt    DateTime                @default(now()) @map("created_at")

  // Full-text search vector (auto-updated by trigger)
  // searchVector Unsupported("tsvector")? @map("search_vector")

  // Relations
  source  Source         @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  savedBy SavedArticle[]
  readBy  ReadArticle[]

  @@index([sourceId])
  @@index([publishedAt(sort: Desc)])
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

// ============================================
// INTEGRATIONS
// ============================================

model Integration {
  id           String          @id @default(cuid())
  userId       String          @map("user_id")
  type         IntegrationType
  config       Json?           // Hashtags, senders, etc.
  credentials  String?         // Encrypted (OAuth tokens, li_at cookie)
  lastSyncedAt DateTime?       @map("last_synced_at")
  createdAt    DateTime        @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
  @@map("integrations")
}

enum IntegrationType {
  GMAIL
  LINKEDIN
  TWITTER
}
```

### 1.3 Migracja Full-Text Search (SQL)

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
| POST | `/api/auth/register` | Rejestracja | - |
| POST | `/api/auth/login` | Logowanie | - |
| POST | `/api/auth/logout` | Wylogowanie | ✓ |
| POST | `/api/auth/reset-password` | Reset hasła | - |
| GET | `/api/articles` | Lista artykułów | ✓ |
| GET | `/api/articles/:id` | Szczegóły artykułu | ✓ |
| POST | `/api/articles/:id/read` | Oznacz jako przeczytany | ✓ |
| GET | `/api/articles/search` | Wyszukiwanie FTS | ✓ |
| GET | `/api/saved` | Zapisane artykuły | ✓ |
| POST | `/api/saved/:articleId` | Zapisz artykuł | ✓ |
| DELETE | `/api/saved/:articleId` | Usuń z zapisanych | ✓ |
| GET | `/api/sources` | Lista źródeł | ✓ |
| POST | `/api/sources` | Dodaj źródło | ✓ |
| PUT | `/api/sources/:id` | Edytuj źródło | ✓ |
| DELETE | `/api/sources/:id` | Usuń źródło | ✓ |
| POST | `/api/sources/:id/hide` | Ukryj źródło | ✓ |
| POST | `/api/sources/:id/unhide` | Pokaż źródło | ✓ |
| GET | `/api/integrations` | Lista integracji | ✓ |
| POST | `/api/integrations/gmail` | Połącz Gmail | ✓ |
| POST | `/api/integrations/linkedin` | Połącz LinkedIn | ✓ |
| DELETE | `/api/integrations/:type` | Rozłącz integrację | ✓ |
| POST | `/api/tts` | Generuj audio TTS | ✓ |
| GET | `/api/user/settings` | Pobierz ustawienia | ✓ |
| PUT | `/api/user/settings` | Zapisz ustawienia | ✓ |

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
| `en-US-AriaNeural` | English | Female |
| `en-US-GuyNeural` | English | Male |

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

#### POST /api/integrations/gmail

**Request:**
```json
{
  "authCode": "4/0AY0e-g7...",  // OAuth authorization code
  "config": {
    "senders": [
      "newsletter@deeplearning.ai",
      "hello@changelog.com"
    ],
    "autoSync": true
  }
}
```

**Response (200):**
```json
{
  "integration": {
    "type": "GMAIL",
    "isConnected": true,
    "email": "user@gmail.com",
    "config": { ... }
  }
}
```

---

#### POST /api/integrations/linkedin

**Request:**
```json
{
  "liAtCookie": "AQED...",
  "config": {
    "hashtags": ["#AI", "#MachineLearning", "#LLM"],
    "people": [
      { "name": "Andrej Karpathy", "profileId": "karpathy" },
      { "name": "Yann LeCun", "profileId": "yann-lecun" }
    ]
  }
}
```

**Response (200):**
```json
{
  "integration": {
    "type": "LINKEDIN",
    "isConnected": true,
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
│   ├── integrations/             # Integration components
│   │   ├── IntegrationCard.tsx
│   │   ├── GmailConfig.tsx
│   │   ├── LinkedInConfig.tsx
│   │   └── TwitterConfig.tsx
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
└── services/                     # Backend services
    ├── articleService.ts
    ├── scrapeService.ts
    ├── summaryService.ts
    ├── ttsService.ts
    ├── searchService.ts
    ├── gmailService.ts
    └── linkedinService.ts
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
    'en-US-AriaNeural',
    'en-US-GuyNeural',
  ]).default('pl-PL-ZofiaNeural'),
  rate: z.number().min(0.5).max(2).default(1),
});

// LinkedIn Integration
export const linkedinConfigSchema = z.object({
  liAtCookie: z.string().min(10, 'Nieprawidłowy cookie li_at'),
  config: z.object({
    hashtags: z.array(z.string().startsWith('#')).max(10),
    people: z.array(z.object({
      name: z.string(),
      profileId: z.string(),
    })).max(20),
  }),
});
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

## 8. Konfiguracja Środowiska

### 8.1 Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/newsroom?schema=public"

# Auth
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
SESSION_COOKIE_NAME="newsroom_session"

# Encryption (for stored credentials)
ENCRYPTION_KEY="32-byte-hex-key-for-aes-256"

# Claude API
ANTHROPIC_API_KEY="sk-ant-..."

# Gmail OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Crawl4AI
CRAWL4AI_URL="http://localhost:8000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 9. Następne Kroki

1. ✅ LLD (ten dokument)
2. ⏳ Setup projektu (Next.js, Prisma, PostgreSQL)
3. ⏳ Implementacja auth (register, login, logout)
4. ⏳ Implementacja articles (list, search, save)
5. ⏳ Implementacja sources (CRUD)
6. ⏳ Implementacja TTS
7. ⏳ Implementacja integrations (Gmail, LinkedIn)
8. ⏳ Deployment (Oracle Cloud)
