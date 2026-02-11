import { google } from "googleapis";

export interface SenderInfo {
  email: string;
  name: string;
  lastSubject: string;
  messageCount: number;
  frequency: string; // "daily", "weekly", "occasional"
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: Date;
  snippet: string;
  body: string;
}

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

/**
 * Search messages from a specific sender in the last 30 days.
 */
export async function searchSender(
  accessToken: string,
  email: string
): Promise<SenderInfo> {
  const gmail = getGmailClient(accessToken);

  const res = await gmail.users.messages.list({
    userId: "me",
    q: `from:${email} newer_than:30d`,
    maxResults: 50,
  });

  const messages = res.data.messages || [];
  let name = email;
  let lastSubject = "";

  if (messages.length > 0) {
    const firstMsg = await gmail.users.messages.get({
      userId: "me",
      id: messages[0].id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject"],
    });

    const headers = firstMsg.data.payload?.headers || [];
    const fromHeader = headers.find((h) => h.name === "From")?.value || email;
    lastSubject = headers.find((h) => h.name === "Subject")?.value || "";

    // Extract name from "Name <email>" format
    const nameMatch = fromHeader.match(/^(.+?)\s*<.+>$/);
    if (nameMatch) {
      name = nameMatch[1].replace(/"/g, "").trim();
    }
  }

  const count = messages.length;
  let frequency: SenderInfo["frequency"] = "occasional";
  if (count >= 25) frequency = "daily";
  else if (count >= 4) frequency = "weekly";

  return { email, name, lastSubject, messageCount: count, frequency };
}

/**
 * Fetch messages matching a query.
 */
export async function fetchMessages(
  accessToken: string,
  query: string,
  maxResults: number = 20
): Promise<GmailMessage[]> {
  const gmail = getGmailClient(accessToken);

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messageIds = listRes.data.messages || [];
  if (messageIds.length === 0) return [];

  const results: GmailMessage[] = [];

  for (const msg of messageIds) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const headers = detail.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const dateStr = headers.find((h) => h.name === "Date")?.value || "";

    // Extract plain text body
    let body = "";
    const payload = detail.data.payload;
    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, "base64").toString("utf8");
    } else if (payload?.parts) {
      const textPart = payload.parts.find(
        (p) => p.mimeType === "text/plain"
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf8");
      }
    }

    results.push({
      id: detail.data.id!,
      threadId: detail.data.threadId!,
      subject,
      from,
      date: new Date(dateStr),
      snippet: detail.data.snippet || "",
      body,
    });
  }

  return results;
}

/**
 * List unique senders from the last 30 days, grouped by email.
 */
export async function listSenders(
  accessToken: string
): Promise<SenderInfo[]> {
  const gmail = getGmailClient(accessToken);

  const res = await gmail.users.messages.list({
    userId: "me",
    q: "newer_than:30d category:updates OR category:promotions",
    maxResults: 100,
  });

  const messageIds = res.data.messages || [];
  if (messageIds.length === 0) return [];

  const senderMap = new Map<
    string,
    { name: string; count: number; lastSubject: string }
  >();

  for (const msg of messageIds) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject"],
    });

    const headers = detail.data.payload?.headers || [];
    const fromHeader = headers.find((h) => h.name === "From")?.value || "";
    const subject = headers.find((h) => h.name === "Subject")?.value || "";

    // Extract email from "Name <email>" format
    const emailMatch = fromHeader.match(/<(.+?)>/);
    const email = emailMatch ? emailMatch[1] : fromHeader;
    const nameMatch = fromHeader.match(/^(.+?)\s*<.+>$/);
    const name = nameMatch
      ? nameMatch[1].replace(/"/g, "").trim()
      : email;

    const existing = senderMap.get(email);
    if (existing) {
      existing.count++;
    } else {
      senderMap.set(email, { name, count: 1, lastSubject: subject });
    }
  }

  return Array.from(senderMap.entries())
    .map(([email, data]) => {
      let frequency: SenderInfo["frequency"] = "occasional";
      if (data.count >= 25) frequency = "daily";
      else if (data.count >= 4) frequency = "weekly";

      return {
        email,
        name: data.name,
        lastSubject: data.lastSubject,
        messageCount: data.count,
        frequency,
      };
    })
    .sort((a, b) => b.messageCount - a.messageCount);
}
