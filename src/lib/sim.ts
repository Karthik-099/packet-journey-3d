/** Small deterministic simulations for teaching. All marked "simplified" in the UI. */

/** Mulberry32: tiny seeded PRNG so a given seed always shows the same story. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HolInput {
  loss: number; // 0..1
  rttMs: number;
  streams: number;
  perStream: number; // packets per stream
  window: number; // packets sent per round trip
  seed: number;
}

/**
 * Several streams share one connection, packets interleaved round-robin. A lost packet is
 * retransmitted one RTT later (and may be lost again).
 * - TCP (HTTP/2): the byte stream is delivered strictly in order, so a stream finishes only when
 *   every earlier packet of *any* stream has arrived (head-of-line blocking).
 * - QUIC (HTTP/3): each stream only waits for its own packets.
 */
export function simulateHol(i: HolInput) {
  const r = rng(i.seed);
  const n = i.streams * i.perStream;
  const arrive: number[] = [];
  const stream: number[] = [];
  let lost = 0;
  for (let k = 0; k < n; k++) {
    let round = Math.floor(k / i.window);
    while (r() < i.loss) {
      round += 1; // retransmitted one RTT later
      lost++;
    }
    arrive.push((round + 0.5) * i.rttMs + (k % i.window) * (i.rttMs / i.window / 4));
    stream.push(k % i.streams);
  }
  const tcp = Array<number>(i.streams).fill(0);
  const quic = Array<number>(i.streams).fill(0);
  let inOrder = 0;
  for (let k = 0; k < n; k++) {
    inOrder = Math.max(inOrder, arrive[k]!);
    tcp[stream[k]!] = Math.max(tcp[stream[k]!]!, inOrder);
    quic[stream[k]!] = Math.max(quic[stream[k]!]!, arrive[k]!);
  }
  return { tcp, quic, lost, sent: n + lost };
}

/**
 * Congestion window per RTT: slow start doubles until loss or ssthresh, then CUBIC-like
 * multiplicative decrease (×0.7) and roughly linear growth (+1 segment per RTT).
 */
export function cwndTrace(loss: number, rounds: number, seed: number) {
  const r = rng(seed);
  let cwnd = 10;
  let ssthresh = Infinity;
  const out: { cwnd: number; event?: 'loss' }[] = [];
  for (let k = 0; k < rounds; k++) {
    // probability that at least one of cwnd packets is lost this round
    const pLoss = 1 - (1 - loss) ** cwnd;
    if (r() < pLoss) {
      ssthresh = Math.max(2, Math.floor(cwnd * 0.7));
      cwnd = ssthresh;
      out.push({ cwnd, event: 'loss' });
      continue;
    }
    cwnd = cwnd < ssthresh ? Math.min(cwnd * 2, ssthresh === Infinity ? cwnd * 2 : ssthresh) : cwnd + 1;
    cwnd = Math.min(cwnd, 1000);
    out.push({ cwnd });
  }
  return out;
}
