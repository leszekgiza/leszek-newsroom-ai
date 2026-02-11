"use client";

interface ConnectorSyncProgressProps {
  sendersCurrent?: number;
  sendersTotal?: number;
  messagesCurrent?: number;
  messagesTotal?: number;
  currentLabel?: string;
}

export function ConnectorSyncProgress({
  sendersCurrent = 0,
  sendersTotal = 0,
  messagesCurrent = 0,
  messagesTotal = 0,
  currentLabel,
}: ConnectorSyncProgressProps) {
  const sendersPercent =
    sendersTotal > 0 ? Math.round((sendersCurrent / sendersTotal) * 100) : 0;
  const messagesPercent =
    messagesTotal > 0
      ? Math.round((messagesCurrent / messagesTotal) * 100)
      : 0;

  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Nadawcy</span>
          <span className="text-foreground font-medium">
            {sendersCurrent}/{sendersTotal}
          </span>
        </div>
        <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${sendersPercent}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Maile</span>
          <span className="text-foreground font-medium">
            {messagesCurrent}/{messagesTotal}
          </span>
        </div>
        <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${messagesPercent}%` }}
          />
        </div>
      </div>
      {currentLabel && (
        <p className="text-xs text-muted-foreground truncate">{currentLabel}</p>
      )}
    </div>
  );
}
