"use client";

import { useEffect } from "react";

export default function RemoveAnxiousCard() {
  useEffect(() => {
    const hideRedundantCards = () => {
      const sections = Array.from(document.querySelectorAll("section"));
      for (const section of sections) {
        const text = section.textContent?.replace(/\s+/g, " ").trim() || "";
        if (/^I(?:’|')m anxious\b/.test(text) || /I(?:’|')m anxious/.test(text)) {
          (section as HTMLElement).style.display = "none";
        }
        if (/^Reset\b/.test(text) || /⚡\s*Reset\b/.test(text)) {
          (section as HTMLElement).style.display = "none";
        }
      }

      const buttons = Array.from(document.querySelectorAll("button"));
      for (const button of buttons) {
        const text = button.textContent?.replace(/\s+/g, " ").trim() || "";
        if (/^I(?:’|')m anxious\b/.test(text) || /^⚡\s*Reset\b/.test(text)) {
          const parent = button.closest("section") || button.parentElement;
          if (parent) (parent as HTMLElement).style.display = "none";
        }
      }
    };

    hideRedundantCards();
    const firstPass = window.setTimeout(hideRedundantCards, 100);
    const secondPass = window.setTimeout(hideRedundantCards, 500);
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
