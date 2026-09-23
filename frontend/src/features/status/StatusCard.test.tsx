import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusCard } from "./StatusCard";

describe("StatusCard", () => {
  it("shows LIVE when backend is healthy", () => {
    render(<StatusCard health={{ status: "ok", database: true }} />);
    expect(screen.getByTestId("api-status")).toHaveTextContent("LIVE");
    expect(screen.getByText("Connected to the Django service")).toBeInTheDocument();
  });

  it("shows UNREACHABLE when backend is null", () => {
    render(<StatusCard health={null} />);
    expect(screen.getByTestId("api-status")).toHaveTextContent("UNREACHABLE");
  });

  it("shows UNREACHABLE when database is degraded", () => {
    render(<StatusCard health={{ status: "degraded", database: false }} />);
    expect(screen.getByTestId("api-status")).toHaveTextContent("UNREACHABLE");
  });
});
