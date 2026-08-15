"use client";

import { useEffect } from "react";

export default function RemoveAnxiousCard() {
  useEffect(() => {
    const hide = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const button of buttons) {
        const text = button.textContent?.replace(/\s+/g, " ").trim() || "";
        if (/^I(?:’|')m anxious\b/.test(text) || text === "Reset") {
          const section = button.closest("section");
          if (section) (section as HTMLElement).style.display = "none";
        }
      }
    };

    hide();
    const firstPass = window.setTimeout(hide, 100);
    const secondPass = window.setTimeout(hide, 500);
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(firstPass);
      window.clearTimeout(secondPass);
      observer.disconnect();
    };
  }, []);

  return null;
}
