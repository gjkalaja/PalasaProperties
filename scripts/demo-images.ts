// Generates minimal illustrated placeholder photos (SVG) for demo properties.
// Run: npx tsx scripts/demo-images.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "demo");

const palettes = [
  { name: "noon", sky: ["#bfe3f5", "#eaf6fb"], sea: ["#2b8fb8", "#0f5f86"], sun: "#fff7d6", hill: "#9fb8a6", sand: "#efe6d4" },
  { name: "sunset", sky: ["#f6b38a", "#fde6cf"], sea: ["#5e7fa3", "#2f4a6b"], sun: "#ffefc9", hill: "#8f8a7a", sand: "#ead6bf" },
  { name: "morning", sky: ["#d9e7f0", "#f7f3ea"], sea: ["#6aa8bf", "#3a7891"], sun: "#ffffff", hill: "#b4c2b0", sand: "#f1ebdf" },
  { name: "dusk", sky: ["#2a3557", "#8d7aa0"], sea: ["#27365a", "#141d36"], sun: "#ffe7b0", hill: "#3c4462", sand: "#7d7590" },
];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const W = 1200;
const H = 800;

function frame(defs: string, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${body}</svg>`;
}

function grad(id: string, a: string, b: string, vertical = true) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
}

function exterior(p: (typeof palettes)[number], r: () => number, pool: boolean) {
  const horizon = 430 + r() * 40;
  const sunX = 200 + r() * 800;
  const night = p.name === "dusk";
  const villaW = 420 + r() * 160;
  const vx = 600 - villaW / 2 + (r() - 0.5) * 200;
  const vy = horizon + 40;
  const windows = Array.from({ length: 3 }, (_, i) => {
    const wx = vx + 40 + i * ((villaW - 80) / 3);
    return `<rect x="${wx}" y="${vy + 70}" width="${(villaW - 80) / 3 - 24}" height="120" rx="2" fill="${night ? "#ffd889" : "#24323d"}" opacity="${night ? 0.9 : 0.85}"/>`;
  }).join("");
  const upper = `<rect x="${vx + villaW * 0.35}" y="${vy - 90}" width="${villaW * 0.6}" height="100" fill="${night ? "#d9d4cc" : "#ffffff"}"/>
    <rect x="${vx + villaW * 0.42}" y="${vy - 65}" width="${villaW * 0.4}" height="55" fill="${night ? "#ffd889" : "#24323d"}" opacity=".85"/>
    <rect x="${vx + villaW * 0.3}" y="${vy - 96}" width="${villaW * 0.7}" height="10" fill="${night ? "#bdb6ab" : "#ecebe7"}"/>`;
  const cypress = Array.from({ length: 3 }, (_, i) => {
    const cx = i === 0 ? vx - 60 - r() * 40 : vx + villaW + 40 + i * 50;
    const h = 160 + r() * 80;
    return `<ellipse cx="${cx}" cy="${vy + 230 - h / 2}" rx="${18 + r() * 6}" ry="${h / 2}" fill="${night ? "#1d2a2a" : "#3f5a46"}"/>`;
  }).join("");
  return frame(
    `<defs>${grad("sky", p.sky[0], p.sky[1])}${grad("sea", p.sea[0], p.sea[1])}${grad("pool", "#7fd6e8", "#2aa3c4")}</defs>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <circle cx="${sunX}" cy="${horizon - 140}" r="${night ? 34 : 60}" fill="${p.sun}" opacity="${night ? 1 : 0.9}"/>
     <path d="M0 ${horizon} C 200 ${horizon - 90}, 380 ${horizon - 40}, 520 ${horizon - 20} S 900 ${horizon - 110}, 1200 ${horizon - 30} V ${horizon} Z" fill="${p.hill}" opacity=".7"/>
     <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#sea)"/>
     <rect y="${vy + 200}" width="${W}" height="${H - vy - 200}" fill="${p.sand}"/>
     ${upper}
     <rect x="${vx}" y="${vy}" width="${villaW}" height="210" fill="${night ? "#e3ded6" : "#ffffff"}"/>
     <rect x="${vx - 10}" y="${vy - 6}" width="${villaW + 20}" height="12" fill="${night ? "#bdb6ab" : "#ecebe7"}"/>
     ${windows}
     ${cypress}
     ${pool ? `<rect x="${vx + 30}" y="${vy + 240}" width="${villaW - 60}" height="70" rx="4" fill="url(#pool)"/><rect x="${vx + 30}" y="${vy + 240}" width="${villaW - 60}" height="8" fill="#ffffff" opacity=".5"/>` : ""}
     ${night ? "" : `<rect x="${vx + villaW - 120}" y="${vy + 250}" width="70" height="8" rx="4" fill="#ffffff"/><rect x="${vx + villaW - 190}" y="${vy + 250}" width="60" height="8" rx="4" fill="#ffffff"/>`}`,
  );
}

