import { describe, it, expect } from "vitest";
import request from "supertest";
import { viteNodeApp } from "./index";

describe("API", () => {
  it("should return a 200 status code for the root endpoint", async () => {
    const response = await request(viteNodeApp).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "API is up" });
  });
});
