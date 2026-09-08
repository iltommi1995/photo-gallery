# Public collections

- `/albums` lists published, manually curated albums. Each album at
  `/albums/[slug]` preserves the chapter and placement order from the admin editor.
  An album can include photos from any number of places.
- `/places` builds an archive from the individual photos used in published albums.
  Uploading a file alone does not publish it. Draft-only photos remain excluded.
  Photos need nonempty alt text to appear in this archive.
- A place uses the photo's `locationName`, not the album's location. Names are
  grouped without regard to case or extra whitespace; country names remain part
  of the key. Missing locations appear under "Location not specified".
- Each photo appears once per place even when used by several albums. Photos are
  sorted oldest first by `takenAt`, grouped by UTC year, with undated photos last.
  Upload dates only break ties; they are never presented as capture dates.
- Place pages use the same `AlbumScrollView` and `ChapterMosaic` as albums.
  Desktop scrolling is continuous along X, starting at the cover, without section snap points.
  Long years split into sections of up to eight photos, preserving photo order.
- Previous `/places/[album-slug]` URLs redirect to `/albums/[album-slug]` when
  there is no matching place. Both sections and the sitemap are invalidated when
  published collections or photo metadata change.

## Positioning photos on the editor grid

The chapter editor uses four columns. Drag a photo from the library onto a cell,
then drag the photo itself to move it. Empty cells remain empty. The highlight
shows its footprint; occupied cells cannot overlap. S/M/L/F set footprints of
1x1, 2x1, 2x2 and 4x2 cells. Move a photo first if a larger size does not fit.
Use Add rows to expose more space, or focus a photo and use arrow keys to move it.

Placement.gridColumn and gridRow are one-based, nullable coordinates. Old layouts
without coordinates retain auto-flow until edited. New coordinates are saved
with the chapter and displayed by ChapterMosaic in both preview and public pages.
On narrow screens the public mosaic compacts into two columns in reading order.
