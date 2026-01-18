"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    const isDev = process.env.NODE_ENV === "development";
    const allowDev = process.env.NEXT_PUBLIC_ENABLE_SW === "true";

    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (isDev && !allowDev) {
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silent failure to avoid noisy errors in UI
      });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
