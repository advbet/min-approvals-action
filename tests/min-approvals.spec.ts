import { describe, expect, it, spyOn } from "bun:test";
import * as core from "@actions/core";
import { getMinApprovals, type Labels, type Reviews, requirementPassed } from "../src/min-approvals";

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

spyOn(core, "info").mockImplementation(() => {
  return;
});
spyOn(core, "debug").mockImplementation(() => {
  return;
});

describe("testing labels parsing", () => {
  it("should validate 1 approval", () => {
    const labels: RecursivePartial<Labels> = [{ name: "min-1-approvals" }];
    expect(getMinApprovals(labels as Labels)).toBe(1);
  });

  it("should invalidate 1 approval", () => {
    const labels: RecursivePartial<Labels> = [{ name: "min-1-approval" }];
    expect(getMinApprovals(labels as Labels)).toBe(0);
  });

  it("should take only the first valid label", () => {
    const labels: RecursivePartial<Labels> = [{ name: "min-1-approvals" }, { name: "min-2-approvals" }];
    expect(getMinApprovals(labels as Labels)).toBe(1);
  });

  it("should validate all label", () => {
    const labels: RecursivePartial<Labels> = [{ name: "min-all-approvals" }];
    expect(getMinApprovals(labels as Labels)).toBe("all");
  });

  it("should support labels over 9", () => {
    const labels: RecursivePartial<Labels> = [{ name: "min-999-approvals" }];
    expect(getMinApprovals(labels as Labels)).toBe(999);
  });
});

describe("testing requirement passing", () => {
  it("should not pass: 1 approval, but 2 required", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1 },
        state: "APPROVED",
      },
    ];
    expect(requirementPassed(reviews as Reviews, 2, 2)).toBe(false);
  });

  it("should pass: 2 approvals, 2 required", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1 },
        state: "APPROVED",
      },
      {
        user: { id: 2 },
        state: "APPROVED",
      },
    ];
    expect(requirementPassed(reviews as Reviews, 2, 2)).toBe(true);
  });

  it("should not pass: 2 approvals from same user, 2 required", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1 },
        state: "APPROVED",
      },
      {
        user: { id: 1 },
        state: "APPROVED",
      },
    ];
    expect(requirementPassed(reviews as Reviews, 2, 2)).toBe(false);
  });

  it("should not pass: 2 approvals, 2 still assigned, all required", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1 },
        state: "APPROVED",
      },
      {
        user: { id: 2 },
        state: "APPROVED",
      },
    ];
    expect(requirementPassed(reviews as Reviews, 2, "all")).toBe(false);
  });

  it("should not pass: 1 approval, 1 dismissed, 2 required", () => {
    const reviews: RecursivePartial<Reviews> = [
      {
        user: { id: 1 },
        state: "APPROVED",
      },
      {
        user: { id: 2 },
        state: "DISMISSED",
      },
    ];
    expect(requirementPassed(reviews as Reviews, 2, 2)).toBe(false);
  });
});
