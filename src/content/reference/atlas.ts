/**
 * The internet by the numbers. Every figure carries its source and the date it describes.
 * When sources disagree, the note says so. Update these as new reports come out.
 */
export interface Fact {
  value: string;
  label: string;
  note?: string;
  source: string;
  url: string;
  asOf: string;
}

export interface FactGroup {
  id: string;
  title: string;
  blurb: string;
  facts: Fact[];
}

export const FACT_GROUPS: FactGroup[] = [
  {
    id: 'people',
    title: 'People online',
    blurb: 'Who the internet serves.',
    facts: [
      { value: '6.0 billion', label: 'people use the internet (74% of the world)', source: 'ITU Facts and Figures 2025', url: 'https://www.itu.int/itu-d/reports/statistics/2025/10/15/ff25-internet-use', asOf: '2025' },
      { value: '2.2 billion', label: 'people are still offline', note: 'Internet use is 94% in high-income countries and 23% in low-income ones.', source: 'ITU Facts and Figures 2025', url: 'https://www.itu.int/en/mediacentre/Pages/PR-2025-11-17-Facts-and-Figures.aspx', asOf: 'Nov 2025' },
    ],
  },
  {
    id: 'cables',
    title: 'Cables under the sea',
    blurb: 'The physical backbone: glass fibers on the ocean floor.',
    facts: [
      { value: '607', label: 'submarine cable systems in service', note: 'Plus 102 planned; up from 570 in service in February 2025.', source: 'TeleGeography', url: 'https://blog.telegeography.com/how-many-submarine-cables-are-there-anyway', asOf: '2026' },
      { value: '~1.4 million km', label: 'of submarine cable in service', note: 'Enough to wrap around the Earth about 35 times.', source: 'TeleGeography', url: 'https://blog.telegeography.com/how-many-submarine-cables-are-there-anyway', asOf: 'early 2024 estimate' },
      { value: '~45,000 km', label: '2Africa, the longest subsea cable system', note: '16 fiber pairs, 180 Tbps, lands in 33 countries; core completed November 2025.', source: 'Meta Engineering', url: 'https://engineering.fb.com/2025/11/17/connectivity/core-2africa-system-completion-future-connectivity/', asOf: 'Nov 2025' },
      { value: '2,259 Tbps', label: 'of international internet bandwidth', note: '23% compound annual growth over four years.', source: 'TeleGeography', url: 'https://resources.telegeography.com/international-internet-bandwidth', asOf: 'Sep 2026' },
      { value: '~75%', label: 'of used international capacity belongs to content & cloud providers', note: 'Google, Meta, Microsoft, Amazon: on the busiest routes, over 80%.', source: 'TeleGeography', url: 'https://resources.telegeography.com/used-international-bandwidth-reaches-new-heights', asOf: '2025' },
    ],
  },
  {
    id: 'space',
    title: 'Internet from space',
    blurb: 'Low-Earth-orbit constellations now carry real traffic.',
    facts: [
      { value: '~9,350', label: 'Starlink satellites in orbit', note: 'The 10,000th was launched on 19 October 2025; counts differ between trackers.', source: 'Space trackers (via BGR / EarthSky)', url: 'https://earthsky.org/spaceflight/10000-starlink-satellites-orbiting-earth-counting/', asOf: 'Dec 2025' },
    ],
  },
  {
    id: 'dc',
    title: 'Data centers',
    blurb: 'Where the internet\'s servers live.',
    facts: [
      { value: '~11,800', label: 'data centers worldwide', note: 'Counts vary a lot between sources; the US alone has roughly 4,000–5,400 depending on who counts.', source: 'Cloudscene (via Statista / Cargoson)', url: 'https://www.cargoson.com/en/blog/number-of-data-centers-by-country', asOf: 'Mar 2024' },
      { value: '1,360', label: 'hyperscale data centers', note: '580 of them in the US; another 580 in the known pipeline.', source: 'Synergy Research Group', url: 'https://www.srgresearch.com/articles/hyperscale-data-center-count-hits-1136-average-size-increases-us-accounts-for-54-of-total-capacity', asOf: 'end 2025' },
    ],
  },
  {
    id: 'interconnect',
    title: 'Where networks meet',
    blurb: 'Exchanges and buildings where traffic hands over between networks.',
    facts: [
      { value: '~1,310', label: 'internet exchange points (IXPs)', source: 'PeeringDB', url: 'https://www.peeringdb.com/', asOf: '2026 snapshot' },
      { value: '~5,865', label: 'interconnection facilities (colocation buildings)', source: 'PeeringDB', url: 'https://www.peeringdb.com/', asOf: '2026 snapshot' },
      { value: '~34,500', label: 'networks registered in PeeringDB', note: 'Fivefold growth in ten years.', source: 'PeeringDB / Internet Society Pulse', url: 'https://pulse.internetsociety.org/en/blog/peeringdb-shows-that-automation-drives-network-interconnection-growth/', asOf: '2026' },
      { value: '18.73 Tbps', label: 'peak traffic at DE-CIX Frankfurt', note: 'Set on a Champions League matchday. All DE-CIX exchanges together peaked at 26.99 Tbps and carried 79 exabytes in 2025.', source: 'DE-CIX', url: 'https://www.de-cix.net/en/about-de-cix/media/press-releases/de-cix-global-data-traffic-volume-hits-record-breaking-79-exabytes-at-internet-exchanges-in-2025', asOf: 'Dec 2025' },
    ],
  },
  {
    id: 'routing',
    title: 'Routing',
    blurb: 'The global routing table that every core router carries.',
    facts: [
      { value: '1,004,959', label: 'IPv4 routes in the global BGP table', note: 'Passed one million entries in 2025.', source: 'APNIC (Geoff Huston, potaroo)', url: 'https://blog.apnic.net/2026/01/08/bgp-in-2025/', asOf: 'Sep 2025' },
      { value: '77,375', label: 'autonomous systems (networks) in the routing table', note: '10,868 of them provide transit; the rest only originate their own routes.', source: 'APNIC', url: 'https://blog.apnic.net/2026/01/08/bgp-in-2025/', asOf: 'Sep 2025' },
      { value: '~50%', label: 'of users reach Google over IPv6', note: 'Up from 46% a year earlier. Cloudflare sees about 40% of requests over IPv6; in India over two-thirds.', source: 'Google IPv6 statistics (via APNIC)', url: 'https://www.google.com/ipv6/statistics.html', asOf: 'Apr 2026' },
    ],
  },
  {
    id: 'names',
    title: 'Names',
    blurb: 'The DNS that turns names into addresses.',
    facts: [
      { value: '386.9 million', label: 'registered domain names', note: '+22.7 million in a year.', source: 'Verisign Domain Name Industry Brief', url: 'https://blog.verisign.com/domain-names/q4-2025-domain-name-industry-brief-quarterly-report/', asOf: 'Q4 2025' },
      { value: '161.0 million', label: '.com domains', source: 'Verisign', url: 'https://blog.verisign.com/domain-names/q4-2025-domain-name-industry-brief-quarterly-report/', asOf: 'Q4 2025' },
      { value: '~1,440', label: 'live top-level domains', note: 'IANA\'s database lists about 1,600 entries, some retired.', source: 'IANA root zone database', url: 'https://www.iana.org/domains/root/db', asOf: '2026' },
      { value: '2,000+', label: 'root server instances', note: '13 root identities (a–m) run by 12 organisations, anycast worldwide.', source: 'root-servers.org (via RIPE DNS WG)', url: 'https://root-servers.org/', asOf: 'Oct 2025' },
      { value: '1.49 billion', label: 'websites (hostnames) seen by Netcraft', note: 'On 305 million domains; most are inactive or parked.', source: 'Netcraft Web Server Survey', url: 'https://www.netcraft.com/blog/july-2026-web-server-survey', asOf: 'Jul 2026' },
    ],
  },
];

