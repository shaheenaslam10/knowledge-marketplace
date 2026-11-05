import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiModule from "./api";
import { RequestForm } from "./RequestForm";

/**
 * Regression (Phase 11 e2e): the taxonomy client read {results} while the
 * backend ships {terms} — subjects stayed undefined and RequestForm crashed
 * with "Cannot read properties of undefined (reading 'map')" on every mount.
 */
const termsSpy = vi.spyOn(apiModule.taxonomyApi, "terms");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

describe("RequestForm taxonomy contract", () => {
  beforeEach(() => {
    termsSpy.mockReset();
    termsSpy.mockImplementation(async (kind: "subject" | "skill") =>
      kind === "subject"
        ? { terms: [{ id: "t1", name: "Mathematics", slug: "mathematics", kind }] }
        : { terms: [] },
    );
  });

  it("renders backend {terms} payloads into the subject select", async () => {
    render(<RequestForm />);
    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    // and it must NOT crash the render (the old bug threw during map)
    expect(screen.getByText("Select a subject…")).toBeInTheDocument();
  });

  it("tolerates an unexpected payload shape without crashing", async () => {
    termsSpy.mockResolvedValue({} as never);
    render(<RequestForm />);
    await waitFor(() => expect(screen.getByText("Select a subject…")).toBeInTheDocument());
    expect(screen.queryByText("Mathematics")).not.toBeInTheDocument();
  });
});
