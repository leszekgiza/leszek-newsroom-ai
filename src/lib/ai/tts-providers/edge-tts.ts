/**
 * Edge TTS adapter — direct WebSocket implementation.
 *
 * Uses the same protocol as Microsoft Edge's Read Aloud feature.
 * Replaces the edge-tts-universal package which had an outdated
 * Chrome version causing 403 errors.
 */

import WebSocket from "ws";
import { createHash, randomUUID } from "crypto";
import type { TTSProvider } from "@/lib/ai/tts";
import { isValidVoice, DEFAULT_TTS_VOICE } from "@/lib/config";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(".")[0];
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

const BASE_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";

const WSS_HEADERS = {
  "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
};

const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;
const CONNECTION_TIMEOUT_MS = 10_000;

function generateSecMsGec(): string {
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const input = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  return createHash("sha256").update(input, "ascii").digest("hex").toUpperCase();
}

function connectId(): string {
  return randomUUID().replace(/-/g, "");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Convert short voice name (pl-PL-MarekNeural) to full SSML name. */
function toFullVoiceName(voice: string): string {
  const match = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(voice);
  if (!match) return voice;
  const [, lang, region, name] = match;
  return `Microsoft Server Speech Text to Speech Voice (${lang}-${region}, ${name})`;
}

function buildSsml(text: string, voice: string): string {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`;
}

function timestamp(): string {
  return new Date()
    .toUTCString()
    .replace("GMT", "GMT+0000 (Coordinated Universal Time)");
}

async function synthesizeViaWebSocket(
  text: string,
  voice: string
): Promise<Buffer> {
  const secMsGec = generateSecMsGec();
  const connId = connectId();
  const url = `${BASE_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connId}`;

  return new Promise<Buffer>((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    let settled = false;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(connTimer);
      try { ws.close(); } catch { /* ignore */ }
      if (err) return reject(err);
      if (audioChunks.length === 0) return reject(new Error("No audio received"));
      resolve(Buffer.concat(audioChunks));
    };

    const ws = new WebSocket(url, { headers: WSS_HEADERS });

    const connTimer = setTimeout(() => {
      finish(new Error(`Edge TTS connection timeout after ${CONNECTION_TIMEOUT_MS}ms`));
      ws.terminate();
    }, CONNECTION_TIMEOUT_MS);

    ws.on("open", () => {
      clearTimeout(connTimer);

      // 1. Speech config
      ws.send(
        `X-Timestamp:${timestamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`
      );

      // 2. SSML request
      const reqId = connectId();
      const ssml = buildSsml(text, voice);
      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp()}Z\r\nPath:ssml\r\n\r\n${ssml}`
      );
    });

    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        // Text message — check for turn.end
        const msg = data.toString("utf-8");
        if (msg.includes("Path:turn.end")) {
          finish();
        }
        return;
      }

      // Binary message — extract audio data
      if (data.length < 2) return;
      const headerLen = data.readUInt16BE(0);
      if (data.length <= headerLen + 2) return;

      const headerStr = data.subarray(2, headerLen + 2).toString("utf-8");
      if (!headerStr.includes("Path:audio") || !headerStr.includes("Content-Type:audio/mpeg")) return;

      const audioData = data.subarray(headerLen + 2);
      if (audioData.length > 0) {
        audioChunks.push(Buffer.from(audioData));
      }
    });

    ws.on("error", (err: Error) => {
      finish(new Error(`Edge TTS WebSocket error: ${err.message}`));
    });

    ws.on("close", () => {
      finish(audioChunks.length > 0 ? undefined : new Error("WebSocket closed without audio"));
    });
  });
}

export class EdgeTTSProvider implements TTSProvider {
  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    const selectedVoice = isValidVoice(voice) ? voice : DEFAULT_TTS_VOICE;
    const fullVoice = toFullVoiceName(selectedVoice);
    try {
      const buffer = await synthesizeViaWebSocket(text, fullVoice);
      if (buffer.byteLength === 0) {
        throw new Error("Edge TTS returned empty audio buffer");
      }
      const ab = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      return ab as ArrayBuffer;
    } catch (error) {
      console.error("EdgeTTS synthesis failed:", {
        voice: selectedVoice,
        textLength: text.length,
        error,
      });
      throw error;
    }
  }
}
