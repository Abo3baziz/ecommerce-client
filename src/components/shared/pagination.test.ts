import { describe, expect, it } from "vitest";

import { pageWindow, resolveBounds } from "./pagination";

describe("pageWindow", () => {
  it("centers on the current page", () => {
    expect(pageWindow(6, 10)).toEqual([4, 5, 6, 7, 8]);
  });

  it("clamps to the start", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(3, 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it("clamps to the end", () => {
    expect(pageWindow(9, 10)).toEqual([6, 7, 8, 9, 10]);
    expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10]);
  });

  it("shows all pages when fewer than the window size", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });
});

describe("resolveBounds — standard shape", () => {
  it("disables both at bounds of a single page", () => {
    expect(resolveBounds(1, { totalPages: 1 })).toEqual({
      canPrev: false,
      canNext: false,
    });
  });

  it("enables correctly mid-range", () => {
    expect(resolveBounds(2, { totalPages: 5 })).toEqual({
      canPrev: true,
      canNext: true,
    });
  });

  it("honours explicit hasNext/hasPrev flags", () => {
    expect(
      resolveBounds(1, { totalPages: 5, hasNext: true, hasPrev: false }),
    ).toEqual({ canPrev: false, canNext: true });
  });
});

describe("resolveBounds — reviews shape (has_more)", () => {
  it("uses has_more for next when no totalPages is known", () => {
    expect(resolveBounds(3, { hasMore: true })).toEqual({
      canPrev: true,
      canNext: true,
    });
    expect(resolveBounds(3, { hasMore: false })).toEqual({
      canPrev: true,
      canNext: false,
    });
  });

  it("prefers explicit hasNext over totalPages math", () => {
    expect(resolveBounds(2, { totalPages: 5, hasNext: false })).toEqual({
      canPrev: true,
      canNext: false,
    });
  });

  it("disables next when nothing is known", () => {
    expect(resolveBounds(1, {})).toEqual({ canPrev: false, canNext: false });
  });
});
