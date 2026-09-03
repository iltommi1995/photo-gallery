import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Lightbox, type LightboxPhoto } from "./Lightbox";

const PHOTOS: LightboxPhoto[] = [
  {
    id: "1",
    altText: "First photo",
    caption: "Caption one",
    cameraMake: "Fujifilm",
    cameraModel: "X100V",
    lens: null,
    focalLengthMm: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    takenAt: null,
    locationName: null,
    isAnalog: false,
    filmStock: null,
  },
  {
    id: "2",
    altText: "Second photo",
    caption: null,
    cameraMake: null,
    cameraModel: null,
    lens: null,
    focalLengthMm: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    takenAt: null,
    locationName: null,
    isAnalog: false,
    filmStock: null,
  },
];

describe("Lightbox", () => {
  it("renders nothing when index is null", () => {
    render(
      <Lightbox photos={PHOTOS} index={null} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the photo's caption, EXIF, and position counter", () => {
    render(<Lightbox photos={PHOTOS} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText("Caption one")).toBeInTheDocument();
    expect(screen.getByText("Fujifilm X100V")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("hides the previous button on the first photo and the next button on the last", () => {
    const { rerender } = render(
      <Lightbox photos={PHOTOS} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(screen.queryByLabelText("Previous photo")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Next photo")).toBeInTheDocument();

    rerender(
      <Lightbox photos={PHOTOS} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(screen.getByLabelText("Previous photo")).toBeInTheDocument();
    expect(screen.queryByLabelText("Next photo")).not.toBeInTheDocument();
  });

  it("calls onNavigate when the next button is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <Lightbox photos={PHOTOS} index={0} onClose={vi.fn()} onNavigate={onNavigate} />,
    );

    await user.click(screen.getByLabelText("Next photo"));

    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("navigates with the right arrow key", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <Lightbox photos={PHOTOS} index={0} onClose={vi.fn()} onNavigate={onNavigate} />,
    );

    await user.keyboard("{ArrowRight}");

    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});
