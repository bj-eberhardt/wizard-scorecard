export interface Player {
  name: string;
  predictions: number[];
  adjustedPredictions?: number[];
  results: number[];
  points: number[];
  wolkeUsed: boolean[];
  receivedResults: number[];
}

export type OverlayState = 'prediction' | 'result' | 'none';

export type IntroOverlay = Exclude<OverlayState, 'none'>;

export interface IntroTransition {
  target: IntroOverlay;
  carryToNextResult: boolean;
}
