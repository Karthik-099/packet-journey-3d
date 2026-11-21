import {
  siAirtel, siAkamai, siAlibabacloud, siBroadcom, siBt, siCisco, siCloudflare, siContabo, siDeutschetelekom, siDigitalocean,
  siEricsson, siF5, siFastly, siFortinet, siGooglecloud, siHetzner, siHuawei, siJio, siJunipernetworks, siLumen, siMikrotik,
  siNokia, siOrange, siOvh, siPaloaltonetworks, siScaleway, siTata, siTelefonica, siUbiquiti, siUpcloud, siVerizon,
  siVodafone, siVultr, siYandexcloud,
} from 'simple-icons';

/** Brand marks from Simple Icons (CC0 icon data; trademarks belong to their owners). Only these are bundled. */
const ICONS: Record<string, { path: string; hex: string }> = Object.fromEntries(
  [
    siAirtel, siAkamai, siAlibabacloud, siBroadcom, siBt, siCisco, siCloudflare, siContabo, siDeutschetelekom, siDigitalocean,
    siEricsson, siF5, siFastly, siFortinet, siGooglecloud, siHetzner, siHuawei, siJio, siJunipernetworks, siLumen, siMikrotik,
    siNokia, siOrange, siOvh, siPaloaltonetworks, siScaleway, siTata, siTelefonica, siUbiquiti, siUpcloud, siVerizon,
    siVodafone, siVultr, siYandexcloud,
  ].map((i) => [i.slug, { path: i.path, hex: i.hex }]),
);

const initials = (name: string) =>
  name
    .replace(/\(.*?\)/g, '')
    .split(/[\s&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Square logo tile: the brand mark if available, otherwise a monogram in the brand colour. */
export function BrandLogo({ name, slug, color }: { name: string; slug?: string; color: string }) {
  const icon = slug ? ICONS[slug] : undefined;
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm" aria-hidden>
      {icon ? (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill={`#${icon.hex}`}>
          <path d={icon.path} />
        </svg>
      ) : (
        <span className="font-display text-sm font-bold tracking-wide" style={{ color }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

export const hasLogo = (slug?: string) => !!slug && !!ICONS[slug];
