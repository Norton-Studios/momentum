import { describe, expect, it } from "vitest";
import { getSession, getUserId, sessionStorage } from "./session.server";

describe("sessionStorage", () => {
  it("creates session storage with correct cookie config", () => {
    expect(sessionStorage).toBeDefined();
    expect(typeof sessionStorage.getSession).toBe("function");
    expect(typeof sessionStorage.commitSession).toBe("function");
    expect(typeof sessionStorage.destroySession).toBe("function");
  });
});

describe("getSession", () => {
  it("returns empty session when no cookie provided", async () => {
    const request = new Request("http://localhost", {
      headers: {},
    });

    const session = await getSession(request);

    expect(session).toBeDefined();
    expect(session.data).toEqual({});
  });
});

describe("getUserId", () => {
  it("returns undefined when no session exists", async () => {
    const request = new Request("http://localhost", {
      headers: {},
    });

    const userId = await getUserId(request);

    expect(userId).toBeUndefined();
  });
});
