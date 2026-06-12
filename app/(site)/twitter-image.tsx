import { renderSiteOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Yours Fairy Tale — an animated fairy tale made for them.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderSiteOg();
}
