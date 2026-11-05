import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { CommandPalette } from "./CommandPalette";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useSession
vi.mock("@/features/auth/SessionProvider", () => ({
  useSession: () => ({
    user: { id: 1, email: "student@demo.local", roles: { student: true, expert: false } },
    status: "authenticated",
  }),
}));

// Mock APIs
vi.mock("@/features/experts/api", () => ({
  expertsApi: {
    directory: vi.fn().mockResolvedValue({ results: [] }),
  },
}));

vi.mock("@/features/catalog/api", () => ({
  catalogApi: {
    list: vi.fn().mockResolvedValue({ results: [] }),
  },
}));

describe("CommandPalette (Cmd+K global navigation)", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("opens when Cmd+K keyboard shortcut is triggered and closes on Escape", async () => {
    render(<CommandPalette />);

    // Initially closed
    expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();

    // Trigger Cmd+K
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Now open
    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();

    // Close on Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
  });

  it("renders default quick action navigation shortcuts", async () => {
    render(<CommandPalette />);

    // Open palette
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(screen.getByText("Post a New Request")).toBeInTheDocument();
    expect(screen.getByText("Browse Knowledge Catalog")).toBeInTheDocument();
    expect(screen.getByText("Explore Approved Specialists")).toBeInTheDocument();
    expect(screen.getByText("Open Knowledge Vault")).toBeInTheDocument();
  });

  it("navigates to selected item on click or Enter key", async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const catalogOption = screen.getByText("Browse Knowledge Catalog");
    await userEvent.click(catalogOption);

    expect(mockPush).toHaveBeenCalledWith("/catalog");
  });
});
