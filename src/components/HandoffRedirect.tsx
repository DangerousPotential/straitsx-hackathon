"use client";

import { useEffect } from "react";

export function HandoffRedirect() {
  useEffect(() => {
    if (!new URLSearchParams(window.location.hash.slice(1)).has("lastMile")) {
      return;
    }
    window.location.replace(`/agent/${window.location.hash}`);
  }, []);

  return null;
}
