function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeUrl(url: string): string {
  const value = String(url || "").trim();
  if (!value) return "#";

  if (value.startsWith("ipfs://")) {
    const hash = value.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${hash}`;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return "#";
}

function renderInline(input: string): string {
  let output = escapeHtml(input);

  output = output.replace(/`([^`]+)`/g, (_match, code) => {
    return `<code class="rounded-sm bg-gray-100 px-1 py-0.5 font-mono text-[0.9em] text-gray-800 dark:bg-gray-800 dark:text-gray-200">${code}</code>`;
  });

  output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const safeUrl = normalizeUrl(url);
    const safeAlt = escapeHtml(String(alt || "").trim());
    if (safeUrl === "#") return "";
    return `<img src="${safeUrl}" alt="${safeAlt}" class="my-4 w-full rounded-sm border border-gray-200 dark:border-gray-700" />`;
  });

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = normalizeUrl(url);
    const safeLabel = String(label || "");
    if (safeUrl === "#") return safeLabel;
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-500">${safeLabel}</a>`;
  });

  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/~~([^~]+)~~/g, "<s>$1</s>");

  return output;
}

function isSpecialLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (/^>\s?/.test(trimmed)) return true;
  if (/^[-*]\s+/.test(trimmed)) return true;
  if (/^\d+\.\s+/.test(trimmed)) return true;
  if (/^__CODEBLOCK_\d+__$/.test(trimmed)) return true;
  return false;
}

export function renderMarkdownToHtml(markdown: string): string {
  const source = String(markdown || "");
  const codeBlocks: string[] = [];

  const withCodePlaceholders = source.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    const language = String(lang || "").trim();
    const html = `<pre class="my-4 overflow-x-auto rounded-sm border border-gray-200 bg-gray-950 p-4 text-xs leading-relaxed text-gray-100 dark:border-gray-700"><code data-lang="${escapeHtml(language)}">${escapeHtml(code)}</code></pre>`;
    const token = `__CODEBLOCK_${codeBlocks.length}__`;
    codeBlocks.push(html);
    return token;
  });

  const lines = withCodePlaceholders.split("\n");
  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^__CODEBLOCK_\d+__$/.test(trimmed)) {
      htmlParts.push(trimmed);
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2]);
      const sizes = [
        "text-3xl",
        "text-2xl",
        "text-xl",
        "text-lg",
        "text-base",
        "text-sm",
      ];
      htmlParts.push(`<h${level} class="mt-6 mb-3 font-bold ${sizes[level - 1]} text-gray-900 dark:text-white">${text}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote = renderInline(trimmed.replace(/^>\s?/, ""));
      htmlParts.push(`<blockquote class="my-4 border-l-4 border-blue-500 bg-blue-50/60 px-4 py-2 text-sm text-gray-700 dark:border-blue-400 dark:bg-blue-950/20 dark:text-gray-200">${quote}</blockquote>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      htmlParts.push(`<ul class="my-3 list-disc space-y-1 pl-6 text-gray-800 dark:text-gray-100">${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      htmlParts.push(`<ol class="my-3 list-decimal space-y-1 pl-6 text-gray-800 dark:text-gray-100">${items.join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      if (isSpecialLine(next)) break;
      paragraph.push(next.trim());
      i += 1;
    }
    htmlParts.push(`<p class="my-3 leading-7 text-gray-700 dark:text-gray-200">${renderInline(paragraph.join(" "))}</p>`);
  }

  let html = htmlParts.join("\n");
  html = html.replace(/__CODEBLOCK_(\d+)__/g, (_match, idx) => {
    const index = Number(idx);
    return codeBlocks[index] || "";
  });
  return html;
}

export function markdownToPlainText(markdown: string): string {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1 ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ")
    .replace(/[#>*_\-\[\]\(\)!~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
