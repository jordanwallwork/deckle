import type { TemplateElement, ElementType } from "./types";

/**
 * Factory function to create new template elements with default values
 */
export function createElementOfType(type: ElementType): TemplateElement {
  if (type === "container") {
    return {
      id: crypto.randomUUID(),
      type: "container",
      visible: true,
      opacity: 1,
      display: "flex",
      flexConfig: {
        direction: "column",
        wrap: "nowrap",
        justifyContent: "flex-start",
        alignItems: "flex-start",
      },
      children: [],
    };
  } else if (type === "text") {
    return {
      id: crypto.randomUUID(),
      type: "text",
      visible: true,
      opacity: 1,
      content: "New Text",
      fontSize: 16,
      color: "#000000",
    };
  } else {
    // image
    return {
      id: crypto.randomUUID(),
      type: "image",
      visible: true,
      opacity: 1,
      imageId: "",
      dimensions: { width: 100, height: 100 },
    };
  }
}
