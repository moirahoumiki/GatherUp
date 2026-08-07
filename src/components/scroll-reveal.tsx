"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = [
  ".event-card",
  ".venue-card",
  ".content-card",
  ".hero-card",
  ".action-card",
  ".metric-card",
  ".order-card",
  ".next-action-card",
  ".g2-info-card",
  ".g2-ticket"
].join(", ");

export function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    document.documentElement.classList.add("reveal-ready");

    function handleAnimationEnd(event: Event) {
      const target = event.currentTarget as HTMLElement;
      target.classList.remove("reveal-item", "is-revealed");
      target.removeEventListener("animationend", handleAnimationEnd);
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.addEventListener("animationend", handleAnimationEnd);
            entry.target.classList.add("is-revealed");
            intersectionObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    function observeNewTargets() {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        if (!(element as HTMLElement).dataset.revealTracked) {
          (element as HTMLElement).dataset.revealTracked = "1";
          element.classList.add("reveal-item");
          intersectionObserver.observe(element);
        }
      });
    }

    observeNewTargets();

    const mutationObserver = new MutationObserver(() => {
      observeNewTargets();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
