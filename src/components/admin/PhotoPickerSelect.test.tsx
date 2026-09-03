import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PhotoPickerSelect } from "./PhotoPickerSelect";

const PHOTOS = [
  { id: "1", filename: "milan-01.jpg", altText: "Duomo at dawn" },
  { id: "2", filename: "milan-02.jpg", altText: null },
];

describe("PhotoPickerSelect", () => {
  it("shows the placeholder when nothing is selected", () => {
    render(<PhotoPickerSelect photos={PHOTOS} value={null} onChange={vi.fn()} />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("shows the selected photo's alt text (falling back to filename)", () => {
    render(<PhotoPickerSelect photos={PHOTOS} value="1" onChange={vi.fn()} />);
    expect(screen.getByText("Duomo at dawn")).toBeInTheDocument();
  });

  it("falls back to filename when the photo has no alt text", () => {
    render(<PhotoPickerSelect photos={PHOTOS} value="2" onChange={vi.fn()} />);
    expect(screen.getByText("milan-02.jpg")).toBeInTheDocument();
  });
});
