import { useMemo } from "react";
import { getUserInitials } from "../../utils/authHelpers";

function resolveProfilePictureUrl(profilePicture) {
  if (!profilePicture) return "";
  if (typeof profilePicture !== "string") return "";
  if (profilePicture.startsWith("http")) return profilePicture;
  if (profilePicture.startsWith("data:")) return profilePicture;
  // Use current hostname so this works on LAN / deployed domains too.
  return `${window.location.protocol}//${window.location.hostname}:8000${profilePicture}`;
}

export default function Avatar({
  user,
  src,
  alt,
  size = 32,
  className,
  style,
}) {
  const fallback = useMemo(() => getUserInitials(user), [user]);

  const resolvedSrc = useMemo(() => {
    if (src) return resolveProfilePictureUrl(src);
    return resolveProfilePictureUrl(user?.profilePicture ?? user?.profile_picture ?? user?.profilePictureUrl);
  }, [src, user]);

  if (resolvedSrc) {
    return (
      <img
        className={className}
        src={resolvedSrc}
        alt={alt ?? user?.name ?? "Avatar"}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          ...(style || {}),
        }}
      />
    );
  }

  return (
    <div
      className={className}
      aria-label={alt ?? user?.name ?? "Avatar"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...(style || {}),
      }}
    >
      {fallback}
    </div>
  );
}

