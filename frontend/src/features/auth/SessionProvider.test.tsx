import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.clearAllMocks();
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
    meMock.mockRejectedValueOnce(new Error("401"));
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
