"use client";

import { Share2 } from "lucide-react";

import { shareEventLink } from "@/lib/mobile/share";

type EventShareButtonProps = {
  eventId: string;
  eventName: string;
};

export function EventShareButton({ eventId, eventName }: EventShareButtonProps) {
  async function handleShare() {
    const eventUrl = `${window.location.origin}/events/${eventId}`;
    const result = await shareEventLink({ eventName, eventUrl });

    if (!result.ok && result.channel === "unsupported") {
      await navigator.clipboard.writeText(eventUrl).catch(() => undefined);
      window.alert("当前环境不支持系统分享，已尝试复制链接。");
    }
  }

  return (
    <button className="g2-share-button" type="button" onClick={() => void handleShare()}>
      <Share2 size={16} aria-hidden="true" />
      分享活动
    </button>
  );
}