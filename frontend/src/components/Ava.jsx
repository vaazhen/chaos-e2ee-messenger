function pickAvatarUrl(props) {
  return (
    props.avatarUrl ||
    props.user?.avatarUrl ||
    props.me?.avatarUrl ||
    props.chat?.avatarUrl ||
    ""
  );
}

function pickName(props) {
  const user = props.user || props.me || props.chat || props;
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    props.name ||
    props.title ||
    fullName ||
    user.displayName ||
    user.username ||
    user.phone ||
    "Пользователь"
  );
}

function initialsFrom(value) {
  return String(value || "П")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(x => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "П";
}

function isImageAvatar(value) {
  if (!value) return false;

  return (
    value.startsWith("data:image/") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function isSavedPresetAvatar(value) {
  return String(value || "") === "preset:saved";
}

export default function Ava(props) {
  const avatarUrl = pickAvatarUrl(props);
  const name = pickName(props);

  const className =
    props.className ||
    `av${props.size ? ` ${props.size}` : ""}`;

  if (isSavedPresetAvatar(avatarUrl)) {
    return (
      <div className="av-wrap">
        <div className={`${className} saved-avatar`} title={name}>
          <svg
            className="saved-avatar-star"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 3.4l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.3l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3.4z" />
          </svg>
        </div>
        {props.online && <span className="online-dot" />}
      </div>
    );
  }

  if (isImageAvatar(avatarUrl)) {
    return (
      <div className="av-wrap">
        <div className={className} title={name}>
          <img
            src={avatarUrl}
            alt={name}
            draggable="false"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              borderRadius: "inherit",
            }}
          />
        </div>
        {props.online && <span className="online-dot" />}
      </div>
    );
  }

  return (
    <div className="av-wrap">
      <div className={className} title={name}>
        {initialsFrom(name)}
      </div>
      {props.online && <span className="online-dot" />}
    </div>
  );
}