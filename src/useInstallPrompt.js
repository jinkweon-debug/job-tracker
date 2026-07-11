import { useEffect, useState } from "react";

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/Macintosh/.test(ua);
}

function detectStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

// Captures the browser's native install prompt (desktop/Android Chrome/Edge).
// iOS has no such event — Safari never fires beforeinstallprompt — so callers
// show manual "Add to Home Screen" instructions when isIOS is true instead.
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIOS] = useState(detectIOS);
  const [isInstalled, setIsInstalled] = useState(detectStandalone);

  useEffect(() => {
    if (isIOS) return;

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isIOS]);

  return { installPrompt, isIOS, isInstalled };
}
