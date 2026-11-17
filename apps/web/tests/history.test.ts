import type { SpecInput } from "@tin.so/core";
import { describe, expect, test } from "vite-plus/test";
import { SpecHistory } from "../src/history.ts";

const spec = (padding: number): SpecInput => ({ padding, windows: [{ panes: [{ code: "a" }] }] });

describe("SpecHistory", () => {
  test("should undo a change to the spec before it", () => {
    // Arrange
    const history = new SpecHistory(spec(64));
    history.change(spec(32), 0);

    // Act
    const result = history.undo();

    // Assert
    expect(result).toEqual(spec(64));
  });

  test("should redo a change that was undone", () => {
    // Arrange
    const history = new SpecHistory(spec(64));
    history.change(spec(32), 0);
    history.undo();

    // Act
    const result = history.redo();

    // Assert
    expect(result).toEqual(spec(32));
  });

  test("should undo changes that come quickly after each other as one step", () => {
    // Arrange
    const history = new SpecHistory(spec(64));
    history.change(spec(60), 0);
    history.change(spec(50), 100);
    history.change(spec(40), 200);

    // Act
    const result = history.undo();

    // Assert
    expect(result).toEqual(spec(64));
    expect(history.canUndo).toBe(false);
  });

  test("should undo changes with a pause between them as separate steps", () => {
    // Arrange
    const history = new SpecHistory(spec(64));
    history.change(spec(32), 0);
    history.change(spec(16), 2_000);

    // Act
    const result = history.undo();

    // Assert
    expect(result).toEqual(spec(32));
    expect(history.canUndo).toBe(true);
  });

  test("should drop the steps to redo when a new change comes after an undo", () => {
    // Arrange
    const history = new SpecHistory(spec(64));
    history.change(spec(32), 0);
    history.undo();

    // Act
    history.change(spec(16), 2_000);

    // Assert
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBe(undefined);
  });

  test("should record no step for changes that end at the spec where they started", () => {
    // Arrange
    const history = new SpecHistory(spec(64));
    history.change(spec(32), 0);

    // Act
    history.change(spec(64), 100);

    // Assert
    expect(history.canUndo).toBe(false);
    expect(history.undo()).toBe(undefined);
  });

  test("should start a new history when an image opens", () => {
    // Arrange
    const history = new SpecHistory(spec(64));
    history.change(spec(32), 0);

    // Act
    history.reset(spec(16));

    // Assert
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});
