import type { ComponentType } from 'react';
import AsymmetryBoard from './boards/asymmetry';
import BoxBoard from './boards/box';
import ComplexityBoard from './boards/complexity';
import CreativityBoard from './boards/creativity';
import EffectivenessBoard from './boards/effectiveness';
import IpOopBoard from './boards/ip_oop';
import OutletsBoard from './boards/outlets';
import PressCohBoard from './boards/press_coh';
import RestDefBoard from './boards/rest_def';
import WidthBoard from './boards/width';

export interface ConceptBoard {
  Board: ComponentType;
  /** Interactive boards hydrate as islands; the others render to plain HTML/SVG. */
  interactive: boolean;
}

/** Concept key -> its explanatory board. ConceptBoard.astro renders it; keep both in step when adding a concept. */
export const BOARDS: Record<string, ConceptBoard> = {
  ip_oop: { Board: IpOopBoard, interactive: true },
  rest_def: { Board: RestDefBoard, interactive: true },
  width: { Board: WidthBoard, interactive: true },
  box: { Board: BoxBoard, interactive: true },
  press_coh: { Board: PressCohBoard, interactive: true },
  outlets: { Board: OutletsBoard, interactive: true },
  creativity: { Board: CreativityBoard, interactive: false },
  asymmetry: { Board: AsymmetryBoard, interactive: false },
  complexity: { Board: ComplexityBoard, interactive: false },
  effectiveness: { Board: EffectivenessBoard, interactive: false },
};
