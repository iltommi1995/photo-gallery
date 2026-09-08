import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhotoPickerSelect } from "./PhotoPickerSelect";

const PHOTOS = [
  { id: "1", filename: "milan-01.jpg", altText: "Duomo at dawn" },
  { id: "2", filename: "milan-02.jpg", altText: null },
];

afterEach(() => vi.unstubAllGlobals());

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

it("opens the visual library and selects a thumbnail", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ photos: PHOTOS, nextCursor: null }),
    }),
  );
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<PhotoPickerSelect photos={PHOTOS} value={null} onChange={onChange} />);
  await user.click(screen.getByRole("button", { name: "None" }));
  expect(
    await screen.findByRole("dialog", { name: "Choose a photo" }),
  ).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Select Duomo at dawn" }));
  expect(onChange).toHaveBeenCalledWith("1");
});
