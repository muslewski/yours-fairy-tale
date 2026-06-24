import type { Field } from "payload";

/** A simple link: visible label, URL (internal "/path" or external), new-tab.
 *  Internal-reference picker is sub-project 2. */
export function linkGroup(name = "link", label = "Link"): Field {
  return {
    name,
    type: "group",
    label,
    fields: [
      { name: "label", type: "text", required: true },
      {
        name: "url",
        type: "text",
        required: true,
        admin: { description: 'Internal path ("/about") or full URL ("https://…").' },
      },
      { name: "newTab", type: "checkbox", label: "Open in new tab", defaultValue: false },
    ],
  };
}
