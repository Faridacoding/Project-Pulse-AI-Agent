import { useState, useEffect } from "react";
import { getGoogleAuthStatus, getGoogleAuthUrl, revokeGoogleAuth } from "../geminiService";

interface UseGoogleAuthReturn {
  connected: boolean;
  configured: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGoogleAuthStatus()
      .then(({ authenticated }) => setConnected(authenticated))
      .catch(() => {});

    const handler = (e: MessageEvent) => {
      if (e.data === "google-auth-success") setConnected(true);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  async function connect() {
    // Open the popup immediately while still in the user-gesture context.
    // Browsers block window.open called after an await (async delay expires the gesture).
    const authWindow = window.open("", "Google Auth", "width=600,height=700,left=400,top=100");
    if (!authWindow) {
      setError("Popup was blocked. Please allow popups for this site and try again.");
      return;
    }
    try {
      const { url } = await getGoogleAuthUrl();
      authWindow.location.href = url;
    } catch (e: unknown) {
      authWindow.close();
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("credentials not configured")) setConfigured(false);
      setError(msg || "Failed to connect Google account.");
    }
  }

  async function disconnect() {
    try {
      await revokeGoogleAuth();
    } catch {
      // Ignore revoke errors — always clear local state
    }
    setConnected(false);
  }

  return { connected, configured, connect, disconnect, error, clearError: () => setError(null) };
}
