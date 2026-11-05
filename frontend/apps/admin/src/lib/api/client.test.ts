import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

const mockedFetch = vi.fn();
vi.stubGlobal("fetch", mockedFetch);

afterEach(() => {
  mockedFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": `${contentType}; charset=utf-8` },
  });
}

describe("apiFetch", () => {
  it("returns parsed JSON on success and includes credentials", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse({ hello: "world" }));
    const data = await apiFetch<{ hello: string }>({ path: "/x", baseUrl: "http://api" });
    expect(data).toEqual({ hello: "world" });
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ credentials: "include" });
  });

  it("parses the backend error envelope into ApiError", async () => {
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: "validation_error", message: "Validation failed.", details: { amount: ["bad"] } } },
        400,
      ),
    );
    const promise = apiFetch({ path: "/x", baseUrl: "http://api" });
    await expect(promise).rejects.toMatchObject({
      code: "validation_error",
      status: 400,
      details: { amount: ["bad"] },
    });
  });

  it("wraps non-JSON failures in a stable unknown_error code", async () => {
    mockedFetch.mockResolvedValueOnce(new Response("boom", { status: 502 }));
    const promise = apiFetch({ path: "/x", baseUrl: "http://api" });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await promise.catch((error: ApiError) => {
      expect(error.code).toBe("unknown_error");
      expect(error.status).toBe(502);
    });
  });
});
