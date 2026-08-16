"use client";

import { useEffect } from "react";

export default function MomentumHistoryGuard() {
  useEffect(() => {
    let historyEntryActive = false;
    let closingFromPopState = false;

    const hasModal = () => Boolean(document.querySelector(".gameify-modal"));

    const ensureHistoryEntry = () => {
      if (!historyEntryActive && hasModal()) {
        window.history.pushState({ ...(window.history.state || {}), momentumModal: true }, "", window.location.href);
        historyEntryActive = true;
      }
    };

    const observer = new MutationObserver(ensureHistoryEntry);
    observer.observe(document.body, { childList: true, subtree: true });
    ensureHistoryEntry();

    const handlePopState = () => {
      if (!historyEntryActive) return;
      historyEntryActive = false;
      closingFromPopState = true;
      const closeButton = document.querySelector<HTMLButtonElement>(".gameify-modal .modal-close");
      closeButton?.click();
      window.setTimeout(() => { closingFromPopState = false; }, 0);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const closeButton = target?.closest(".gameify-modal .modal-close");
      if (!closeButton || closingFromPopState || !historyEntryActive) return;
      historyEntryActive = false;
      window.setTimeout(() => window.history.back(), 0);
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleClick);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return null;
}
