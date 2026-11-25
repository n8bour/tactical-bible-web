import { Button } from '@ui-sdk/react/button';
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import type { ReactNode } from 'react';
import type { LabApi } from './useLab';

const PHASE_LABEL: Record<string, string> = {
  build: 'Build-up', prog: 'Progression', final: 'Final third', loss: 'Just lost the ball', oop: 'Defending', win: 'Just won the ball',
};

/** Pitch canvas, transport row and legend shared by the tactics board, the role explorer and the sandbox. */
export function Stage({ lab, legend, children }: { lab: LabApi; legend?: ReactNode; children?: ReactNode }) {
  const w = lab.world.current;
  return (
    <div className="stage">
      <div className="lab-canvas" ref={lab.host} />
      <div className="lab-transport">
        <Button onClick={() => lab.setPlaying(!lab.playing)}>{lab.playing ? 'Pause' : 'Play'}</Button>
        <Button onClick={lab.restart}>Restart</Button>
        <Button onClick={lab.stepOnce}>Step</Button>
        <SegmentedControl aria-label="Speed" value={String(lab.speed)} onValueChange={(v) => v && lab.setSpeed(Number(v))}>
          <SegmentedControlIndicator />
          <SegmentedControlItem value="0.5">0.5×</SegmentedControlItem>
          <SegmentedControlItem value="1">1×</SegmentedControlItem>
          <SegmentedControlItem value="2">2×</SegmentedControlItem>
        </SegmentedControl>
        <span className="lab-time">{w ? `${w.t.toFixed(1)} s · ${PHASE_LABEL[w.phase[0]]}` : ''}</span>
      </div>
      <div className="legend" aria-hidden="true">
        <span style={{ '--dot': '#38bdf8' } as React.CSSProperties}>Your team (attacks →)</span>
        <span style={{ '--dot': '#f87171' } as React.CSSProperties}>Opponent</span>
        <span style={{ '--dot': '#facc15' } as React.CSSProperties}>Selected player</span>
        {lab.compare && <span style={{ '--dot': 'rgba(255,255,255,0.45)' } as React.CSSProperties}>Faded: comparison</span>}
        {legend}
      </div>
      {children}
    </div>
  );
}
