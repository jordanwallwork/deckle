---
title: Merge Fields
layout: libdoc_page.liquid
permalink: component-editor/merge-fields/index.html
eleventyNavigation:
    key: Merge Fields
    parent: Component Editor
    order: 3
date: 2026-02-07
---

If you have linked a [Data Source](/data-sources/) to a component, then you can use its values in component designs.

## Usage in Text Elements

To display dynamic data, wrap the **identifier** for a column in double curly brackets. The system will automatically replace these tags with the corresponding row data during rendering.

**Example:**
If you link a data source with headers like **Name** and **Power**, you can use these tags:

* `{{'{{'}}  Name }}`
* `{{'{{'}} Name}}` (Whitespace inside the brackets is optional)

---

## Identifiers

Merge field identifiers must be alphanumeric (letters, numbers, and underscores only). Deckle automatically generates valid identifiers from your data source column headers by removing spaces and special characters.

| Column Header | Generated Identifier | Merge Field Syntax |
| --- | --- | --- |
| **Name** | `Name` | `{{'{{'}} Name }}` |
| **Hero Name** | `HeroName` | `{{'{{'}} HeroName }}` |
| **Attack Stat** | `AttackStat` | `{{'{{'}} AttackStat }}` |
| **HP (Max)** | `HPMax` | `{{'{{'}} HPMax }}` |

{% alert 'Tip: Hover over a column header in the Data Source panel to see the generated merge field identifier in a tooltip.' 'info' %}

---

## Formulas & Expressions

Merge fields support formula expressions using standard operators and functions:

* `{{'{{'}} Price + Tax }}` - Arithmetic
* `{{'{{'}} IF(Type = \'Fire\', "Burnt", "Wet") }}` - Conditional logic

Because identifiers are alphanumeric, you can use them directly in expressions without any special quoting.

---

## Default & Fallback Values

Sometimes a data source might have missing values or a specific row might be empty. You can define a **fallback value** using the pipe (`|`) symbol. This ensures your design never looks "broken" to the end user.

| Scenario | Syntax | Result if Data is Missing |
| --- | --- | --- |
| **With Fallback** | `{{'{{'}}  Cost \| FREE }}` | FREE
| **Empty Fallback** | `{{'{{'}}  Name \| }}` |
| **No Fallback** | `{{'{{'}}  Cost }}` | Displays the raw tag `{{'{{'}}  Cost }}` |

{% alert 'Tip: Use an empty fallback `{{ Field | }}` if you want the text to simply disappear when no data is available, rather than showing the curly braces in the final output.' 'info' %}

---

## Icons

You can insert icons into text elements using **single curly brackets** with square brackets around the icon name:

```
{[icon-name]}
```

This renders a [Font Awesome](https://fontawesome.com/search?ic=free-collection) icon in the **Regular** style. Icon names use lowercase letters, numbers, and hyphens.

**Examples:**

| Syntax | Result |
| --- | --- |
| `{[star]}` | A star icon (regular style) |
| `{[address-card]}` | An address card icon |
| `{[heart]}` | A heart icon (regular style) |

### Solid Icons

To use the **solid** variant of an icon, add the `s:` prefix before the icon name:

```
{[s:icon-name]}
```

| Syntax | Result |
| --- | --- |
| `{[s:star]}` | A solid star icon |
| `{[s:heart]}` | A solid heart icon |
| `{[s:shield]}` | A solid shield icon |

Many icons are available in both regular and solid styles. The solid style is typically bolder and filled in, while the regular style uses outlines.

{% alert 'Tip: The icon picker in the editor will automatically set the correct prefix for you. When both styles are available for an icon, you can choose between them in the picker.' 'info' %}

### Available Icons

Only icons from the **free** Font Awesome collection are available. You can browse them at [fontawesome.com](https://fontawesome.com/search?ic=free-collection).

---

## Inline Classes

{% alert 'Note: The inline class syntax is functional in the rendering engine, but the UI for defining and managing custom classes has not yet been implemented.' 'warning' %}

You can wrap text in a custom CSS class using **single curly brackets** with a colon separator:

```
{className: text content}
```

This renders as `<span class="className">text content</span>`, allowing you to apply custom styling to portions of your text.

**Example:**

| Syntax | Output |
| --- | --- |
| `{highlight: world}` | Wraps "world" in a span with class `highlight` |
| `{bold-red: Warning!}` | Wraps "Warning!" in a span with class `bold-red` |

You can also combine a class with an icon:

```
{className:[icon-name]}
```

This wraps the icon in a span with the specified class, letting you style individual icons differently.

| Syntax | Result |
| --- | --- |
| `{big:[star]}` | A star icon wrapped with class `big` |
| `{text-red:[heart]}` | A heart icon wrapped with class `text-red` |
