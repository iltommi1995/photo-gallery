import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocationAutocomplete, type GeocodeResult } from "./LocationAutocomplete";

afterEach(() => vi.unstubAllGlobals());

function ControlledAutocomplete({
  onSelect,
}: {
  onSelect?: (result: GeocodeResult) => void;
}) {
  const [value, setValue] = useState("");
  return <LocationAutocomplete value={value} onChange={setValue} onSelect={onSelect} />;
}

describe("LocationAutocomplete", () => {
  it("plain typing updates the value without requiring a selection", async () => {
    const user = userEvent.setup();
    render(<ControlledAutocomplete />);

    await user.type(screen.getByRole("combobox"), "Ro");

    expect(screen.getByRole("combobox")).toHaveValue("Ro");
  });

  it("shows fetched suggestions and calls onSelect when one is picked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ label: "Rome, Italy", lat: 41.9, lng: 12.5 }],
        }),
      }),
    );
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ControlledAutocomplete onSelect={onSelect} />);

    await user.type(screen.getByRole("combobox"), "Rome");
    const option = await screen.findByText("Rome, Italy", {}, { timeout: 2000 });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledWith({ label: "Rome, Italy", lat: 41.9, lng: 12.5 });
    expect(screen.getByRole("combobox")).toHaveValue("Rome, Italy");
  });

  it("does not search for a single-character query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ControlledAutocomplete />);

    await user.type(screen.getByRole("combobox"), "R");

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled(), { timeout: 500 });
  });
});
