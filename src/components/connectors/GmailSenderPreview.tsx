"use client";

interface GmailSenderPreviewProps {
  name: string;
  email: string;
  lastSubject?: string;
  lastDate?: string;
  frequency?: string;
  messageCount?: number;
  onAdd: () => void;
}

function getInitials(name: string): string {
  return name
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function GmailSenderPreview({
  name,
  email,
  lastSubject,
  lastDate,
  frequency,
  messageCount,
  onAdd,
}: GmailSenderPreviewProps) {
  return (
    <div className="bg-card rounded-2xl border-2 border-primary/30 p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
          Znaleziono
        </span>
      </div>

      <div className="bg-muted/10 rounded-xl p-3 space-y-2">
        {lastSubject && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ostatni email:</span>
            <span className="text-foreground font-medium truncate ml-2 max-w-[60%] text-right">
              &ldquo;{lastSubject}&rdquo;
            </span>
          </div>
        )}
        {lastDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Data:</span>
            <span className="text-foreground">{lastDate}</span>
          </div>
        )}
        {frequency && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Częstotliwość:</span>
            <span className="text-foreground">{frequency}</span>
          </div>
        )}
        {messageCount !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Maili w 30 dni:</span>
            <span className="text-foreground font-medium">{messageCount}</span>
          </div>
        )}
      </div>

      <button
        onClick={onAdd}
        className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Dodaj do importu
      </button>
    </div>
  );
}
