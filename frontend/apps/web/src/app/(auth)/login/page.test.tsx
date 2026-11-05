import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginMock, refreshMock, pushMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("next=/account"),
}));

vi.mock("@/features/auth/api", () => ({
  authApi: { login: loginMock },
}));

vi.mock("@/features/auth/SessionProvider", () => ({
  useSession: () => ({ refresh: refreshMock, status: "unauthenticated", user: null, logout: vi.fn() }),
}));

import LoginPage from "./page";

describe("login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits credentials, refreshes the session and honors ?next=", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce({ user: {} });
    refreshMock.mockResolvedValueOnce(undefined);

    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "student@demo.local");
    await user.type(screen.getByLabelText("Password"), "demo-password-1234");
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith(expect.objectContaining({ email: "student@demo.local" })));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/account"));
  });

  it("shows mapped copy for invalid credentials and stays on the page", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api/client");
    loginMock.mockRejectedValueOnce(new ApiError(401, "invalid_credentials", "Invalid email or password."));

    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "student@demo.local");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => expect(screen.getByTestId("login-error").textContent).toBe("Invalid email or password."));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("maps throttled attempts", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api/client");
    loginMock.mockRejectedValue(new ApiError(429, "throttled", "Too many attempts."));

    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "student@demo.local");
    await user.type(screen.getByLabelText("Password"), "demo-password-1234");
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => expect(screen.getByTestId("login-error").textContent).toContain("Too many attempts"));
  });
});
