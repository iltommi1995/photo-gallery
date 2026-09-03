import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccentLabel } from "./AccentLabel";

describe("AccentLabel", () => {
  it("renders its children", () => {
    render(<AccentLabel>Milan</AccentLabel>);
    expect(screen.getByText("Milan")).toBeInTheDocument();
  });

  it("renders as the requested tag", () => {
    render(<AccentLabel as="h2">2018</AccentLabel>);
    expect(screen.getByRole("heading", { level: 2, name: "2018" })).toBeInTheDocument();
  });
});
