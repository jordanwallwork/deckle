---
title: Merge Fields
layout: libdoc_page.liquid
permalink: merge-fields/index.html
eleventyNavigation:
    key: Merge Fields
    parent: User Guide
    order: 4
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
