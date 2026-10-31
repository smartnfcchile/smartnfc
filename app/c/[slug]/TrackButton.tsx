"use client";

type TrackButtonProps = {
  cardId: string;
  eventType:
    | "WHATSAPP_CLICK"
    | "PHONE_CLICK"
    | "EMAIL_CLICK"
    | "LINK_CLICK"
    | "VCARD_DOWNLOAD";
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function TrackButton({
  cardId,
  eventType,
  href,
  children,
  className,
  style,
}: TrackButtonProps) {
  function handleClick() {
    fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cardId, eventType }),
      keepalive: true,
    }).catch(() => {});

    if (eventType === "VCARD_DOWNLOAD") return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  // Native navigation remains available before hydration and without JavaScript.
  // Tracking measures a click only; its failure must never block the contact.
  if (eventType === "VCARD_DOWNLOAD") {
    return <a href={href} onClick={handleClick} className={className} style={style}>{children}</a>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${className ?? ""} cursor-pointer`}
      style={style}
    >
      {children}
    </button>
  );
}