/** Per-second rates used by the live "every second" counter. */
export interface Rate {
  label: string;
  perSecond: number;
  source: string;
  url: string;
  asOf: string;
  basis: string;
}
export const RATES: Rate[] = [
  { label: 'HTTP requests handled by Cloudflare alone', perSecond: 81_000_000, basis: '81 M/s average, 129 M/s peak', source: 'Cloudflare Radar 2025', url: 'https://blog.cloudflare.com/radar-2025-year-in-review', asOf: '2025' },
  { label: 'DNS queries answered by 1.1.1.1', perSecond: 1.9e12 / 86_400, basis: '1.9 trillion per day', source: 'Cloudflare', url: 'https://blog.cloudflare.com/new-dns-section-on-cloudflare-radar/', asOf: '2025' },
  { label: 'emails sent and received', perSecond: 376e9 / 86_400, basis: '376 billion per day (≈45–49% spam)', source: 'Radicati (via Statista)', url: 'https://www.statista.com/statistics/456500/daily-number-of-e-mails-worldwide/', asOf: '2025' },
  { label: 'Google searches', perSecond: 5e12 / (365 * 86_400), basis: '5 trillion+ per year', source: 'Google (via Search Engine Land)', url: 'https://searchengineland.com/google-5-trillion-searches-per-year-452928', asOf: 'Jan 2025' },
];

