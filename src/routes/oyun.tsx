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

type Language = "tr" | "en";
type Q = { id: string; name: string; nameEn: string; sci: string; province: string; provinceName: string };
const englishPlants = inventory.english as Record<string, { name?: string }>;
const pool: Q[] = (inventory.plants as { id: string; turkishName: string; scientificName: string; provinceId?: string; provinceName?: string }[])
  .filter(p => p.provinceId && (paths as Record<string, unknown>)[p.provinceId])
  .map(p => ({ id: p.id, name: p.turkishName, nameEn: englishPlants[p.id]?.name ?? p.turkishName, sci: p.scientificName, province: p.provinceId!, provinceName: p.provinceName ?? p.provinceId! }));
const provincePaths = paths as Record<string, { name: string; d: string }>;
const BEST_KEY = "etnoherba-best-score";
const LANG_KEY = "etnoherba-lang";

const copy = {
  tr: {
    title: "Bitki Harita Oyunu", back: "Haritaya dön", language: "Dil seçimi",
    bestTitle: "Bu cihazdaki en yüksek skorun", bestLabel: "En iyi:", soundOn: "Ses açık", soundOff: "Ses kapalı", soundAria: "Ses",
    intro: `Rastgele bir bitki soracağız; yetiştiği ili haritada bul. İlk denemede doğru cevap yeşil, 2. veya 3. denemede sarı olur. ${MAX_TRIES} yanlış tahminden sonra doğru il gösterilir.`,
    rules: ["puan ilk denemede", "puan 2. denemede", "puan 3. denemede", "her seri adımı için (en fazla +50)", "5 saniyenin altında bilirsen"],
    countPrompt: "Kaç soru olsun?", plants: "bitki", questions: "soru", allPlants: "Tüm bitkiler",
    newRecord: "Yeni rekor", totalScore: "Toplam skor", accuracy: "İsabet", firstTry: "ilk denemede", later: "sonradan", unknown: "bilinemedi", time: "Süre", longestStreak: "En uzun seri",
    playAgain: "Tekrar oyna", changeCount: "Soru sayısını değiştir", answerReview: "Yanıtlar", question: "Soru", attemptsLeft: "Kalan hak", skip: "Pas geç", correctProvince: "Doğru il", mapAria: "Türkiye illeri haritası",
    roundDone: "Tur tamamlandı", rankNovice: "Çırak Herbaryumcu", rankExplorer: "Botanik Gezgini", rankExpert: "Herbaryum Uzmanı", rankNaturalist: "Anadolu Etnobotanikçisi",
  },
  en: {
    title: "Plant map game", back: "Back to the map", language: "Language",
    bestTitle: "Your highest score on this device", bestLabel: "Best:", soundOn: "Sound on", soundOff: "Sound off", soundAria: "Sound",
    intro: `We’ll show you a plant at random; find its province on the map. A first-try answer turns green, a second- or third-try answer turns yellow. After ${MAX_TRIES} wrong guesses, the correct province is revealed.`,
    rules: ["points on the first try", "points on the second try", "points on the third try", "for each streak step (up to +50)", "if you answer in under 5 seconds"],
    countPrompt: "Choose a round size", plants: "plants", questions: "questions", allPlants: "All plants",
    newRecord: "New record", totalScore: "Total score", accuracy: "Accuracy", firstTry: "first try", later: "after retries", unknown: "not identified", time: "Time", longestStreak: "Longest streak",
    playAgain: "Play again", changeCount: "Change round size", answerReview: "Answer review", question: "Question", attemptsLeft: "Attempts left", skip: "Skip", correctProvince: "Correct province", mapAria: "Map of the provinces of Türkiye",
    roundDone: "Round complete", rankNovice: "Herbarium apprentice", rankExplorer: "Botanical explorer", rankExpert: "Herbarium specialist", rankNaturalist: "Anatolian ethnobotanist",
  },
};

