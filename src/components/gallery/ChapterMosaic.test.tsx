import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChapterMosaic, type MosaicPlacement } from "./ChapterMosaic";

function placement(id: string, colSpan = 2, rowSpan = 1): MosaicPlacement {
  return {
    id,
    type: "PHOTO",
    colSpan,
    rowSpan,
    photo: { id, altText: `Photo ${id}`, blurDataUrl: null },
  };
}

describe("ChapterMosaic", () => {
  it("renders one figure per placement", () => {
    render(
      <ChapterMosaic placements={[placement("a"), placement("b"), placement("c")]} />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("calls onItemClick with the clicked placement", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const placements = [placement("a"), placement("b")];
    render(<ChapterMosaic placements={placements} onItemClick={onItemClick} />);

    await user.click(screen.getByRole("button", { name: "Photo b" }));

    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
  });

  it("is keyboard-activatable when onItemClick is provided", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    render(<ChapterMosaic placements={[placement("a")]} onItemClick={onItemClick} />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(onItemClick).toHaveBeenCalledOnce();
  });

  it("renders overlay content per placement when provided", () => {
    render(
      <ChapterMosaic
        placements={[placement("a")]}
        renderOverlay={(p) => <span>overlay-{p.id}</span>}
      />,
    );
    expect(screen.getByText("overlay-a")).toBeInTheDocument();
  });

  it("renders a text block's sanitized HTML and skips the lightbox role", () => {
    const onItemClick = vi.fn();
    render(
      <ChapterMosaic
        placements={[
          { id: "t", type: "TEXT", colSpan: 2, rowSpan: 1, textContent: "<p>Hello</p>" },
        ]}
        onItemClick={onItemClick}
      />,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
