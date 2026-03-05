import * as cheerio from "cheerio";

interface MimePart {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: MimePart[] | null;
}

/**
 * Recursively extract text/html body from MIME multipart payload.
 * Falls back to text/plain if no HTML part is found.
 */
export function extractBodyFromMime(payload: MimePart): {
  html: string | null;
  plain: string | null;
} {
  let html: string | null = null;
  let plain: string | null = null;

  function walk(part: MimePart) {
    if (part.mimeType === "text/html" && part.body?.data) {
      html = Buffer.from(part.body.data, "base64").toString("utf8");
    } else if (part.mimeType === "text/plain" && part.body?.data && !plain) {
      plain = Buffer.from(part.body.data, "base64").toString("utf8");
    }

    if (part.parts) {
      for (const child of part.parts) {
        walk(child);
      }
    }
  }

  // Top-level body (non-multipart emails)
  if (payload.body?.data && payload.mimeType) {
    if (payload.mimeType === "text/html") {
      html = Buffer.from(payload.body.data, "base64").toString("utf8");
    } else if (payload.mimeType === "text/plain") {
      plain = Buffer.from(payload.body.data, "base64").toString("utf8");
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      walk(part);
    }
  }

  return { html, plain };
}

/**
 * Convert HTML email content to clean markdown-like text.
 * Strips tracking pixels, scripts, styles, and email chrome.
 */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $("script, style, head, title, meta, link, noscript").remove();

  // Remove tracking pixels (1x1 images)
  $("img").each((_, el) => {
    const $el = $(el);
    const width = $el.attr("width");
    const height = $el.attr("height");
    if (
      (width === "1" && height === "1") ||
      (width === "0" && height === "0") ||
      $el.attr("src")?.includes("track") ||
      $el.attr("src")?.includes("pixel") ||
      $el.attr("src")?.includes("beacon") ||
      $el.attr("src")?.includes("open.") ||
      $el.attr("src")?.includes("/o/")
    ) {
      $el.remove();
    }
  });

  // Remove unsubscribe links and footer-like elements
  $("a").each((_, el) => {
    const $el = $(el);
    const href = ($el.attr("href") || "").toLowerCase();
    const text = $el.text().toLowerCase();
    if (
      href.includes("unsubscribe") ||
      href.includes("optout") ||
      href.includes("opt-out") ||
      href.includes("manage-preferences") ||
      text.includes("unsubscribe") ||
      text.includes("wypisz") ||
      text.includes("rezygnuj")
    ) {
      $el.remove();
    }
  });

  // Convert headers to markdown
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const $el = $(el);
    const level = parseInt(el.tagName.slice(1));
    const prefix = "#".repeat(level);
    $el.replaceWith(`\n${prefix} ${$el.text().trim()}\n`);
  });

  // Convert links to markdown
  $("a").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href") || "";
    const text = $el.text().trim();
    if (text && href && !href.startsWith("mailto:")) {
      $el.replaceWith(`[${text}](${href})`);
    } else if (text) {
      $el.replaceWith(text);
    }
  });

  // Convert bold/strong
  $("b, strong").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (text) $el.replaceWith(`**${text}**`);
  });

  // Convert italic/em
  $("i, em").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (text) $el.replaceWith(`*${text}*`);
  });

  // Convert list items
  $("li").each((_, el) => {
    const $el = $(el);
    $el.replaceWith(`\n- ${$el.text().trim()}`);
  });

  // Convert blockquotes
  $("blockquote").each((_, el) => {
    const $el = $(el);
    const lines = $el
      .text()
      .trim()
      .split("\n")
      .map((l) => `> ${l.trim()}`)
      .join("\n");
    $el.replaceWith(`\n${lines}\n`);
  });

  // Add line breaks for block elements
  $("p, div, br, tr, hr").each((_, el) => {
    const $el = $(el);
    if (el.tagName === "br" || el.tagName === "hr") {
      $el.replaceWith("\n");
    } else {
      $el.append("\n");
    }
  });

  // Extract text
  const text = $("body").text() || $.text();

  return cleanEmailContent(text);
}

/**
 * Clean extracted email text: remove excessive whitespace,
 * email footers, and common newsletter boilerplate.
 */
export function cleanEmailContent(text: string): string {
  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove common email footer patterns
  const footerPatterns = [
    /^[-_=]{3,}[\s\S]*$/m, // Lines starting with --- or === often mark footer
    /(?:you(?:'re| are) receiving this|you received this)[\s\S]*$/im,
    /(?:this email was sent|sent to)[\s\S]*$/im,
    /(?:view (?:this )?(?:email )?in (?:your )?browser)[\s\S]*$/im,
    /(?:add us to your address book)[\s\S]*$/im,
    /(?:copyright|©)\s*\d{4}[\s\S]*$/im,
    /(?:all rights reserved)[\s\S]*$/im,
    /(?:privacy policy|terms of (?:service|use))[\s\S]*$/im,
    /(?:update (?:your )?preferences)[\s\S]*$/im,
  ];

  for (const pattern of footerPatterns) {
    text = text.replace(pattern, "");
  }

  // Collapse multiple blank lines to max 2
  text = text.replace(/\n{3,}/g, "\n\n");

  // Remove leading/trailing whitespace from each line
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  // Remove leading/trailing blank lines
  text = text.trim();

  return text;
}
