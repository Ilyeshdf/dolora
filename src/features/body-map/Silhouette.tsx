/**
 * Front-view silhouette traced from the A11 artboard (figure coordinates, viewBox below).
 * Drawn twice — a stroked pass then a filled pass — so overlapping parts read as one outline.
 * No photorealistic anatomy (§10.1 prohibited list).
 */
import { FIGURE_VIEWBOX } from './figure';

const SHAPES = (
  <>
    <ellipse cx="786" cy="128" rx="46" ry="54" />
    <rect x="768" y="160" width="38" height="78" rx="6" />
    {/* torso */}
    <path d="M708 225 C740 216 832 216 865 225 C890 232 898 250 900 280 L878 395 L878 560 L696 560 L695 395 L672 280 C675 250 683 232 708 225 Z" />
    {/* left arm (viewer's left) */}
    <path d="M702 231 C678 240 668 262 664 300 L638 450 L600 640 L636 646 L680 450 L697 392 Z" />
    <ellipse cx="617" cy="628" rx="21" ry="38" />
    {/* right arm with the wristband hand */}
    <path d="M870 231 C896 240 905 262 909 300 L931 390 L962 560 L980 620 L942 628 L918 548 L896 450 L878 395 Z" />
    <ellipse cx="968" cy="655" rx="28" ry="44" transform="rotate(-16 968 655)" />
    {/* legs */}
    <path d="M698 552 L776 552 L773 932 L705 932 Z" />
    <path d="M797 552 L876 552 L868 932 L800 932 Z" />
    <ellipse cx="723" cy="944" rx="34" ry="14" />
    <ellipse cx="851" cy="944" rx="34" ry="14" />
  </>
);

export function Silhouette({ className }: { className?: string }) {
  const { x, y, w, h } = FIGURE_VIEWBOX;
  return (
    <svg aria-hidden viewBox={`${x} ${y} ${w} ${h}`} className={className} preserveAspectRatio="xMidYMin meet">
      <g className="fill-body-stroke stroke-body-stroke" strokeWidth="3" strokeLinejoin="round">
        {SHAPES}
      </g>
      <g className="fill-body-fill">{SHAPES}</g>
    </svg>
  );
}
