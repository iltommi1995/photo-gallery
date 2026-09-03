import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Lightbox, type LightboxPhoto } from "./Lightbox";

const PHOTOS: LightboxPhoto[] = [
  {
    id: "1",
    altText: "Duomo at dawn",
    caption: "First light over the cathedral square.",
    cameraMake: "Fujifilm",
    cameraModel: "X100V",
    lens: "23mm f/2",
    focalLengthMm: 23,
    aperture: 2.8,
    shutterSpeed: "1/250",
    iso: 200,
    takenAt: new Date("2018-04-15"),
    locationName: "Milan, Italy",
    isAnalog: false,
    filmStock: null,
  },
  {
    id: "2",
    altText: "A hand-held film shot of a passerby blowing bubbles",
    caption: null,
    cameraMake: "Leica",
    cameraModel: "M6",
    lens: "35mm f/2",
    focalLengthMm: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    takenAt: null,
    locationName: "Berlin, Germany",
    isAnalog: true,
    filmStock: "Kodak Portra 400",
  },
];

const meta = {
  title: "Public/Lightbox",
  component: Lightbox,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Lightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DigitalPhotoWithFullExif: Story = {
  args: { photos: PHOTOS, index: 0, onClose: () => {}, onNavigate: () => {} },
  render: () => {
    function Wrapper() {
      const [index, setIndex] = useState<number | null>(0);
      return (
        <Lightbox
          photos={PHOTOS}
          index={index}
          onClose={() => setIndex(null)}
          onNavigate={setIndex}
        />
      );
    }
    return <Wrapper />;
  },
};

export const AnalogPhotoWithFilmStock: Story = {
  args: { photos: PHOTOS, index: 1, onClose: () => {}, onNavigate: () => {} },
  render: () => {
    function Wrapper() {
      const [index, setIndex] = useState<number | null>(1);
      return (
        <Lightbox
          photos={PHOTOS}
          index={index}
          onClose={() => setIndex(null)}
          onNavigate={setIndex}
        />
      );
    }
    return <Wrapper />;
  },
};
