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

    if (eventType === "VCARD_DOWNLOAD") {
      const link = document.createElement("a");
      link.href = href;
      link.download = "contacto.vcf";
      link.click();
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
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