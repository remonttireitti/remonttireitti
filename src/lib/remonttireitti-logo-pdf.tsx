import {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
} from "@react-pdf/renderer";

/** Remonttireitti-logo PDF:ille (react-pdf Svg, ei tiedostojärjestelmää). */
export function RemonttireittiLogoPdf({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="logo-grad" x1="4" y1="4" x2="36" y2="36">
          <Stop offset="0" stopColor="#0284c7" />
          <Stop offset="1" stopColor="#0369a1" />
        </LinearGradient>
        <LinearGradient id="route-grad" x1="8" y1="28" x2="32" y2="12">
          <Stop offset="0" stopColor="#fb923c" />
          <Stop offset="1" stopColor="#ea580c" />
        </LinearGradient>
      </Defs>
      <Rect width={40} height={40} rx={11} fill="url(#logo-grad)" />
      <Path
        d="M10 19.5 20 11l10 8.5V29H10v-9.5Z"
        fill="#fff"
        fillOpacity={0.95}
      />
      <Path
        d="M14 26.5c3-4 9-4 12 0"
        stroke="url(#route-grad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={20} cy={24} r={2} fill="#ea580c" />
    </Svg>
  );
}
