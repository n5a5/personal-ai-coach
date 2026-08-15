"use client";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ background: "rgba(0,0,0,.06)", padding: "2px 5px", borderRadius: 5 }}>{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

export default function MarkdownMessage({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    blocks.push(<ul key={`list-${blocks.length}`} style={{ margin: "8px 0", paddingLeft: 22 }}>{list.map((x, i) => <li key={i} style={{ marginBottom: 5 }}>{renderInline(x)}</li>)}</ul>);
    list = [];
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flush(); return; }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (heading) { flush(); blocks.push(<h3 key={`h-${i}`} style={{ margin: "14px 0 6px", fontSize: heading[1].length === 1 ? 21 : 17 }}>{renderInline(heading[2])}</h3>); return; }
    if (bullet) { list.push(bullet[1]); return; }
    if (numbered) { list.push(numbered[1]); return; }
    flush();
    blocks.push(<p key={`p-${i}`} style={{ margin: "8px 0", lineHeight: 1.6 }}>{renderInline(trimmed)}</p>);
  });
  flush();
  return <div>{blocks}</div>;
}
