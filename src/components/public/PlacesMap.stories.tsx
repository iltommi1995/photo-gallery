import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PlacesMap, type MapPlace } from "./PlacesMap";

const PLACES: MapPlace[] = [
  { slug: "milan, italy", name: "Milan, Italy", photoCount: 12, lat: 45.4642, lng: 9.19 },
  {
    slug: "berlin, germany",
    name: "Berlin, Germany",
    photoCount: 3,
    lat: 52.52,
    lng: 13.405,
  },
  { slug: "montenegro", name: "Montenegro", photoCount: 1, lat: 42.7087, lng: 19.3744 },
];

const meta = {
  title: "Public/PlacesMap",
  component: PlacesMap,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PlacesMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPlaces: Story = {
  args: { places: PLACES },
};

export const Empty: Story = {
  args: { places: [] },
};
