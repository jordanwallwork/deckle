---
title: UI Overview
layout: libdoc_page.liquid
permalink: component-editor/ui-overview/index.html
eleventyNavigation:
    key: UI Overview
    parent: Component Editor
    order: 1
date: 2026-02-16
---

The Component Editor is where you design your game components. It has four panels:

- **Structure Tree** (left) — your element hierarchy
- **Preview** (centre) — the live canvas
- **Configuration** (right) — settings for the selected element
- **Data Source** (bottom) — linked data preview

On smaller screens, the left and right panels are toggled via toolbar buttons and appear as overlays.

---

# Structure Tree

The Structure Tree shows all the elements in your design as a nested list. The top-level node represents the component itself (e.g. "My Card — Front").

**Click** an element to select it and view its settings in the Configuration panel.

**Double-click** an element's name to rename it — this is useful for keeping track of elements in complex designs.

**Hover** over a container (or the root) to reveal a **+** button for adding new elements. You can add three types: **Container**, **Text**, and **Image**.

**Drag** elements by their handle to reorder them or move them into a different container.

**Right-click** any element for a context menu with options to duplicate, show/hide, lock/unlock, or delete it.

Locked elements show a lock icon, and hidden elements appear faded.

---

# Preview

The Preview panel is the main canvas showing a live view of your design.

## Toolbar

Above the canvas you will find:

- **Save** (or **Ctrl+S**) — the button turns orange when you have unsaved changes
- **Export** — opens the export page (save first if you have unsaved changes)
- **Undo / Redo** — step through your edit history (**Ctrl+Z** / **Ctrl+Y**)
- **Bleed & Safe Area** — toggle guide lines that show where the card will be trimmed (red) and where content is safe from being cut off (green)
- **Grid Snap** — toggle snapping on/off, and set the grid size. Hold **Shift** while dragging to temporarily ignore the grid
- **Zoom** — zoom in/out with the buttons, type a percentage directly, or use the mouse wheel. Click **Reset** to return to 100%

## Working with elements

**Select** an element by clicking it on the canvas. You will see handles appear around it for resizing, rotating, and moving.

**Resize** by dragging any of the corner or edge handles.

**Rotate** by dragging the circular handle above the element. Rotation snaps to 5° increments; hold **Shift** for free rotation.

**Move** absolutely positioned elements by dragging the handles along the element's edges. Elements inside a flex container are positioned automatically — reorder them in the Structure Tree instead.

**Right-click** an element on the canvas for the same context menu as in the Structure Tree.

{% alert 'Tip: Locked elements can\'t be clicked on the canvas, so you won\'t accidentally move them. Unlock them from the Structure Tree or Configuration panel.' 'info' %}

---

# Configuration

The right-hand panel shows settings for whatever is currently selected. If nothing is selected, it prompts you to pick an element.

## Shared settings

All element types share these options:

- **Label** — a custom name (shown in the Structure Tree)
- **Lock** — prevents accidental edits on the canvas
- **Visibility** — choose to always show, always hide, or show conditionally based on a formula (evaluated per data-source row)
- **Position** — X and Y coordinates (for absolutely positioned elements)
- **Dimensions** — width and height, in px, mm, %, or auto
- **Rotation** — angle in degrees
- **Border** — width, style, colour, and radius (configurable per-side or all at once)

## Text

- **Content** — a text area with syntax highlighting for [merge fields](/component-editor/merge-fields/) and icons. A toolbar above the field lets you quickly insert icons, merge fields, and formula functions
- **Markdown** — toggle to render content as Markdown
- **Font** — choose from Google Fonts, set the size, weight, and alignment
- **Colours** — text and background colour
- **Advanced** — line height, letter spacing, text decoration, and text transform
- **Padding** — uniform or per-side

## Image

- **Source** — enter a URL, filename, or merge field (e.g. `{{ "{{" }} ImageUrl }}`). A **Use Placeholder** button lets you pick a test image
- **Object Fit** — how the image fills the element: Cover, Contain, Fill, None, or Scale Down
- **Object Position** — a 3×3 grid to set the image alignment within the element

## Container

- **Display** — Flex or Block layout
- **Flex options** — direction, wrapping, alignment (via a visual grid), and gap between children
- **Background colour**
- **Padding** — uniform or per-side

## Component settings

Select the root node (click the component name, or click empty space on the canvas) to see component-level settings:

- **Background colour** for the entire design
- **Guide colours** for the bleed and safe area lines
- Read-only info such as component type, size, dimensions, and DPI

---

# Data Source

The Data Source panel sits at the bottom and shows data from a linked source (e.g. a Google Sheet). You can minimise it, show just the active row, or expand it to see the full table.

If no data source is linked yet, click **Link Data Source** to connect one from your project.

Use the **arrow buttons** to cycle through rows, or click a row in the expanded table to select it. The active row populates all [merge fields](/component-editor/merge-fields/) in the preview.

Click **Sync** to pull the latest data, or **Change Data Source** to switch or remove the link.

{% alert 'Tip: Hover over a column header to see the merge field identifier to use in your text elements.' 'info' %}

---

# Read-Only Mode

If you have view-only access to a project, the editor opens in read-only mode with a yellow banner at the top. You can still browse the design, select elements to inspect their settings, zoom, pan, and navigate data source rows — but you cannot make any changes.

---

# Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| **Ctrl+S** / **Cmd+S** | Save |
| **Ctrl+Z** / **Cmd+Z** | Undo |
| **Ctrl+Y** / **Cmd+Y** | Redo |
| **Shift** (while dragging) | Disable grid snapping |
| **Shift** (while rotating) | Free rotation |
