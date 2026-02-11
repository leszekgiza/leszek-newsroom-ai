import type { PrivateSourceType } from "@prisma/client";
import type { SourceConnector } from "./types";

const connectorCache = new Map<string, SourceConnector>();

export async function getConnector(
  type: PrivateSourceType
): Promise<SourceConnector> {
  const cached = connectorCache.get(type);
  if (cached) return cached;

  let connector: SourceConnector;

  switch (type) {
    case "GMAIL": {
      const { GmailConnector } = await import("./gmail/connector");
      connector = new GmailConnector();
      break;
    }
    case "LINKEDIN": {
      const { LinkedInConnector } = await import("./linkedin/connector");
      connector = new LinkedInConnector();
      break;
    }
    case "TWITTER": {
      const { TwitterConnector } = await import("./twitter/connector");
      connector = new TwitterConnector();
      break;
    }
    default:
      throw new Error(`No connector implemented for source type: ${type}`);
  }

  connectorCache.set(type, connector);
  return connector;
}
