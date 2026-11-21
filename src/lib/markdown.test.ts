import { describe, expect, it } from 'vitest';
import { toMarkdown, type MdNode } from './markdown';

const t = (s: string): MdNode => ({ nodeType: 3, nodeName: '#text', textContent: s, childNodes: [] });
const e = (name: string, kids: MdNode[] = [], attrs: Record<string, string> = {}): MdNode => ({ nodeType: 1, nodeName: name, textContent: kids.map((k) => k.textContent).join(''), childNodes: kids, getAttribute: (n) => attrs[n] ?? null });

describe('toMarkdown', () => {
  it('converts headings, paragraphs, inline formatting, lists and tables', () => {
    const doc = e('SECTION', [
      e('H2', [t('DNS')]),
      e('P', [t('The '), e('STRONG', [t('phone book')]), t(' of the '), e('A', [t('internet')], { href: 'https://example.org' }), t(', port '), e('CODE', [t('53')]), t('.')]),
      e('UL', [e('LI', [t('A record')]), e('LI', [t('AAAA record')])]),
      e('TABLE', [e('THEAD', [e('TR', [e('TH', [t('Code')]), e('TH', [t('Name')])])]), e('TBODY', [e('TR', [e('TD', [t('3')]), e('TD', [t('NXDOMAIN')])])])]),
      e('BUTTON', [t('Copy')]),
    ]);
    expect(toMarkdown(doc)).toBe(
      '## DNS\n\nThe **phone book** of the [internet](https://example.org), port `53`.\n\n- A record\n- AAAA record\n\n| Code | Name |\n| --- | --- |\n| 3 | NXDOMAIN |\n',
    );
  });
});
