"use client";

export interface SenderItem {
  email: string;
  name: string;
  messageCount: number;
  lastSubject?: string;
  frequency?: string;
  category?: string;
}

function getInitials(name: string): string {
  return name
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const COLORS = [
  "bg-primary/10 text-primary",
  "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
];

interface GmailSenderListProps {
  senders: SenderItem[];
  selected: Set<string>;
  onToggle: (email: string) => void;
  onSelectAll?: () => void;
  showCategory?: boolean;
}

export function GmailSenderList({
  senders,
  selected,
  onToggle,
  onSelectAll,
  showCategory = false,
}: GmailSenderListProps) {
  return (
    <div className="space-y-2">
      {senders.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {showCategory ? "Wyniki" : "Znalezione dopasowania"} ({senders.length})
          </h3>
          {onSelectAll && (
            <button
              onClick={onSelectAll}
              className="text-xs text-primary font-medium"
            >
              Zaznacz wszystkie
            </button>
          )}
        </div>
      )}

      {senders.map((sender, i) => {
        const isSelected = selected.has(sender.email);
        const colorClass = COLORS[i % COLORS.length];
        const isMarketing = sender.category === "marketing";

        return (
          <label
            key={sender.email}
            className={`flex items-center gap-3 p-3 bg-card rounded-xl border cursor-pointer transition-colors ${
              isSelected
                ? "border-primary/30"
                : isMarketing
                  ? "border-orange-200 dark:border-orange-800 hover:border-orange-300"
                  : "border-border hover:border-primary/30"
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(sender.email)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20"
            />
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${colorClass}`}
            >
              {getInitials(sender.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-foreground text-sm">
                  {sender.name}
                </p>
                {showCategory && sender.category && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                      isMarketing
                        ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {sender.category === "newsletter"
                      ? "Newsletter"
                      : sender.category === "marketing"
                        ? "Marketing"
                        : sender.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {sender.email}
                {sender.frequency ? ` · ${sender.frequency}` : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {sender.messageCount} {sender.messageCount === 1 ? "mail" : "maili"}
            </span>
          </label>
        );
      })}

      {senders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Brak wyników
        </p>
      )}
    </div>
  );
}
