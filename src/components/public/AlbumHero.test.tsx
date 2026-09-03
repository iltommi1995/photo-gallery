import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlbumHero } from "./AlbumHero";

describe("AlbumHero", () => {
  it("renders the album title as a heading", () => {
    render(<AlbumHero title="Milan" coverPhoto={null} />);
    expect(screen.getByRole("heading", { name: "Milan" })).toBeInTheDocument();
  });

  it("renders the cover photo when provided", () => {
    render(
      <AlbumHero
        title="Milan"
        coverPhoto={{ id: "abc", altText: "Milan cathedral", blurDataUrl: null }}
      />,
    );
    expect(screen.getByAltText("Milan cathedral")).toBeInTheDocument();
  });

  it("renders without a cover photo", () => {
    render(<AlbumHero title="Untitled" coverPhoto={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
