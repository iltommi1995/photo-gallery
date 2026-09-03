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
  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger id={id} className="w-56">
        <SelectValue placeholder={placeholder} />
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
