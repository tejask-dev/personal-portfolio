/** Original line drawings. They also provide stable, silent encounter equivalents. */
export default function FieldIllustration({
  kind,
  active = false,
  className = "",
}: {
  kind: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`exp-illustration ${className}`}
      viewBox="0 0 240 144"
      role="img"
      aria-label={`${kind} field illustration${active ? ", selected state" : ""}`}
    >
      <defs>
        <pattern
          id={`lines-${kind}`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 12 12 0" stroke="currentColor" opacity=".06" />
        </pattern>
      </defs>
      <rect
        x="8"
        y="8"
        width="224"
        height="128"
        rx="64"
        fill={`url(#lines-${kind})`}
      />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "dolphin" ? (
          <>
            <path
              d="M33 83c27-33 62-43 88-25l21-23 6 36c18 10 31 16 48 18l22-13-7 17 13 12-30-2c-26 8-53-6-71-13l-8 22-16-26c-22-8-40-5-59 2l-16 1Z"
              fill="currentColor"
              fillOpacity=".09"
            />
            <path d="M48 77c9 1 15 3 18 8M97 84c25 8 58 16 77 12" />
            <circle cx="65" cy="70" r="2.5" fill="currentColor" />
          </>
        ) : kind === "lighthouse" ? (
          <>
            <path d="m100 114 9-65h24l10 65Zm3-22h36m-34-13h31m-25-30V26h20v23M102 27l19-14 19 14ZM102 49h37M82 115h79M115 115V98h12v17" />
            <path
              d="m139 32 55-16v41l-55-17m-37-8L47 16v41l55-17"
              opacity=".3"
            />
            <path d="M31 123c18-8 22 8 40 0s22 8 40 0 22 8 40 0 22 8 40 0" />
          </>
        ) : kind === "octopus" ? (
          <>
            <path
              d="M91 70c-16-57 76-59 57 0-4 13-12 16-26 16S96 84 91 70Z"
              fill="currentColor"
              fillOpacity={active ? ".25" : ".07"}
            />
            <path d="M97 77c-34 48-51 21-37 11m46-7c-17 45-32 53-36 32m44-28c-4 40 10 48 15 26m4-28c17 48 40 44 34 20m-24-35c42 45 55 15 35 7" />
            <circle cx="108" cy="63" r="3" fill="currentColor" />
            <circle cx="133" cy="63" r="3" fill="currentColor" />
          </>
        ) : kind === "fish" || kind === "cleaner" ? (
          <>
            {(kind === "cleaner"
              ? [
                  [120, 72, 1.5],
                  [63, 97, 0.6],
                ]
              : active
                ? [
                    [58, 38, 0.8],
                    [149, 27, 0.7],
                    [60, 108, 0.8],
                    [175, 106, 0.8],
                    [187, 62, 0.7],
                  ]
                : [
                    [65, 50, 0.8],
                    [133, 50, 1],
                    [94, 92, 0.8],
                    [174, 89, 0.7],
                  ]
            ).map(([x, y, s], i) => (
              <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
                <path
                  d="M-28 0Q0-28 26 0 0 27-28 0Zm0 0-14-13v26ZM-3-13 5-23 12-11"
                  fill="currentColor"
                  fillOpacity=".12"
                />
                <circle cx="14" cy="-3" r="2" fill="currentColor" />
              </g>
            ))}
          </>
        ) : kind === "reef" || kind === "current" ? (
          <>
            <path d="M24 110c23-3 34 5 44-8V68c1-39 93-39 94 0v29l51 15M85 105V74c0-24 57-25 57 0v30M40 109V82m0 16-12-8m12 0 12-13m142 29V71m0 17 13-10m-13 18-14-9" />
            <path
              d="M34 32c24-14 38 14 63 0s38 14 63 0 31 4 46 0M23 125c57-20 111 11 195-6"
              opacity=".4"
            />
            {kind === "current" && (
              <path d="M34 70c29-24 82 55 174-9m-18 0h18v18" strokeWidth="3" />
            )}
          </>
        ) : kind === "photo" ? (
          <>
            <rect x="55" y="45" width="130" height="73" rx="8" />
            <path d="m86 45 10-18h48l10 18M169 57h5" />
            <circle cx="121" cy="80" r="27" />
            <circle cx="121" cy="80" r="20" />
            <path d="M35 34V17h22m126 0h22v17M35 110v17h22m126 0h22v-17" />
          </>
        ) : kind === "radio" ? (
          <>
            <rect x="46" y="50" width="148" height="70" rx="8" />
            <path d="M171 50 188 16M59 64h96v12H59Zm2 29h63m-63 8h63m-63 8h63" />
            <circle cx="167" cy="99" r="13" />
            <path d="m167 99 7-7M92 36c14-17 28-17 43 0m-34-1c9-8 15-8 24 0" />
          </>
        ) : kind === "artifact" ? (
          <>
            <rect x="19" y="44" width="46" height="56" rx="3" />
            <path d="M29 58h26m-26 12h26m-26 12h26M75 72h20m-7-6 7 6-7 6" />
            <rect x="99" y="44" width="44" height="56" rx="3" />
            <path d="m108 63 7 9-7 9m15 0h10M153 72h20m-7-6 7 6-7 6" />
            <rect x="177" y="44" width="46" height="56" rx="3" />
            <path d="M187 58h26m-26 13h15m-15 13h22" />
          </>
        ) : kind === "race" ? (
          <>
            <path d="m29 115 92-39h72l-92 39Zm92-39V54h72v22M52 82V26m0 0c28-15 35 17 64 0v32c-29 16-36-16-64 0M130 30v23m0-23h18m-9-6 9 6-9 6" />
            <path d="M155 104c15-5 20 8 37 0s20 8 34 0" />
          </>
        ) : (
          <>
            <circle cx="120" cy="72" r="48" />
            <circle cx="120" cy="72" r="37" opacity=".3" />
            <path d="m120 29 10 43-10 43-10-43Z" />
            <path d="M120 17v10m0 89v11M65 72h10m90 0h10" />
            <text
              x="117"
              y="12"
              fill="currentColor"
              stroke="none"
              fontSize="10"
            >
              N
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
