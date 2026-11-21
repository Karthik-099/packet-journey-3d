/**
 * Directory of the companies that build and run the internet. Logos come from Simple Icons (CC0) where the
 * brand allows it; otherwise a monogram is shown. Trademarks belong to their owners.
 * `logo` is a Simple Icons slug; `asn` is the main autonomous system number where one applies.
 */
export interface Provider {
  name: string;
  logo?: string;
  color: string; // brand colour for the monogram fallback
  hq: string;
  asn?: string;
  note: string;
  url: string;
}

export interface ProviderGroup {
  id: string;
  title: string;
  blurb: string;
  items: Provider[];
}

export const PROVIDER_GROUPS: ProviderGroup[] = [
  {
    id: 'cloud',
    title: 'Top 20 cloud providers',
    blurb: 'Where applications and data live. Market shares: Synergy Research, Q3 2025.',
    items: [
      { name: 'Amazon Web Services', color: '#FF9900', hq: 'USA', asn: 'AS16509', note: 'Largest cloud by revenue (~29% share); 30+ regions', url: 'https://aws.amazon.com/' },
      { name: 'Microsoft Azure', color: '#0078D4', hq: 'USA', asn: 'AS8075', note: '~20% share; one of the largest private WANs', url: 'https://azure.microsoft.com/' },
      { name: 'Google Cloud', logo: 'googlecloud', color: '#4285F4', hq: 'USA', asn: 'AS15169 / AS396982', note: '~13% share; runs on Google\'s private backbone and cables', url: 'https://cloud.google.com/' },
      { name: 'Alibaba Cloud', logo: 'alibabacloud', color: '#FF6A00', hq: 'China', asn: 'AS45102', note: '~4% share; largest cloud in China', url: 'https://www.alibabacloud.com/' },
      { name: 'Oracle Cloud', color: '#C74634', hq: 'USA', asn: 'AS31898', note: '~3% share and growing fast; strong in databases and AI', url: 'https://www.oracle.com/cloud/' },
      { name: 'IBM Cloud', color: '#0F62FE', hq: 'USA', asn: 'AS36351', note: 'Hybrid cloud and mainframe workloads (ex-SoftLayer network)', url: 'https://www.ibm.com/cloud' },
      { name: 'Tencent Cloud', color: '#0052D9', hq: 'China', asn: 'AS132203', note: 'Gaming, media and WeChat ecosystem', url: 'https://www.tencentcloud.com/' },
      { name: 'Huawei Cloud', logo: 'huawei', color: '#FF0000', hq: 'China', asn: 'AS136907', note: 'Large footprint in China, Asia, Latin America', url: 'https://www.huaweicloud.com/intl/en-us/' },
      { name: 'DigitalOcean', logo: 'digitalocean', color: '#0080FF', hq: 'USA', asn: 'AS14061', note: 'Developer-friendly VMs ("Droplets"), managed Kubernetes and databases', url: 'https://www.digitalocean.com/' },
      { name: 'Akamai Cloud (Linode)', logo: 'akamai', color: '#0096D6', hq: 'USA', asn: 'AS63949', note: 'Linode, acquired by Akamai in 2022; compute next to a giant CDN', url: 'https://www.linode.com/' },
      { name: 'OVHcloud', logo: 'ovh', color: '#123F6D', hq: 'France', asn: 'AS16276', note: 'Europe\'s largest cloud provider; builds its own servers and backbone', url: 'https://www.ovhcloud.com/' },
      { name: 'Hetzner', logo: 'hetzner', color: '#D50C2D', hq: 'Germany', asn: 'AS24940', note: 'Dedicated servers and cloud at very low prices', url: 'https://www.hetzner.com/' },
      { name: 'Vultr', logo: 'vultr', color: '#007BFC', hq: 'USA', asn: 'AS20473', note: '30+ locations; cloud compute, bare metal and GPUs', url: 'https://www.vultr.com/' },
      { name: 'Cloudflare', logo: 'cloudflare', color: '#F38020', hq: 'USA', asn: 'AS13335', note: 'Edge compute (Workers), storage (R2) on a 330+-city network', url: 'https://www.cloudflare.com/' },
      { name: 'Scaleway', logo: 'scaleway', color: '#4F0599', hq: 'France', asn: 'AS12876', note: 'European cloud from the Iliad group', url: 'https://www.scaleway.com/' },
      { name: 'Contabo', logo: 'contabo', color: '#0B4F8E', hq: 'Germany', asn: 'AS51167', note: 'Budget VPS and dedicated servers', url: 'https://contabo.com/' },
      { name: 'UpCloud', logo: 'upcloud', color: '#7B00FF', hq: 'Finland', asn: 'AS202053', note: 'High-performance cloud servers', url: 'https://upcloud.com/' },
      { name: 'Leaseweb', color: '#E3051B', hq: 'Netherlands', asn: 'AS60781', note: 'Hosting, bare metal and private cloud', url: 'https://www.leaseweb.com/' },
      { name: 'Rackspace', color: '#C40022', hq: 'USA', note: 'Managed services across AWS, Azure and Google Cloud', url: 'https://www.rackspace.com/' },
      { name: 'Yandex Cloud', logo: 'yandexcloud', color: '#FFCC00', hq: 'Russia', note: 'Largest cloud provider in Russia', url: 'https://yandex.cloud/' },
    ],
  },
  {
    id: 'isp-in',
    title: 'Internet providers in India',
    blurb: 'Access networks: the "last mile" to homes and phones.',
    items: [
      { name: 'Reliance Jio', logo: 'jio', color: '#0F3CC9', hq: 'India', asn: 'AS55836', note: 'Largest mobile operator in India; IPv6 by default', url: 'https://www.jio.com/' },
      { name: 'Bharti Airtel', logo: 'airtel', color: '#E40000', hq: 'India', asn: 'AS9498 / AS24560', note: 'Mobile, fiber and a global carrier arm with its own subsea capacity', url: 'https://www.airtel.in/' },
      { name: 'BSNL', color: '#1B75BC', hq: 'India', asn: 'AS9829', note: 'State-owned; national fiber backbone', url: 'https://www.bsnl.co.in/' },
      { name: 'Vodafone Idea (Vi)', logo: 'vodafone', color: '#E60000', hq: 'India', asn: 'AS55410', note: 'Mobile operator formed from Vodafone India and Idea', url: 'https://www.myvi.in/' },
      { name: 'ACT Fibernet', color: '#E31E24', hq: 'India', asn: 'AS24309', note: 'Fiber broadband (Atria Convergence Technologies)', url: 'https://www.actcorp.in/' },
      { name: 'Tata Communications', logo: 'tata', color: '#486AAE', hq: 'India', asn: 'AS4755 / AS6453', note: 'Owns a global Tier-1 network and major subsea cables', url: 'https://www.tatacommunications.com/' },
      { name: 'Hathway', color: '#00529B', hq: 'India', asn: 'AS17488', note: 'Cable broadband', url: 'https://www.hathway.com/' },
    ],
  },
  {
    id: 'carriers',
    title: 'Global carriers and ISPs',
    blurb: 'The backbones and the biggest access networks worldwide.',
    items: [
      { name: 'Lumen', logo: 'lumen', color: '#0075C9', hq: 'USA', asn: 'AS3356', note: 'One of the largest Tier-1 backbones', url: 'https://www.lumen.com/' },
      { name: 'AT&T', color: '#009FDB', hq: 'USA', asn: 'AS7018', note: 'Tier-1; largest US telecom by revenue', url: 'https://www.att.com/' },
      { name: 'Verizon', logo: 'verizon', color: '#CD040B', hq: 'USA', asn: 'AS701', note: 'Tier-1 backbone and mobile', url: 'https://www.verizon.com/' },
      { name: 'Comcast', color: '#1F69FF', hq: 'USA', asn: 'AS7922', note: 'Largest US cable broadband provider', url: 'https://corporate.comcast.com/' },
      { name: 'NTT', color: '#0068B7', hq: 'Japan', asn: 'AS2914', note: 'Tier-1 global IP network', url: 'https://www.gin.ntt.net/' },
      { name: 'Deutsche Telekom', logo: 'deutschetelekom', color: '#E20074', hq: 'Germany', asn: 'AS3320', note: 'Largest European telecom; T-Mobile parent', url: 'https://www.telekom.com/' },
      { name: 'Orange', logo: 'orange', color: '#FF7900', hq: 'France', asn: 'AS5511', note: 'Tier-1 (Orange Wholesale); major subsea cable owner', url: 'https://www.orange.com/' },
      { name: 'Vodafone', logo: 'vodafone', color: '#E60000', hq: 'UK', asn: 'AS1273', note: 'Global carrier network across Europe and Africa', url: 'https://www.vodafone.com/' },
      { name: 'BT', logo: 'bt', color: '#6400AA', hq: 'UK', asn: 'AS2856', note: 'UK incumbent; Openreach fiber', url: 'https://www.bt.com/' },
      { name: 'Telefónica', logo: 'telefonica', color: '#0066FF', hq: 'Spain', asn: 'AS12956', note: 'Tier-1 international network (Telxius cables)', url: 'https://www.telefonica.com/' },
      { name: 'China Telecom', color: '#0066B3', hq: 'China', asn: 'AS4134', note: 'Largest backbone in China (ChinaNet)', url: 'https://www.chinatelecomglobal.com/' },
      { name: 'Starlink', color: '#000000', hq: 'USA', asn: 'AS14593', note: 'LEO satellite ISP with ~9,000+ satellites', url: 'https://www.starlink.com/' },
    ],
  },
  {
    id: 'vendors',
    title: 'Networking equipment and security vendors',
    blurb: 'Who builds the routers, switches, optics and firewalls.',
    items: [
      { name: 'Cisco', logo: 'cisco', color: '#1BA0D7', hq: 'USA', note: 'Routers, switches, Wi-Fi, security; the CCNA/CCNP certifications', url: 'https://www.cisco.com/' },
      { name: 'Juniper Networks', logo: 'junipernetworks', color: '#84B135', hq: 'USA', note: 'Carrier and data-center routing (Junos); part of HPE since 2025', url: 'https://www.juniper.net/' },
      { name: 'Arista Networks', color: '#1E2E5C', hq: 'USA', note: 'Data-center and cloud switching (EOS); big in hyperscalers', url: 'https://www.arista.com/' },
      { name: 'Nokia', logo: 'nokia', color: '#124191', hq: 'Finland', note: 'IP routing, optical transport, mobile networks, subsea (ASN)', url: 'https://www.nokia.com/' },
      { name: 'Ericsson', logo: 'ericsson', color: '#0082F0', hq: 'Sweden', note: 'Mobile network equipment (4G/5G RAN and core)', url: 'https://www.ericsson.com/' },
      { name: 'Huawei', logo: 'huawei', color: '#FF0000', hq: 'China', note: 'Largest telecom equipment maker by revenue', url: 'https://www.huawei.com/' },
      { name: 'Palo Alto Networks', logo: 'paloaltonetworks', color: '#F04E23', hq: 'USA', note: 'Next-generation firewalls, SASE, security operations', url: 'https://www.paloaltonetworks.com/' },
      { name: 'Fortinet', logo: 'fortinet', color: '#EE3124', hq: 'USA', note: 'FortiGate firewalls and SD-WAN', url: 'https://www.fortinet.com/' },
      { name: 'Check Point', color: '#E5007E', hq: 'Israel', note: 'Firewalls and threat prevention', url: 'https://www.checkpoint.com/' },
      { name: 'F5', logo: 'f5', color: '#E4002B', hq: 'USA', note: 'Load balancers, application delivery, NGINX', url: 'https://www.f5.com/' },
      { name: 'Broadcom (VMware)', logo: 'broadcom', color: '#CC092F', hq: 'USA', note: 'Switch silicon in most data centers; owns VMware (NSX networking)', url: 'https://www.broadcom.com/' },
      { name: 'HPE Aruba Networking', color: '#01A982', hq: 'USA', note: 'Campus Wi-Fi and switching', url: 'https://www.arubanetworks.com/' },
      { name: 'Ciena', color: '#0066CC', hq: 'USA', note: 'Optical transport (DWDM) used on backbones and subsea cables', url: 'https://www.ciena.com/' },
      { name: 'Zscaler', color: '#0063F5', hq: 'USA', note: 'Cloud security / zero-trust access', url: 'https://www.zscaler.com/' },
      { name: 'Ubiquiti', logo: 'ubiquiti', color: '#0559C9', hq: 'USA', note: 'UniFi Wi-Fi, switches and point-to-point radio', url: 'https://www.ui.com/' },
      { name: 'MikroTik', logo: 'mikrotik', color: '#293239', hq: 'Latvia', note: 'RouterOS routers popular with small ISPs', url: 'https://mikrotik.com/' },
    ],
  },
  {
    id: 'interconnect',
    title: 'CDNs, exchanges and data-center operators',
    blurb: 'The buildings and platforms where networks meet and content is served.',
    items: [
      { name: 'Akamai', logo: 'akamai', color: '#0096D6', hq: 'USA', asn: 'AS20940', note: 'The original CDN; 4,400+ edge locations', url: 'https://www.akamai.com/' },
      { name: 'Cloudflare', logo: 'cloudflare', color: '#F38020', hq: 'USA', asn: 'AS13335', note: 'CDN, DNS (1.1.1.1), DDoS protection, anycast everywhere', url: 'https://www.cloudflare.com/' },
      { name: 'Fastly', logo: 'fastly', color: '#FF282D', hq: 'USA', asn: 'AS54113', note: 'Programmable CDN', url: 'https://www.fastly.com/' },
      { name: 'Equinix', color: '#ED1C24', hq: 'USA', note: 'Largest colocation and interconnection provider (Equinix IX)', url: 'https://www.equinix.com/' },
      { name: 'Digital Realty', color: '#004B87', hq: 'USA', note: 'Data centers and interconnection (PlatformDIGITAL)', url: 'https://www.digitalrealty.com/' },
      { name: 'DE-CIX', color: '#0B3D91', hq: 'Germany', note: 'Operator of Frankfurt and many other IXPs, incl. India', url: 'https://www.de-cix.net/' },
      { name: 'AMS-IX', color: '#E2001A', hq: 'Netherlands', note: 'Amsterdam Internet Exchange', url: 'https://www.ams-ix.net/' },
      { name: 'NIXI', color: '#F37021', hq: 'India', note: 'National Internet Exchange of India', url: 'https://nixi.in/' },
    ],
  },
];
