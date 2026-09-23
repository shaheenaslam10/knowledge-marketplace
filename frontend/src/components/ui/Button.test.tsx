import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders label and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to type=button (no accidental form submits)", () => {
    render(<Button>Hi</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("applies variant classes", () => {
    render(<Button variant="secondary">X</Button>);
    expect(screen.getByRole("button").className).toContain("bg-surface");
  });

  it("is keyboard accessible with visible focus support", async () => {
    render(<Button>Focus me</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Focus me" })).toHaveFocus();
  });
});
