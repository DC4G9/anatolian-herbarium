/** Restrained botanical-paper backdrop with a subtle atlas contour layer. */
export function HerbBackground() {
  return (
    <div className="eh-bg" aria-hidden="true">
      <div className="eh-paper-light" />
      <div className="eh-contour" />
      <svg className="eh-engraving engraving-east" viewBox="0 0 260 360" fill="none">
        <g stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
          <path d="M210 344C191 300 181 254 166 209 148 156 124 105 73 42" />
          <path d="M176 246c-45 5-78-11-97-45 41-4 74 11 97 45Z" />
          <path d="M155 190c-4-40 12-70 47-91 4 38-12 69-47 91Z" />
          <path d="M133 143c-39 1-68-17-87-53 39 0 68 18 87 53Z" />
          <path d="M112 108c-2-36 13-64 44-83 2 35-12 63-44 83Z" />
          <path d="M185 278c-34-4-58-23-70-58 34 4 58 22 70 58Z" />
          <path d="M90 74c-22-5-38-19-47-43 23 5 38 19 47 43Z" />
          <path d="M165 210c-15-13-26-30-31-50M137 153c-15-10-28-25-38-45M175 269c-16-9-29-24-38-42" />
        </g>
      </svg>
      <svg className="eh-engraving engraving-west" viewBox="0 0 250 330" fill="none">
        <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M28 310c31-52 57-105 77-161 14-39 30-77 57-118" />
          <path d="M83 218c-35 7-63-4-83-33 33-7 61 4 83 33Z" />
          <path d="M105 159c-5-33 8-59 38-78 5 32-8 58-38 78Z" />
          <path d="M128 112c-33 1-57-14-73-44 33-1 57 14 73 44Z" />
          <path d="M148 74c-1-30 12-53 38-69 2 29-11 52-38 69Z" />
          <path d="M62 258c-26 5-48-4-63-25 25-5 47 4 63 25Z" />
          <path d="M95 191c-12-10-21-23-25-38M119 134c-13-9-24-21-32-37M75 240c-12-7-21-17-27-30" />
        </g>
      </svg>
      <div className="eh-grain" />
    </div>
  );
}
