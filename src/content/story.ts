import type { Ctx } from './types';

/** The whole step in one breath: a plain headline, one sentence, and who hands the packet to whom. */
export interface Story {
  head: string;
  line: string;
  from: string;
  to: string;
}

const D = (c: Ctx) => c.target.domain;

export const STORY: Record<string, (c: Ctx) => Story> = {
  'g-key': (c) => ({ head: 'You press Enter', line: `Your keyboard tells the computer "Enter was pressed". The trip to ${D(c)} starts here.`, from: 'Keyboard', to: 'Computer' }),
  'g-os': () => ({ head: 'The computer tells the browser', line: 'The operating system notices the key press and passes it to the browser window.', from: 'Computer', to: 'Browser' }),
  'g-url': (c) => ({ head: 'The browser reads the address', line: `It works out that you want ${D(c)} over a secure (https) connection.`, from: 'Browser', to: 'Browser' }),
  'g-cache': () => ({ head: 'Already know it?', line: 'The browser checks its memory first. If it visited recently it can skip some steps.', from: 'Browser', to: 'Cache' }),
  'g-dns-stub': (c) => ({ head: 'Where is it?', line: `Computers need a number (IP address), not a name. Your computer asks a DNS resolver: "What is the address of ${D(c)}?"`, from: 'Your computer', to: 'DNS resolver' }),
  'g-dns-recursive': () => ({ head: 'The resolver checks its notes', line: 'If someone asked recently, it already has the answer. If not, it goes looking.', from: 'Resolver', to: 'Its cache' }),
  'g-dns-root': (c) => ({ head: 'Ask the top of the tree', line: `The root server doesn't know ${D(c)}, but it knows who runs ".${c.target.tld}" and points there.`, from: 'Resolver', to: 'Root server' }),
  'g-dns-tld': (c) => ({ head: `Ask the ".${c.target.tld}" office`, line: `The .${c.target.tld} server knows which nameserver is in charge of ${D(c)} and points there.`, from: 'Resolver', to: `.${c.target.tld} server` }),
  'g-dns-auth': (c) => ({ head: 'Ask the owner', line: `${D(c)}'s own nameserver gives the real answer: the IP address.`, from: 'Resolver', to: 'Site nameserver' }),
  'g-dns-answer': () => ({ head: 'Got the address', line: 'The answer comes back to your computer and is remembered for next time.', from: 'Resolver', to: 'Your computer' }),
  'g-arp': () => ({ head: 'Find the router', line: 'The server is far away, so your computer hands the packet to your home router. First it asks: "Which device is the router?"', from: 'Your computer', to: 'Home network' }),
  'g-wifi': () => ({ head: 'Through the air', line: 'The packet travels over Wi-Fi radio waves to your router.', from: 'Your computer', to: 'Router' }),
  'g-nat': () => ({ head: 'The router swaps the return address', line: 'Your home addresses are private. The router puts its own public address on the packet so replies can find their way back.', from: 'Router', to: 'Internet' }),
  'g-isp': () => ({ head: 'Into your internet provider', line: 'The packet leaves your home over fiber (or a satellite) and enters your ISP\'s network.', from: 'Router', to: 'Your ISP' }),
  'g-bgp': () => ({ head: 'Which way?', line: 'Networks share maps with each other (BGP). Your ISP uses them to pick the path to the server.', from: 'Your ISP', to: 'Next network' }),
  'g-core': (c) => ({ head: 'Across the world', line: `The packet hops between big routers and may cross undersea cables to reach ${c.destName}.`, from: 'Your ISP', to: 'Data center' }),
  'g-gfe': (c) => ({ head: 'Arrive at the front door', line: `A nearby edge server or load balancer for ${D(c)} receives the packet.`, from: 'Internet', to: 'Server front door' }),
  'g-tcp': () => ({ head: 'Say hello', line: 'Your computer and the server agree to talk: "hello", "hello back", "ok" (3 quick messages).', from: 'Your computer', to: 'Server' }),
  'g-tls': () => ({ head: 'Lock the conversation', line: 'They agree on secret keys and the server proves who it is, so nobody in between can read along.', from: 'Your computer', to: 'Server' }),
  'g-http': (c) => ({ head: 'Ask for the page', line: `Your browser says "please send me the home page of ${D(c)}" and the server prepares it.`, from: 'Browser', to: 'Server' }),
  'g-back': () => ({ head: 'The page travels back', line: 'The reply takes the same kind of trip in reverse, all the way to your screen.', from: 'Server', to: 'Your computer' }),
  'g-render-parse': () => ({ head: 'Read the page', line: 'The browser reads the HTML and styles and works out what goes where.', from: 'Browser', to: 'Browser' }),
  'g-render-paint': () => ({ head: 'Draw it', line: 'The graphics card paints the pixels. The website appears. The whole trip took well under a second.', from: 'Browser', to: 'Screen' }),

  'hi-l7': (c) => ({ head: 'You write a message', line: `You type "${c.message}". The app hands it down to be sent.`, from: 'You', to: 'App' }),
  'hi-l6': () => ({ head: 'Letters become numbers', line: 'Every character is turned into bytes (and can be encrypted).', from: 'App', to: 'Bytes' }),
  'hi-l5': () => ({ head: 'Keep the chat together', line: 'The message is tagged so it belongs to this one conversation.', from: 'App', to: 'Session' }),
  'hi-l4-handshake': () => ({ head: 'Say hello first', line: 'Before sending, both computers agree to talk: "hello", "hello back", "ok".', from: 'Sender', to: 'Receiver' }),
  'hi-l4': () => ({ head: 'Envelope 1: ports', line: 'TCP wraps the bytes and writes which program should receive them (the port).', from: 'Bytes', to: 'Segment' }),
  'hi-l3': () => ({ head: 'Envelope 2: addresses', line: 'IP wraps it again with the sender and receiver addresses, like a postal address.', from: 'Segment', to: 'Packet' }),
  'hi-l2-arp': () => ({ head: 'Who is next door?', line: 'To send on the local network you need the next device\'s hardware (MAC) address. ARP asks for it.', from: 'Sender', to: 'Local network' }),
  'hi-l2': () => ({ head: 'Envelope 3: the local hop', line: 'Ethernet wraps it a third time for the next hop, plus a checksum to catch damage.', from: 'Packet', to: 'Frame' }),
  'hi-l1': () => ({ head: 'Send the signal', line: 'The ones and zeros become electrical pulses, light, or radio waves.', from: 'Frame', to: 'Cable / air' }),
  'hi-r1': () => ({ head: 'Signal arrives', line: 'The receiver turns the pulses back into ones and zeros.', from: 'Cable / air', to: 'Receiver' }),
  'hi-r2': () => ({ head: 'Open envelope 3', line: 'Check the checksum and that the frame is for us, then remove it.', from: 'Frame', to: 'Packet' }),
  'hi-r3': () => ({ head: 'Open envelope 2', line: 'Check the IP address is ours, then remove the IP header.', from: 'Packet', to: 'Segment' }),
  'hi-r4': () => ({ head: 'Open envelope 1', line: 'TCP checks nothing is missing, puts pieces in order and says "got it".', from: 'Segment', to: 'Bytes' }),
  'hi-r5': () => ({ head: 'Find the conversation', line: 'The bytes are matched to the right open chat.', from: 'Bytes', to: 'Session' }),
  'hi-r6': () => ({ head: 'Numbers become letters', line: 'Decrypt and turn the bytes back into characters.', from: 'Bytes', to: 'Text' }),
  'hi-r7': (c) => ({ head: 'Message delivered', line: `"${c.message}" appears on the other screen.`, from: 'App', to: 'Friend' }),
};
