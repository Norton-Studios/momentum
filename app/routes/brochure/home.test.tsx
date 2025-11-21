import { describe, expect, it } from "vitest";
import { meta } from "./home";

describe("Home route", () => {
  it("exports correct meta information", () => {
    const metaData = meta();

    expect(metaData).toEqual([
      { title: "Momentum - Developer Productivity Platform" },
      {
        name: "description",
        content: "Turn data into developer momentum with comprehensive productivity metrics",
      },
    ]);
  });
});
