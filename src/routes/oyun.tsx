import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import inventory from "@/lib/herbarium-data.json";
import paths from "@/lib/province-paths.json";
import { judge, pickQuestions, points, rankFor, ROUND_SIZES, MAX_TRIES, type Outcome, type RoundSize } from "@/lib/quiz";
import { HerbBackground } from "@/components/HerbBackground";

export const Route = createFileRoute("/oyun")({
  head: () => ({ meta: [
    { title: "Bitki Harita Oyunu - Etnoherba" },
    { name: "description", content: "Anadolu bitkilerinin yetiştiği illeri Türkiye haritasında bul: rastgele sorularla bilgini test et." },
    { property: "og:title", content: "Bitki Harita Oyunu - Etnoherba" },
    { property: "og:description", content: "Seterra tarzı Türkiye harita oyunu: bitkinin ilini bul." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Game,
});

type Q = { id: string; name: string; sci: string; province: string; provinceName: string };
const pool: Q[] = (inventory.plants as { id: string; turkishName: string; scientificName: string; provinceId?: string; provinceName?: string }[])
  .filter(p => p.provinceId && (paths as Record<string, unknown>)[p.provinceId])
  .map(p => ({ id: p.id, name: p.turkishName, sci: p.scientificName, province: p.provinceId!, provinceName: p.provinceName ?? p.provinceId! }));
const provincePaths = paths as Record<string, { name: string; d: string }>;
const BEST_KEY = "etnoherba-best-score";

function beep(kind: "ok" | "bad" | "fail" | "end") {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx(); const notes = { ok: [660, 880], bad: [220], fail: [300, 200, 140], end: [523, 659, 784, 1047] }[kind];
    notes.forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = kind === "bad" ? "square" : "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.12; g.gain.setValueAtTime(kind === "bad" ? 0.06 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.2); });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* no audio */ }
}
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Animates a number towards its target (used for the score display). */
function useCountUp(value: number, ms = 600) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current, t0 = performance.now(); let raf = 0;
    const tick = (now: number) => { const k = Math.min(1, (now - t0) / ms); const v = Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))); from.current = v; setShown(v); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

type Fx = { id: number; x: number; y: number; kind: "ok" | "bad"; text: string };
let fxId = 0;

function Game() {
  const [size, setSize] = useState<RoundSize | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, Outcome>>({});
  const [reveal, setReveal] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [secs, setSecs] = useState(0);
  const [streak, setStreak] = useState(0); const [best, setBest] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [pop, setPop] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const lock = useRef(false);
  const qStart = useRef(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const done = size !== null && i >= qs.length;
  const shownScore = useCountUp(score);

  useEffect(() => { try { setBestScore(Number(localStorage.getItem(BEST_KEY)) || 0); } catch { /* private mode */ } }, []);
  useEffect(() => { if (size === null || done) return; const t = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(t); }, [size, done]);
  useEffect(() => { qStart.current = performance.now(); }, [i, size]);
  useEffect(() => {
    if (!done || score <= 0) return;
    if (score > bestScore) { setNewRecord(true); setBestScore(score); try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ } }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = qs[i];
  const play = (k: Parameters<typeof beep>[0]) => sound && beep(k);

  const burst = (e: MouseEvent | null, kind: Fx["kind"], text: string) => {
    const box = mapRef.current?.getBoundingClientRect(); if (!box) return;
    const x = e ? e.clientX - box.left : box.width / 2, y = e ? e.clientY - box.top : box.height / 2;
    const id = ++fxId; setFx(list => [...list, { id, x, y, kind, text }]);
    setTimeout(() => setFx(list => list.filter(f => f.id !== id)), 1100);
  };

  const start = (s: RoundSize) => { setSize(s); setQs(pickQuestions(pool, s)); setI(0); setMisses(0); setWrong([]); setResults({}); setReveal(null); setSecs(0); setStreak(0); setBest(0); setScore(0); setNewRecord(false); setFx([]); lock.current = false; };
  const next = (out: Outcome, e: MouseEvent | null, missCount: number) => {
    if (!q) return; lock.current = true;
    setResults(r => ({ ...r, [q.id]: out }));
    const ns = out === "green" ? streak + 1 : 0; setStreak(ns); setBest(b => Math.max(b, ns));
    const gained = points(out, missCount, ns, (performance.now() - qStart.current) / 1000);
    if (gained > 0) { setScore(sc => sc + gained); burst(e, "ok", `+${gained}`); setPop(q.province); }
    setTimeout(() => { setI(n => { if (n + 1 >= qs.length) play("end"); return n + 1; }); setMisses(0); setWrong([]); setReveal(null); setPop(null); lock.current = false; }, out === "red" ? 1800 : 950);
  };
  const click = (pid: string, e: MouseEvent) => {
    if (!q || lock.current || wrong.includes(pid)) return;
    const out = judge(pid === q.province, misses);
    if (out === null) { play("bad"); setMisses(m => m + 1); setWrong(w => [...w, pid]); setShake(s => s + 1); burst(e, "bad", "✗"); return; }
    if (out === "red") { play("fail"); setWrong(w => [...w, pid]); setReveal(q.province); setShake(s => s + 1); burst(e, "bad", "✗"); } else play("ok");
    next(out, e, misses);
  };
  const colors = useMemo(() => { const c: Record<string, Outcome> = {}; qs.slice(0, i).forEach(x => { const r = results[x.id]; if (r) c[x.province] = r; }); if (q && results[q.id]) c[q.province] = results[q.id]!; return c; }, [qs, i, results, q]);
  const count = (o: Outcome) => Object.values(results).filter(r => r === o).length;
  const accuracy = Math.round(((count("green") + count("yellow") * 0.5) / Math.max(qs.length, 1)) * 100);
  const progress = qs.length ? (Math.min(i, qs.length) / qs.length) * 100 : 0;
  const rank = rankFor(accuracy);

  return (
    <>
    <HerbBackground />
    <main className="game">
      <header className="game-top">
        <Link to="/" className="game-back">← Haritaya dön</Link>
        <h1>Bitki Harita Oyunu</h1>
        <div className="game-top-right">
          {bestScore > 0 && <span className="game-best" title="Bu cihazdaki en yüksek skorun">En iyi: <b>{bestScore.toLocaleString("tr-TR")}</b></span>}
          <button className="game-chip" onClick={() => setSound(s => !s)} aria-label="Ses">{sound ? "🔊 Ses açık" : "🔇 Ses kapalı"}</button>
        </div>
      </header>

      {size === null ? (
        <section className="game-card game-start game-enter">
          <p>Sana rastgele bir bitki soracağız; yetiştiği ili haritada bul. İlk denemede doğruysa <b className="t-green">yeşil</b>, 2. veya 3. denemede <b className="t-yellow">sarı</b>, {MAX_TRIES} yanlışta <b className="t-red">kırmızı</b> yanar ve doğru il gösterilir.</p>
          <ul className="game-rules">
            <li><b>100</b> puan ilk denemede</li>
            <li><b>60 / 30</b> puan 2. / 3. denemede</li>
            <li><b>+10</b> her seri adımı için (en fazla +50)</li>
            <li><b>+20</b> 5 saniyenin altında bilirsen</li>
          </ul>
          <p>Kaç soru olsun? (Toplam {pool.length} bitki)</p>
          <div className="game-sizes">{ROUND_SIZES.map(s => <button key={s} className="game-btn" onClick={() => start(s)}>{s === "all" ? `Tüm bitkiler (${pool.length})` : `${s} soru`}</button>)}</div>
        </section>
      ) : done ? (
        <section className="game-card game-start game-end game-enter">
          {newRecord && <span className="game-record">Yeni rekor</span>}
          <small className="game-label">Toplam skor</small>
          <div className="game-final tabular">{shownScore.toLocaleString("tr-TR")}</div>
          <p className="game-rank">{rank} · İsabet %{accuracy}</p>
          <div className="game-stats"><span className="t-green">✔ {count("green")} ilk denemede</span><span className="t-yellow">● {count("yellow")} sonradan</span><span className="t-red">✖ {count("red")} bilinemedi</span><span>⏱ {fmt(secs)}</span><span>🔥 En uzun seri: {best}</span></div>
          <div className="game-sizes"><button className="game-btn" onClick={() => start(size)}>Tekrar oyna</button><button className="game-chip" onClick={() => setSize(null)}>Soru sayısını değiştir</button></div>
          <ul className="game-review">{qs.map(x => <li key={x.id} className={`r-${results[x.id]}`}><b>{x.name}</b> — {x.provinceName}</li>)}</ul>
        </section>
      ) : q && (
        <section key={shake} className={"game-card game-q" + (shake ? " game-shake" : "")} aria-live="polite">
          <div className="game-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          <div key={q.id} className="game-q-body">
            <small>Soru {i + 1}/{qs.length} · Kalan hak <span className="game-hearts">{Array.from({ length: MAX_TRIES }, (_, k) => <i key={k} className={k < MAX_TRIES - misses ? "on" : ""} />)}</span> · ⏱ {fmt(secs)}</small>
            <h2>{q.name}</h2><i>{q.sci}</i>
            {reveal && <p className="t-red">Doğru il: {q.provinceName}</p>}
          </div>
          <div className="game-q-side">
            <div className="game-score" aria-label={`Skor ${score}`}><small>Skor</small><b className="tabular">{shownScore.toLocaleString("tr-TR")}</b></div>
            {streak >= 2 && <span key={streak} className="game-streak">🔥 x{streak}</span>}
            <button className="game-chip" onClick={() => { if (!lock.current) { setReveal(q.province); play("fail"); next("red", null, misses); } }}>Pas geç</button>
          </div>
        </section>
      )}

      <div className="game-map" ref={mapRef}>
        <svg viewBox="0 0 1566 783" role="img" aria-label="Türkiye illeri haritası">
          <defs>
            <filter id="g-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {Object.entries(provincePaths).map(([id, p]) => (
            <path key={id} d={p.d} onClick={e => click(id, e)}
              className={["prov", colors[id] ? `p-${colors[id]}` : "", wrong.includes(id) && reveal === null ? "p-wrong" : "", reveal === id ? "p-reveal" : "", pop === id ? "p-pop" : ""].join(" ")}>
              <title>{size === null || done ? p.name : ""}</title>
            </path>))}
        </svg>
        {fx.map(f => (
          <div key={f.id} className={`game-fx fx-${f.kind}`} style={{ left: f.x, top: f.y }}>
            <span className="fx-text">{f.text}</span>
            {f.kind === "ok" && Array.from({ length: 7 }, (_, k) => <i key={k} className="fx-leaf" style={{ "--a": `${k * (360 / 7) + 10}deg` } as CSSProperties} />)}
          </div>
        ))}
      </div>
    </main>
    </>
  );
}