function living(p: (typeof palettes)[number], r: () => number) {
  const wall = ["#f4f1ec", "#efebe4", "#f6f5f2"][Math.floor(r() * 3)];
  const sofa = ["#d8cfc2", "#b9c4c9", "#cfc6b8", "#a9b3a1"][Math.floor(r() * 4)];
  return frame(
    `<defs>${grad("sky", p.sky[0], p.sky[1])}${grad("sea", p.sea[0], p.sea[1])}</defs>`,
    `<rect width="${W}" height="${H}" fill="${wall}"/>
     <rect x="160" y="110" width="880" height="400" fill="url(#sky)"/>
     <rect x="160" y="330" width="880" height="180" fill="url(#sea)"/>
     <circle cx="${300 + r() * 600}" cy="220" r="40" fill="${p.sun}" opacity=".9"/>
     <rect x="155" y="105" width="890" height="410" fill="none" stroke="#2a2a2a" stroke-width="10"/>
     <line x1="600" y1="105" x2="600" y2="515" stroke="#2a2a2a" stroke-width="8"/>
     <rect y="600" width="${W}" height="200" fill="#d9cdbb"/>
     <rect x="250" y="520" width="560" height="120" rx="26" fill="${sofa}"/>
     <rect x="230" y="560" width="600" height="100" rx="30" fill="${sofa}" opacity=".9"/>
     <rect x="300" y="540" width="120" height="70" rx="18" fill="#ffffff" opacity=".6"/>
     <rect x="640" y="540" width="120" height="70" rx="18" fill="#ffffff" opacity=".45"/>
     <ellipse cx="520" cy="720" rx="190" ry="26" fill="#bfae95"/>
     <rect x="900" y="420" width="6" height="230" fill="#2a2a2a"/>
     <path d="M860 420 h86 l-20 -60 h-46 z" fill="#f2e2c4"/>
     <rect x="980" y="560" width="70" height="90" rx="10" fill="#7a8b6f"/>
     <ellipse cx="1015" cy="520" rx="50" ry="60" fill="#5d7454"/>`,
  );
}

function bedroom(p: (typeof palettes)[number], r: () => number) {
  const wall = ["#eef0ee", "#f3efe9", "#ecebf0"][Math.floor(r() * 3)];
  const linen = ["#ffffff", "#f5f1ea"][Math.floor(r() * 2)];
  const throwC = ["#c9a98a", "#9fb2b8", "#b5a7c2", "#a8b89a"][Math.floor(r() * 4)];
  return frame(
    `<defs>${grad("sky", p.sky[0], p.sky[1])}${grad("sea", p.sea[0], p.sea[1])}</defs>`,
    `<rect width="${W}" height="${H}" fill="${wall}"/>
     <rect x="820" y="120" width="260" height="360" fill="url(#sky)"/>
     <rect x="820" y="330" width="260" height="150" fill="url(#sea)"/>
     <rect x="815" y="115" width="270" height="370" fill="none" stroke="#3a3a3a" stroke-width="8"/>
     <rect y="640" width="${W}" height="160" fill="#cdbfa9"/>
     <rect x="170" y="300" width="560" height="200" rx="14" fill="#cbbba3"/>
     <rect x="140" y="470" width="620" height="170" rx="18" fill="${linen}"/>
     <rect x="140" y="560" width="620" height="80" rx="10" fill="${throwC}"/>
     <rect x="200" y="420" width="200" height="80" rx="24" fill="#ffffff"/>
     <rect x="500" y="420" width="200" height="80" rx="24" fill="#ffffff"/>
     <rect x="40" y="520" width="80" height="120" rx="6" fill="#bda88b"/>
     <circle cx="80" cy="470" r="34" fill="#f2e2c4"/>
     <rect x="76" y="490" width="8" height="30" fill="#3a3a3a"/>`,
  );
}

function view(p: (typeof palettes)[number], r: () => number) {
  const horizon = 380 + r() * 60;
  return frame(
    `<defs>${grad("sky", p.sky[0], p.sky[1])}${grad("sea", p.sea[0], p.sea[1])}</defs>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <circle cx="${200 + r() * 800}" cy="${horizon - 90}" r="70" fill="${p.sun}" opacity=".95"/>
     <path d="M0 ${horizon} L 180 ${horizon - 140} L 330 ${horizon - 60} L 470 ${horizon - 170} L 640 ${horizon - 40} L 640 ${horizon} Z" fill="${p.hill}" opacity=".8"/>
     <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#sea)"/>
     ${Array.from({ length: 7 }, (_, i) => `<rect x="${100 + i * 150 + r() * 40}" y="${horizon + 40 + i * 22}" width="${60 + r() * 80}" height="3" rx="2" fill="#ffffff" opacity=".35"/>`).join("")}
     <rect y="600" width="${W}" height="200" fill="#e9e3d8"/>
     <rect y="560" width="${W}" height="12" fill="#ffffff"/>
     ${Array.from({ length: 13 }, (_, i) => `<rect x="${i * 100 + 20}" y="572" width="8" height="40" fill="#ffffff"/>`).join("")}
     <rect x="760" y="650" width="240" height="14" rx="7" fill="#ffffff"/>
     <rect x="790" y="664" width="8" height="90" fill="#8a7c66"/><rect x="962" y="664" width="8" height="90" fill="#8a7c66"/>
     <circle cx="300" cy="690" r="54" fill="#ffffff"/><rect x="296" y="740" width="8" height="40" fill="#8a7c66"/>`,
  );
}

mkdirSync(OUT, { recursive: true });
for (let i = 1; i <= 24; i++) {
  const r = rng(i * 7919);
  const p = palettes[i % palettes.length];
  const pool = i % 3 !== 0;
  writeFileSync(path.join(OUT, `p${i}-1.svg`), exterior(p, r, pool));
  writeFileSync(path.join(OUT, `p${i}-2.svg`), view(palettes[(i + 1) % palettes.length], r));
  writeFileSync(path.join(OUT, `p${i}-3.svg`), living(palettes[(i + 2) % 3], r));
  writeFileSync(path.join(OUT, `p${i}-4.svg`), bedroom(palettes[i % 3], r));
}
console.log("Generated demo images in", OUT);
