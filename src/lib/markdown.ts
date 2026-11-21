/** Minimal DOM → Markdown for the Learn page's "Copy as Markdown" (headings, lists, tables, code, links). */
export interface MdNode {
  nodeType: number; // 1 element, 3 text
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<MdNode>;
  getAttribute?: (n: string) => string | null;
}

const SKIP = new Set(['BUTTON', 'INPUT', 'SVG', 'svg', 'SCRIPT', 'STYLE', 'NAV', 'CANVAS']);
const clean = (s: string) => s.replace(/\s+/g, ' ');

function inline(n: MdNode): string {
  if (n.nodeType === 3) return clean(n.textContent ?? '');
  if (n.nodeType !== 1 || SKIP.has(n.nodeName)) return '';
  const inner = Array.from(n.childNodes, inline).join('');
  switch (n.nodeName) {
    case 'STRONG':
    case 'B':
      return inner.trim() ? `**${inner.trim()}**` : '';
    case 'EM':
    case 'I':
      return inner.trim() ? `*${inner.trim()}*` : '';
    case 'CODE':
    case 'KBD':
      return inner.trim() ? `\`${inner.trim()}\`` : '';
    case 'A': {
      const href = n.getAttribute?.('href') ?? '';
      return /^https?:/.test(href) ? `[${inner.trim()}](${href})` : inner;
    }
    case 'BR':
      return ' ';
    default:
      return inner;
  }
}

function block(n: MdNode, out: string[]) {
  if (n.nodeType === 3) {
    const t = clean(n.textContent ?? '').trim();
    if (t) out.push(t);
    return;
  }
  if (n.nodeType !== 1 || SKIP.has(n.nodeName)) return;
  const kids = Array.from(n.childNodes);
  const h = /^H([1-6])$/.exec(n.nodeName);
  if (h) return void out.push(`${'#'.repeat(+h[1]!)} ${inline(n).trim()}`);
  switch (n.nodeName) {
    case 'P':
      return void out.push(inline(n).trim());
    case 'UL':
    case 'OL':
      return void out.push(
        kids
          .filter((k) => k.nodeName === 'LI')
          .map((li, i) => `${n.nodeName === 'OL' ? `${i + 1}.` : '-'} ${inline(li).trim()}`)
          .join('\n'),
      );
    case 'PRE':
      return void out.push('```\n' + (n.textContent ?? '').trim() + '\n```');
    case 'TABLE': {
      const rows: string[][] = [];
      const walk = (x: MdNode) => {
        if (x.nodeName === 'TR') rows.push(Array.from(x.childNodes).filter((c) => c.nodeName === 'TD' || c.nodeName === 'TH').map((c) => inline(c).trim().replace(/\|/g, '\\|')));
        else Array.from(x.childNodes).forEach(walk);
      };
      walk(n);
      if (!rows.length) return;
      const w = Math.max(...rows.map((r) => r.length));
      const line = (r: string[]) => `| ${Array.from({ length: w }, (_, i) => r[i] ?? '').join(' | ')} |`;
      return void out.push([line(rows[0]!), `|${' --- |'.repeat(w)}`, ...rows.slice(1).map(line)].join('\n'));
    }
    default: {
      // inline-only containers become a paragraph; containers of blocks recurse
      const hasBlock = kids.some((k) => k.nodeType === 1 && /^(P|UL|OL|TABLE|PRE|DIV|SECTION|ARTICLE|H[1-6]|DETAILS|FIGURE|HEADER|FOOTER|LI|DL)$/.test(k.nodeName));
      if (!hasBlock) {
        const t = inline(n).trim();
        if (t) out.push(t);
      } else kids.forEach((k) => block(k, out));
    }
  }
}

export function toMarkdown(root: MdNode): string {
  const out: string[] = [];
  block(root, out);
  return out.filter(Boolean).join('\n\n') + '\n';
}
