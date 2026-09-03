"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PickablePhoto = { id: string; filename: string; altText: string | null };

type PhotoPickerSelectProps = {
  photos: PickablePhoto[];
  value: string | null;
  onChange: (photoId: string | null) => void;
  placeholder?: string;
  id?: string;
};

const NONE_VALUE = "__none__";

export function PhotoPickerSelect({
  photos,
  value,
  onChange,
  placeholder = "None",
  id,
}: PhotoPickerSelectProps) {
  const labelById = new Map(photos.map((p) => [p.id, p.altText || p.filename]));

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger id={id} className="w-56">
        {/* A render-prop, not just `placeholder`: base-ui only resolves a
            selected item's label from mounted SelectItems, which haven't
            mounted yet on first render — formatting from our own `photos`
            data avoids showing the raw id until the popup opens once. */}
        <SelectValue placeholder={placeholder}>
          {(v: string) => (v && v !== NONE_VALUE ? (labelById.get(v) ?? v) : placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>None</SelectItem>
        {photos.map((photo) => (
          <SelectItem key={photo.id} value={photo.id}>
            {photo.altText || photo.filename}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
