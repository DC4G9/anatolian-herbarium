import type { CSSProperties } from "react";

/** Etnoherba ambient background: soft blurred botanical light, topographic
 *  contour lines (atlas feel) and drifting leaves at different depths.
 *  Pure SVG/CSS so it works on every page without icon fonts. */
const LEAF = "M12 2C6 6 3.5 11 4 16.5c.3 3 2.4 5.5 5.5 5.5 0 0 .5-6 2.5-10-1 4.5-1 8-1 10 6 0 9-4.5 9-9.5C20 7.5 16.5 4 12 2Z";
const SPRIG = "M12 22V9m0 4c-3 0-6-2-6-6 3 0 6 2 6 6Zm0-3c0-3 2.5-6 6-6 0 3.5-2.5 6-6 6Zm0-4c-1.6-1.6-1.6-4.4 0-6 1.6 1.6 1.6 4.4 0 6Z";

type Leaf = { d: string; style: CSSProperties; depth: 1 | 2 | 3; sprig?: boolean };
const leaves: Leaf[] = [
  { d: LEAF, depth: 1, style: { left: "5%", top: "15%", width: 30, rotate: "-20deg" } },
  { d: SPRIG, depth: 2, sprig: true, style: { left: "3%", top: "63%", width: 34 } },
  { d: LEAF, depth: 2, style: { right: "6%", top: "27%", width: 36, rotate: "35deg" } },
  { d: SPRIG, depth: 1, sprig: true, style: { right: "9%", top: "77%", width: 28 } },
  { d: LEAF, depth: 1, style: { left: "47%", top: "45%", width: 20, rotate: "70deg" } },
  { d: LEAF, depth: 3, style: { left: "20%", top: "84%", width: 64, rotate: "-55deg" } },
  { d: LEAF, depth: 3, style: { right: "22%", top: "6%", width: 72, rotate: "120deg" } },
  { d: SPRIG, depth: 3, sprig: true, style: { left: "80%", top: "50%", width: 60 } },
];

export function HerbBackground() {
  return (
    <div className="eh-bg" aria-hidden="true">
      <div className="eh-aurora a1" />
      <div className="eh-aurora a2" />
      <div className="eh-aurora a3" />
      <div className="eh-aurora a4" />
      <div className="eh-contour" />
      {leaves.map((l, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`eh-leaf d${l.depth}`} style={{ ...l.style, animationDelay: `${-i * 3.7}s` }}>
          <path d={l.d} className={l.sprig ? "eh-sprig" : undefined} />
        </svg>
      ))}
      <div className="eh-vignette" />
      <div className="eh-grain" />
    </div>
  );
}
