"use client";

import { usePhotoUrl } from "@/lib/photos";
import { Icon } from "./Icons";

/** Square photo thumbnail; shows a camera icon if the photo isn't on this device. */
export default function Thumb({ photoId, size = 44, className = "" }: { photoId?: string; size?: number; className?: string }) {
  const url = usePhotoUrl(photoId);
  return (
    <span className={`thumb ${className}`} style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <Icon name="camera" size={Math.round(size * 0.42)} />
      )}
    </span>
  );
}

/** Full-width photo, used in sheets. Renders nothing until the photo has loaded. */
export function Photo({ photoId }: { photoId?: string }) {
  const url = usePhotoUrl(photoId);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="photo" src={url} alt="Meal photo" />;
}
