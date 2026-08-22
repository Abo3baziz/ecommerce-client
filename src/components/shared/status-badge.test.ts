import { describe, expect, it } from "vitest";

import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STOCK_STATUSES,
  USER_ROLES,
  USER_STATUSES,
  VARIANT_STATUSES,
} from "@/types/enums";
import { BADGE_STYLES } from "./status-badge";

describe("StatusBadge style coverage", () => {
  it("has a color mapping for every enum literal", () => {
    const literals: string[] = [
      ...ORDER_STATUSES,
      ...PAYMENT_STATUSES,
      ...VARIANT_STATUSES,
      ...STOCK_STATUSES,
      ...USER_ROLES,
      ...USER_STATUSES,
    ];
    const missing = literals.filter((literal) => !BADGE_STYLES[literal]);
    expect(missing).toEqual([]);
  });

  it("maps LOW_STOCK to amber and OUT_OF_STOCK to red", () => {
    expect(BADGE_STYLES.LOW_STOCK).toContain("amber");
    expect(BADGE_STYLES.OUT_OF_STOCK).toContain("red");
  });

  it("leaves unknown values unmapped (renders neutral)", () => {
    expect(BADGE_STYLES.SOMETHING_ELSE).toBeUndefined();
  });
});
