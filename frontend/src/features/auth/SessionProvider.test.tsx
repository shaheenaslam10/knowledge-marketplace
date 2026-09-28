import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { SessionUser } from "./types";

const { meMock, logoutMock } = vi.hoisted(() => ({ meMock: vi.fn(), logoutMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("./api", () => ({
  authApi: {
    me: meMock,
    logout: logoutMock,
  },
}));

import { SessionProvider, useSession } from "./SessionProvider";

const verifiedUser: SessionUser = {
  id: 1,
  email: "student@demo.local",
  name: "Demo Student",
  timezone: "UTC",
  locale: "en",
  email_verified: true,
  roles: { student: true, verified: true, staff: false, support: false, admin: false, expert: false },
};

function Probe() {
  const { user, status, logout } = useSession();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? ""}</span>
      <button data-testid="logout" onClick={() => void logout()}>
        logout
      </button>
    </div>
  );
}

describe("SessionProvider", () => {
  beforeEach(() => {
    meMock.mockReset();
    logoutMock.mockReset();
  });

  it("resolves to authenticated after /me succeeds", async () => {
    meMock.mockResolvedValueOnce({ user: verifiedUser });
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("loading");
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("authenticated"));
    expect(screen.getByTestId("email").textContent).toBe("student@demo.local");
  });

  it("resolves to unauthenticated on 401 and logout clears state", async () => {
    // Must be a real ApiError: a plain Error is indistinguishable from a network
    // failure, which the provider deliberately retries rather than signing out.
    meMock.mockRejectedValueOnce(new ApiError(401, "not_authenticated", "401"));
    logoutMock.mockResolvedValueOnce({ detail: "Signed out." });
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));
    screen.getByTestId("logout").click();
    await waitFor(() => expect(logoutMock).toHaveBeenCalledOnce());
    expect(screen.getByTestId("email").textContent).toBe("");
  });
});

/**
 * Phase 12 hardening. Phase 11's E2E run surfaced this: `/api/v1/me` returning
 * 429 under the dev throttle signed the user out and the app layout bounced
 * them to /login. A transient API failure is not a logout.
 */
describe("SessionProvider — transient API failures do not sign the user out", () => {
  beforeEach(() => {
    // mockReset, not clearAllMocks: the latter keeps queued implementations,
    // so a leftover mockResolvedValue leaks into the next case.
    meMock.mockReset();
    logoutMock.mockReset();
    vi.useRealTimers();
  });

  it("signs the user out on 401 (a real answer) without retrying", async () => {
    meMock.mockRejectedValue(new ApiError(401, "not_authenticated", "nope"));

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
    expect(meMock).toHaveBeenCalledTimes(1);
  });

  it("signs the user out on 403 as well", async () => {
    meMock.mockRejectedValue(new ApiError(403, "permission_denied", "nope"));

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
    expect(meMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["429 rate limit", new ApiError(429, "throttled", "slow down")],
    ["500 server error", new ApiError(500, "server_error", "boom")],
    ["503 during a restart", new ApiError(503, "unavailable", "restarting")],
    ["network failure", new TypeError("Failed to fetch")],
  ])("retries after %s and recovers instead of signing out", async (_label, error) => {
    meMock.mockRejectedValueOnce(error).mockResolvedValue({ user: verifiedUser });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"), {
      timeout: 4000,
    });
    expect(screen.getByTestId("email")).toHaveTextContent("student@demo.local");
    expect(meMock).toHaveBeenCalledTimes(2);
  });

  it("reports 'unreachable', never 'unauthenticated', when retries are exhausted", async () => {
    meMock.mockRejectedValue(new ApiError(503, "unavailable", "down"));

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unreachable"), {
      timeout: 8000,
    });
    // 1 initial attempt + 3 backoff retries
    expect(meMock).toHaveBeenCalledTimes(4);
  }, 10000);

  it("keeps an already-authenticated user signed in when a later refresh fails", async () => {
    meMock.mockResolvedValueOnce({ user: verifiedUser });

    function RefreshProbe() {
      const { status, refresh } = useSession();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <button data-testid="refresh" onClick={() => void refresh()}>
            refresh
          </button>
        </div>
      );
    }

    render(
      <SessionProvider>
        <RefreshProbe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));

    meMock.mockRejectedValue(new ApiError(500, "server_error", "boom"));
    screen.getByTestId("refresh").click();

    // Never flips away from authenticated — a blip must not eject a live session.
    await new Promise((resolve) => setTimeout(resolve, 5200));
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
  }, 12000);
});
