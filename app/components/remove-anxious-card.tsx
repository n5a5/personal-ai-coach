"use client";

import { useEffect } from "react";

export default function RemoveAnxiousCard() {
  useEffect(() => {
    const hideRedundantCards = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const button of buttons) {
        const text = button.textContent?.replace(/\s+/g, " ").trim() || "";
        if (text === "Reset" || text === "⚡ Reset") {
          const card = button.closest("section");
          if (card) (card as HTMLElement).remove();
        }
      }

      const anxious = Array.from(document.querySelectorAll("button")).find((button) => {
        const text = button.textContent?.replace(/\s+/g, " ").trim() || "";
        return /^I(?:’|')m anxious\b/.test(text);
      });
      if (anxious) {
        const card = anxious.closest("section") || anxious.parentElement;
        if (card) (card as HTMLElement).remove();
      }
    };

    hideRedundantCards();
    const firstPass = window.setTimeout(hideRedundantCards, 50);
    const secondPass = window.setTimeout(hideRedundantCards, 300);
    const observer = new MutationObserver(hideRedundantCards);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(firstPass);
      window.clearTimeout(secondPass);
      observer.disconnect();
    };
  }, []);

  return null;
}