function beep(kind: "ok" | "bad" | "fail" | "end") {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx(); const notes = { ok: [660, 880], bad: [220], fail: [300, 200, 140], end: [523, 659, 784, 1047] }[kind];
    notes.forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = kind === "bad" ? "square" : "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.12; g.gain.setValueAtTime(kind === "bad" ? 0.06 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.2); });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* audio is optional */ }
}
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

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
  const [lang, setLang] = useState<Language>("tr");
  const t = copy[lang];
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

  useEffect(() => { document.title = `${lang === "en" ? "Plant map game" : "Bitki Harita Oyunu"} - Etnoherba`; }, [lang]);
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      if (savedLang === "en" || savedLang === "tr") setLang(savedLang);
      setBestScore(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => { if (size === null || done) return; const timer = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(timer); }, [size, done]);
  useEffect(() => { qStart.current = performance.now(); }, [i, size]);
  useEffect(() => {
    if (!done || score <= 0) return;
    if (score > bestScore) { setNewRecord(true); setBestScore(score); try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ } }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = qs[i];
  const play = (k: Parameters<typeof beep>[0]) => sound && beep(k);
  const setLanguage = (next: Language) => { setLang(next); try { localStorage.setItem(LANG_KEY, next); } catch { /* storage unavailable */ } };

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
  const rank = lang === "en" ? (accuracy >= 90 ? t.rankNaturalist : accuracy >= 70 ? t.rankExpert : accuracy >= 45 ? t.rankExplorer : t.rankNovice) : rankFor(accuracy);
  const locale = lang === "en" ? "en-US" : "tr-TR";

  return (
    <>
      <HerbBackground />
      <main className="game">
        <header className="game-top">
          <Link to="/" className="game-back">← {t.back}</Link>
          <h1>{t.title}</h1>
          <div className="game-top-right">
            {bestScore > 0 && <span className="game-best" title={t.bestTitle}>{t.bestLabel} <b>{bestScore.toLocaleString(locale)}</b></span>}
            <div className={"game-language-toggle" + (lang === "en" ? " is-en" : "")} role="group" aria-label={t.language}>
              <span className="language-switcher-thumb" aria-hidden="true" />
              <button type="button" aria-pressed={lang === "tr"} onClick={() => setLanguage("tr")}>TR</button>
              <button type="button" aria-pressed={lang === "en"} onClick={() => setLanguage("en")}>EN</button>
            </div>
            <button className="game-chip" onClick={() => setSound(s => !s)} aria-label={t.soundAria}>{sound ? t.soundOn : t.soundOff}</button>
          </div>
        </header>

        {size === null ? (
          <section className="game-card game-start game-enter">
            <p>{t.intro}</p>
            <ul className="game-rules">
              <li><b>100</b> {t.rules[0]}</li>
              <li><b>60</b> {t.rules[1]} · <b>30</b> {t.rules[2]}</li>
              <li><b>+10</b> {t.rules[3]}</li>
              <li><b>+20</b> {t.rules[4]}</li>
            </ul>
            <p>{t.countPrompt} ({pool.length} {t.plants})</p>
            <div className="game-sizes">{ROUND_SIZES.map(s => <button key={s} className="game-btn" onClick={() => start(s)}>{s === "all" ? `${t.allPlants} (${pool.length})` : `${s} ${t.questions}`}</button>)}</div>
          </section>
        ) : done ? (
          <section className="game-card game-start game-end game-enter">
            {newRecord && <span className="game-record">{t.newRecord}</span>}
            <small className="game-label">{t.totalScore}</small>
            <div className="game-final tabular">{shownScore.toLocaleString(locale)}</div>
            <p className="game-rank">{rank} · {t.accuracy} {lang === "en" ? `${accuracy}%` : `%${accuracy}`}</p>
            <div className="game-stats"><span className="t-green">✔ {count("green")} {t.firstTry}</span><span className="t-yellow">● {count("yellow")} {t.later}</span><span className="t-red">✖ {count("red")} {t.unknown}</span><span>⏱ {t.time} {fmt(secs)}</span><span>🔥 {t.longestStreak}: {best}</span></div>
            <div className="game-sizes"><button className="game-btn" onClick={() => start(size)}>{t.playAgain}</button><button className="game-chip" onClick={() => setSize(null)}>{t.changeCount}</button></div>
            <h3 className="game-review-heading">{t.answerReview}</h3>
            <ul className="game-review">{qs.map(x => <li key={x.id} className={`r-${results[x.id]}`}><b>{lang === "en" ? x.nameEn : x.name}</b> — {x.provinceName}</li>)}</ul>
          </section>
        ) : q && (
          <section key={shake} className={"game-card game-q" + (shake ? " game-shake" : "")} aria-live="polite">
            <div className="game-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
            <div key={q.id} className="game-q-body">
              <small>{t.question} {i + 1}/{qs.length} · {t.attemptsLeft} <span className="game-hearts">{Array.from({ length: MAX_TRIES }, (_, k) => <i key={k} className={k < MAX_TRIES - misses ? "on" : ""} />)}</span> · ⏱ {fmt(secs)}</small>
              <h2>{lang === "en" ? q.nameEn : q.name}</h2><i>{q.sci}</i>
              {reveal && <p className="t-red">{t.correctProvince}: {q.provinceName}</p>}
            </div>
            <div className="game-q-side">
              <div className="game-score" aria-label={`${t.totalScore}: ${score}`}><small>{t.totalScore}</small><b className="tabular">{shownScore.toLocaleString(locale)}</b></div>
              {streak >= 2 && <span key={streak} className="game-streak">🔥 x{streak}</span>}
              <button className="game-chip" onClick={() => { if (!lock.current) { setReveal(q.province); play("fail"); next("red", null, misses); } }}>{t.skip}</button>
            </div>
          </section>
        )}

        <div className="game-map" ref={mapRef}>
          <svg viewBox="0 0 1566 783" role="img" aria-label={t.mapAria}>
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
