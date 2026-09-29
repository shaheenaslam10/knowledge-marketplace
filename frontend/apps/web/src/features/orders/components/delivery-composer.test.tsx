import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryComposer } from "./order-workspace";

/**
 * Regression (Phase 11): delivery files were posted with a raw relative
 * `fetch("/api/v1/files")` (the Next origin in the cross-origin dev/CI stack)
 * using the wrong multipart field — every delivery with a file failed.
 */
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ attachment: { id: "att-9", original_name: "notes.pdf" }, deduplicated: false }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeliveryComposer", () => {
  it("uploads attached files through the shared client and submits their ids", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<DeliveryComposer onSubmit={onSubmit} busy={false} />);

    await userEvent.type(screen.getByLabelText("Delivery summary"), "Full plan with session notes and practice sets.");
    await userEvent.upload(
      screen.getByLabelText(/^Files/),
      new File(["%PDF-1.4"], "notes.pdf", { type: "application/pdf" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Submit delivery" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("Full plan with session notes and practice sets.", ["att-9"]),
    );
    const [url, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(String(url)).toMatch(/^https?:\/\/[^/]+\/api\/v1\/files$/);
    expect((init.body as FormData).get("purpose")).toBe("delivery");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });
});
