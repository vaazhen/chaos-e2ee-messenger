import { describe, expect, it } from "vitest";
import {
  assignableRoleValues,
  canFullAdmin,
  canModerationOnly,
  canOpenGroupAdmin,
  canTargetForModeration,
  eligibleParticipantForRoleAction,
} from "../utils/groupRbac";

describe("groupRbac", () => {
  it("flags full admin and moderator strip", () => {
    expect(canFullAdmin("OWNER")).toBe(true);
    expect(canFullAdmin("ADMIN")).toBe(true);
    expect(canFullAdmin("MODERATOR")).toBe(false);
    expect(canModerationOnly("MODERATOR")).toBe(true);
    expect(canModerationOnly("ADMIN")).toBe(false);
  });

  it("group admin entry visible only for owner, admin, moderator", () => {
    expect(canOpenGroupAdmin("OWNER")).toBe(true);
    expect(canOpenGroupAdmin("ADMIN")).toBe(true);
    expect(canOpenGroupAdmin("MODERATOR")).toBe(true);
    expect(canOpenGroupAdmin("MEMBER")).toBe(false);
    expect(canOpenGroupAdmin(undefined)).toBe(false);
  });

  it("moderation targets align with backend", () => {
    expect(canTargetForModeration("MODERATOR", "MEMBER")).toBe(true);
    expect(canTargetForModeration("MODERATOR", "ADMIN")).toBe(false);
    expect(canTargetForModeration("MODERATOR", "OWNER")).toBe(false);
    expect(canTargetForModeration("ADMIN", "MODERATOR")).toBe(true);
    expect(canTargetForModeration("ADMIN", "OWNER")).toBe(false);
    expect(canTargetForModeration("OWNER", "ADMIN")).toBe(true);
  });

  it("assignable roles never hint escalation beyond backend rules", () => {
    expect(assignableRoleValues("OWNER")).toEqual(["MEMBER", "MODERATOR", "ADMIN", "OWNER"]);
    expect(assignableRoleValues("ADMIN")).toEqual(["MEMBER", "MODERATOR"]);
    expect(assignableRoleValues("MODERATOR")).toEqual([]);
  });

  it("role action eligibility blocks owner row and admin-on-admin", () => {
    expect(
      eligibleParticipantForRoleAction("ADMIN", { userId: 2, role: "OWNER" }, 1)
    ).toBe(false);
    expect(
      eligibleParticipantForRoleAction("ADMIN", { userId: 2, role: "ADMIN" }, 1)
    ).toBe(false);
    expect(
      eligibleParticipantForRoleAction("ADMIN", { userId: 2, role: "MODERATOR" }, 1)
    ).toBe(true);
  });
});
