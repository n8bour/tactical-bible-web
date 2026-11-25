import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'good' | 'warn' | 'bad';

export interface LegendItem {
  color: string;
  label: string;
  hollow?: boolean;
  square?: boolean;
}

export function Legend(props: { items: LegendItem[] }) {
  return (
    <ul className="board-legend">
      {props.items.map((i) => (
        <li key={i.label} style={{ '--dot': i.color } as CSSProperties} data-hollow={i.hollow ? '' : undefined} data-square={i.square ? '' : undefined}>
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Shared card for every concept board: optional controls, the picture, a live readout and a caption. */
export function Frame(props: {
  caption: string;
  children: ReactNode;
  controls?: ReactNode;
  readout?: { text: string; tone: Tone };
  legend?: LegendItem[];
  /** Keep the card narrow, for half-pitch pictures. */
  half?: boolean;
}) {
  return (
    <figure className="diagram board">
      {props.controls && <div className="board-controls">{props.controls}</div>}
      <div className={props.half ? 'board-stage board-half' : 'board-stage'}>{props.children}</div>
      {props.legend && <Legend items={props.legend} />}
      {props.readout && (
        <p className="board-readout" data-tone={props.readout.tone} role="status" aria-live="polite">
          {props.readout.text}
        </p>
      )}
      <figcaption>{props.caption}</figcaption>
    </figure>
  );
}
