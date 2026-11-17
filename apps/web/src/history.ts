import type { SpecInput } from "@tin.so/core";

// Changes closer together than this, in ms, are one step: the keys of a word, the moves of a drag
const STEP_GAP = 500;
// The oldest steps go away when the history has more than this
const MAX_STEPS = 100;

function same(a: SpecInput, b: SpecInput): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The undo and redo history of the spec. Each step keeps the spec before it. A step starts with a
 * change and takes the next changes until a pause, so that a drag or a typed word is one step.
 */
export class SpecHistory {
  private past: Array<SpecInput> = [];
  private future: Array<SpecInput> = [];
  private current: SpecInput;
  // The spec where the open step started, and the time of its last change
  private stepStart: SpecInput | undefined;
  private stepTime = 0;

  constructor(spec: SpecInput) {
    this.current = spec;
  }

  get canUndo(): boolean {
    return (
      this.past.length > 0 || (this.stepStart !== undefined && !same(this.stepStart, this.current))
    );
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Starts a new history, for an image that opens */
  reset(spec: SpecInput): void {
    this.past = [];
    this.future = [];
    this.current = spec;
    this.stepStart = undefined;
  }

  /** Records a change. `now` is the time of the change in ms. */
  change(spec: SpecInput, now: number): void {
    if (this.stepStart === undefined || now - this.stepTime > STEP_GAP) {
      this.closeStep();
      this.stepStart = this.current;
    }
    this.stepTime = now;
    this.current = spec;
    this.future = [];
  }

  /** Goes one step back, and gives the spec to show, or undefined when there is no step */
  undo(): SpecInput | undefined {
    this.closeStep();
    const spec = this.past.pop();
    if (spec === undefined) return undefined;
    this.future.push(this.current);
    this.current = spec;
    return spec;
  }

  /** Goes one step forward again, and gives the spec to show, or undefined when there is no step */
  redo(): SpecInput | undefined {
    this.closeStep();
    const spec = this.future.pop();
    if (spec === undefined) return undefined;
    this.past.push(this.current);
    this.current = spec;
    return spec;
  }

  private closeStep(): void {
    if (this.stepStart !== undefined && !same(this.stepStart, this.current)) {
      this.past.push(this.stepStart);
      if (this.past.length > MAX_STEPS) this.past.shift();
    }
    this.stepStart = undefined;
  }
}
