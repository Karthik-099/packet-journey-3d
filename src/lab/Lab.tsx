import { useMemo, useRef, useState } from 'react';
import { Footer, Nav } from '../site/Nav';
import { Icon } from '../site/Icon';
import { PacketInspector } from '../components/PacketInspector';
import { dissect, readCapture, stats, writePcap, type Dissected } from '../lib/pcap';
import { sampleFrames } from '../lib/sample-capture';

const PROTO_COLOR: Record<string, string> = { ARP: 'bg-amber-100 text-amber-800', DNS: 'bg-sky-100 text-sky-800', TCP: 'bg-blue-100 text-blue-800', HTTP: 'bg-emerald-100 text-emerald-800', TLS: 'bg-sky-100 text-sky-800', ICMP: 'bg-cyan-100 text-cyan-800', ICMPv6: 'bg-cyan-100 text-cyan-800', UDP: 'bg-slate-100 text-slate-700', QUIC: 'bg-rose-100 text-rose-800' };
const MAX_BYTES = 50 * 1024 * 1024;

export function Lab() {
  const [packets, setPackets] = useState<Dissected[]>([]);
  const [sel, setSel] = useState(0);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = (buf: ArrayBuffer, label: string) => {
    try {
      const raw = readCapture(buf);
      if (!raw.length) throw new Error('No packets found in this file');
      setPackets(raw.slice(0, 20000).map((p, i) => dissect(p, i + 1)));
      setSel(0);
      setName(label + (raw.length > 20000 ? ` (first 20,000 of ${raw.length} packets)` : ''));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read this file');
    }
  };
  const openFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return setErr('File is larger than 50 MB. Trim it in Wireshark first (File → Export Specified Packets).');
    load(await f.arrayBuffer(), f.name);
  };
  const sample = () => writePcap(sampleFrames());
  const download = () => {
    const url = URL.createObjectURL(new Blob([sample().slice().buffer as ArrayBuffer], { type: 'application/vnd.tcpdump.pcap' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'packet-journey-sample.pcap' });
    a.click();
    URL.revokeObjectURL(url);
  };
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? packets.filter((p) => `${p.proto} ${p.src} ${p.dst} ${p.info} ${p.layers.join(' ')}`.toLowerCase().includes(f)) : packets;
  }, [packets, filter]);
  const st = useMemo(() => stats(packets), [packets]);
  const cur = packets[sel];
  const t0 = packets[0]?.ts ?? 0;

  return (
    <div className="site-bg">
      <Nav active="lab" />
      <main className="mx-auto max-w-7xl px-5 pb-10">
        <header className="pb-8 pt-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">Packet Lab</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Open a real capture. <span className="grad-text">See every layer.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Drop a Wireshark or tcpdump file (.pcap or .pcapng). It's decoded entirely in your browser and never uploaded. You get the packet list, a layer-by-layer tree with hex, protocol statistics, top conversations, DNS lookups and measured TCP handshake times.
          </p>
        </header>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void openFile(e.dataTransfer.files[0]);
          }}
          className={`glass flex flex-col items-center gap-4 border-2 border-dashed p-8 text-center transition ${drag ? 'border-blue-500 bg-blue-50' : 'border-blue-200'}`}
        >
          <span className="icon-tile"><Icon name="upload" /></span>
          <p className="text-ink">
            <b>Drag a capture here</b> or choose a file. Supported: pcap (µs/ns), pcapng; Ethernet, VLAN, Linux cooked, raw IP.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button className="cta !py-3 text-sm" onClick={() => input.current?.click()}>Choose a file</button>
            <button className="cta-ghost text-sm" onClick={() => load(sample().buffer as ArrayBuffer, 'Sample: ARP → DNS → ping → HTTP')}>Load sample capture</button>
            <button className="cta-ghost text-sm" onClick={download}>Download sample .pcap</button>
          </div>
          <input ref={input} type="file" accept=".pcap,.pcapng,.cap,application/vnd.tcpdump.pcap" className="hidden" onChange={(e) => void openFile(e.target.files?.[0])} />
          {err && <p className="text-sm text-rose-600" role="alert">{err}</p>}
          <p className="text-xs text-slate-500">
            Make your own: <code className="kbd">sudo tcpdump -i any -w mine.pcap</code> then browse a site, or in Wireshark use File → Save As.
          </p>
        </div>

        {packets.length > 0 && (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-ink">{name}</h2>
              <span className="text-sm text-slate-500">{packets.length} packets · {st.duration.toFixed(3)} s</span>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter: dns, tcp, 10.0.0.5, GET…" aria-label="Filter packets" className="ml-auto w-72 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-blue-500" />
            </div>
            <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
              <div className="glass max-h-[560px] overflow-auto" tabIndex={0} role="region" aria-label="Packet list">
                <table className="tbl text-xs">
                  <thead className="sticky top-0"><tr><th>No.</th><th>Time</th><th>Source</th><th>Destination</th><th>Protocol</th><th>Info</th></tr></thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.no} onClick={() => setSel(p.no - 1)} className={`cursor-pointer ${sel === p.no - 1 ? '[&>td]:!bg-blue-100' : ''}`} aria-selected={sel === p.no - 1}>
                        <td className="font-mono">{p.no}</td>
                        <td className="font-mono">{(p.ts - t0).toFixed(4)}</td>
                        <td className="font-mono">{p.src}</td>
                        <td className="font-mono">{p.dst}</td>
                        <td><span className={`rounded px-1.5 py-0.5 font-semibold ${PROTO_COLOR[p.proto] ?? 'bg-slate-100 text-slate-700'}`}>{p.proto}</span></td>
                        <td className="max-w-[22rem] truncate font-mono" title={p.info}>{p.info}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3">
                {cur && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cur.layers.map((l, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          {i > 0 && <span className="text-slate-400">›</span>}
                          <span className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-2.5 py-1 text-xs font-semibold text-white">{l}</span>
                        </span>
                      ))}
                    </div>
                    <div className="rounded-2xl bg-[#08141b] p-2 shadow-xl shadow-blue-900/20">
                      <PacketInspector key={cur.no} data={cur.inspection} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="glass p-5">
                <h3 className="font-semibold text-ink">Protocol hierarchy</h3>
                <ul className="mt-3 space-y-2">
                  {st.protocols.map(([p, n]) => (
                    <li key={p} className="text-sm">
                      <div className="flex justify-between text-slate-600"><span>{p}</span><span className="font-mono">{n}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-blue-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${(n / packets.length) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass p-5 xl:col-span-2">
                <h3 className="font-semibold text-ink">Top conversations</h3>
                <table className="tbl mt-2 text-xs">
                  <thead><tr><th>Endpoints</th><th>Packets</th><th>Bytes</th></tr></thead>
                  <tbody>{st.conversations.map(([c, v]) => <tr key={c}><td className="font-mono">{c}</td><td>{v.packets}</td><td>{v.bytes.toLocaleString()}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="glass space-y-4 p-5">
                <div>
                  <h3 className="font-semibold text-ink">TCP handshakes</h3>
                  {st.handshakes.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">{st.handshakes.slice(0, 8).map((h, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate font-mono">{h.conv}</span><b className="text-blue-700">{h.rttMs.toFixed(1)} ms</b></li>)}</ul>
                  ) : <p className="mt-1 text-xs text-slate-500">No SYN/SYN-ACK pairs found.</p>}
                  <p className="mt-2 text-[11px] text-slate-500">Time from SYN to SYN-ACK = one network round trip, as seen by the capture point.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Retransmissions</h3>
                  <p className="mt-1 text-sm text-slate-600"><b className={st.retrans ? 'text-rose-600' : 'text-emerald-600'}>{st.retrans}</b> repeated TCP segments</p>
                </div>
                <div>
                  <h3 className="font-semibold text-ink">DNS lookups</h3>
                  <ul className="mt-1 space-y-0.5 font-mono text-xs text-slate-600">{st.dns.length ? st.dns.map(([n, c]) => <li key={n}>{n} <span className="text-slate-400">×{c}</span></li>) : <li>none</li>}</ul>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
