import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { KpiCard, RangeControl, TrendBars } from "./ops-ui";
import { money } from "../api";

describe("KpiCard", () => {
  it("renders label, value and hint", () => {
    render(<KpiCard label="GMV" value="$270.00" hint="take rate 0.1" />);
    expect(screen.getByTestId("kpi-GMV")).toHaveTextContent("$270.00");
    expect(screen.getByText("take rate 0.1")).toBeInTheDocument();
  });
});

describe("money formatting", () => {
  it("renders minor units as major with grouping", () => {
    expect(money(27000)).toBe("USD 270");
    expect(money(999999, "USD")).toContain("9,999.99");
  });
});

describe("TrendBars", () => {
  it("renders bars with a range caption", () => {
    render(
      <TrendBars
        series={{ "2026-09-20": 2, "2026-09-21": 5, "2026-09-22": 1 }}
        label="orders"
      />,
    );
    expect(screen.getByTestId("trend-orders")).toBeInTheDocument();
    expect(screen.getByText(/max 5/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /orders per day/i })).toBeInTheDocument();
  });

  it("shows an empty note for no data", () => {
    render(<TrendBars series={{}} label="orders" />);
    expect(screen.getByText(/No orders in this range/i)).toBeInTheDocument();
  });
});

describe("RangeControl", () => {
  it("switches preset ranges and applies custom dates", async () => {
    const onChange = vi.fn();
    const onCustom = vi.fn();
    render(<RangeControl value="30d" onChange={onChange} onCustom={onCustom} />);
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith("today");

    await userEvent.type(screen.getByLabelText("Custom range from"), "2026-09-01");
    await userEvent.type(screen.getByLabelText("Custom range to"), "2026-09-10");
    await userEvent.click(screen.getByTestId("apply-custom-range"));
    expect(onCustom).toHaveBeenCalledWith("2026-09-01", "2026-09-10");
  });
});
