"use client";

import { useEffect } from "react";

export default function RemoveAnxiousCard() {
  useEffect(() => {
    const hide = () => {
      const candidates = Array.from(document.querySelectorAll("button"));
      const anxiousButton = candidates.find((button) =>
        button.textContent?.trim().startsWith("I’m anxious") ||
        button.textContent?.trim().startsWith("I'm anxious")
      );
      const card = anxiousButton?.closest("section");
      if (card) {
        (card as HTMLElement).style.display = "none";
      }
    };

    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