export interface Share {
  name: string;
  pct: number;
}
export const CLOUD_SHARE: { source: string; url: string; asOf: string; rows: Share[] } = {
  source: 'Synergy Research Group (via The Register / TechTarget)',
  url: 'https://www.theregister.com/2025/11/20/aws_loses_market_share_azure_google/',
  asOf: 'Q3 2025',
  rows: [
    { name: 'Amazon Web Services', pct: 29 },
    { name: 'Microsoft Azure', pct: 20 },
    { name: 'Google Cloud', pct: 13 },
    { name: 'Alibaba Cloud', pct: 4 },
    { name: 'Oracle', pct: 3 },
  ],
};
export const WEBSERVER_SHARE: { source: string; url: string; asOf: string; rows: Share[] } = {
  source: 'Netcraft (active sites)',
  url: 'https://www.netcraft.com/blog/july-2025-web-server-survey',
  asOf: 'Jul 2025',
  rows: [
    { name: 'nginx', pct: 18.82 },
    { name: 'Cloudflare', pct: 18.35 },
    { name: 'Apache', pct: 15.14 },
    { name: 'Google', pct: 10.36 },
  ],
};

export const EDGE_NETWORKS = [
  { name: 'Akamai', footprint: '4,400+ edge PoPs in 130+ countries', note: 'Deepest deployment inside ISP networks', url: 'https://www.akamai.com/fr/visualizations/visualizing-akamai' },
  { name: 'Cloudflare', footprint: '330+ cities in 125+ countries', note: 'Every server runs every service; anycast everywhere', url: 'https://www.cloudflare.com/network/' },
  { name: 'Google', footprint: 'Edge PoPs + Google Global Cache inside ISPs', note: 'Private backbone and its own subsea cables', url: 'https://peering.google.com/' },
  { name: 'Meta', footprint: 'Edge PoPs + Meta Network Appliances in ISPs', note: 'Co-owns 2Africa and MAREA', url: 'https://engineering.fb.com/' },
  { name: 'Netflix', footprint: 'Open Connect appliances inside ISPs and IXPs', note: 'Most video never crosses the wider internet', url: 'https://openconnect.netflix.com/' },
];

/**
 * Networks commonly listed as Tier 1 (reach every network via settlement-free peering, buying no transit).
 * There is no official registry; lists differ slightly between sources.
 */
export const TIER1 = ['AT&T (AS7018)', 'Cogent (AS174)', 'Lumen (AS3356)', 'Arelion (AS1299)', 'NTT (AS2914)', 'Tata Communications (AS6453)', 'GTT (AS3257)', 'Verizon (AS701)', 'Zayo (AS6461)', 'Telecom Italia Sparkle (AS6762)', 'Orange (AS5511)', 'Deutsche Telekom (AS3320)'];
