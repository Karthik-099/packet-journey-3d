import { JOURNEYS } from '../content';
import { CONCEPTS } from '../content/concepts';
import { PORTS } from '../content/reference/ports';
import { HTTP_STATUS } from '../content/reference/http-status';
import { PROTOCOLS } from '../content/reference/protocols';
import { DEEP } from '../content/reference/deep';
import { FACT_GROUPS } from '../content/reference/atlas';
import { PROVIDER_GROUPS } from '../content/reference/providers';

export interface Hit {
  title: string;
  sub: string;
  href: string;
  kind: string;
}

const B = import.meta.env.BASE_URL;

/** Everything searchable on the site, built from the same content the pages render. */
export function buildIndex(): Hit[] {
  return [
    ...Object.values(JOURNEYS).flatMap((j) => j.steps.map((s) => ({ title: s.title, sub: s.short, href: `${B}app.html#${s.id}`, kind: 'Journey step' }))),
    ...PORTS.map((p) => ({ title: `Port ${p.port} · ${p.service}`, sub: `${p.proto} · ${p.use}`, href: `${B}learn.html#ports`, kind: 'Port' })),
    ...HTTP_STATUS.map((s) => ({ title: `${s.code} ${s.name}`, sub: s.meaning, href: `${B}learn.html#http`, kind: 'HTTP status' })),
    ...PROTOCOLS.map((p) => ({ title: p.name, sub: `${p.layer} · ${p.what}`, href: `${B}learn.html#protocols`, kind: 'Protocol' })),
    ...DEEP.map((d) => ({ title: d.name, sub: d.summary, href: `${B}learn.html#p-${d.id}`, kind: 'Protocol guide' })),
    ...CONCEPTS.map((c) => ({ title: c.term, sub: c.short, href: `${B}learn.html#glossary`, kind: 'Concept' })),
    ...FACT_GROUPS.flatMap((g) => g.facts.map((f) => ({ title: `${f.value} ${f.label}`, sub: `${f.source}, ${f.asOf}`, href: `${B}atlas.html#${g.id}`, kind: 'Internet fact' }))),
    ...PROVIDER_GROUPS.flatMap((g) => g.items.map((p) => ({ title: p.name, sub: `${p.hq}${p.asn ? ` · ${p.asn}` : ''} · ${p.note}`, href: `${B}atlas.html#directory`, kind: g.title }))),
    { title: 'Packet Lab', sub: 'Open a .pcap / .pcapng capture', href: `${B}lab.html`, kind: 'Page' },
    { title: 'Internet Atlas', sub: 'The internet by the numbers', href: `${B}atlas.html`, kind: 'Page' },
    { title: 'Network calculators', sub: 'Bandwidth-delay product, transfer time, distance → latency', href: `${B}learn.html#calculators`, kind: 'Tool' },
    { title: 'Videos & reading', sub: 'Curated videos, books and tools', href: `${B}learn.html#resources`, kind: 'Page section' },
  ];
}

/** Every word must match; title matches rank above description matches. */
export function search(index: Hit[], q: string, limit = 40): Hit[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return index
    .map((h) => {
      const t = h.title.toLowerCase();
      const all = `${t} ${h.sub.toLowerCase()} ${h.kind.toLowerCase()}`;
      if (!words.every((w) => all.includes(w))) return null;
      const score = words.reduce((n, w) => n + (t.startsWith(w) ? 4 : t.includes(w) ? 2 : 0), 0);
      return { h, score };
    })
    .filter((x): x is { h: Hit; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.h);
}
