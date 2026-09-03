import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HorizontalScrollProgress } from "./HorizontalScrollProgress";

describe("HorizontalScrollProgress", () => {
  it("exposes progress as an accessible progressbar value", () => {
    render(<HorizontalScrollProgress progress={0.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("clamps out-of-range progress to 0-100", () => {
    render(<HorizontalScrollProgress progress={1.4} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamps negative progress to 0", () => {
    render(<HorizontalScrollProgress progress={-0.2} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
