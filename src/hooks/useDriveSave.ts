import { useState } from "react";
import { saveToDrive } from "../geminiService";

interface UseDriveSaveReturn {
  saving: boolean;
  saved: boolean;
  link: string | undefined;
  save: (filename: string, content: string, mimeType?: string, asGoogleDoc?: boolean) => Promise<void>;
  reset: () => void;
}

export function useDriveSave(): UseDriveSaveReturn {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [link, setLink] = useState<string | undefined>();

  async function save(filename: string, content: string, mimeType?: string, asGoogleDoc?: boolean) {
    setSaving(true);
    try {
      const result = await saveToDrive(filename, content, mimeType, asGoogleDoc);
      setLink(result.link ?? undefined);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setSaving(false);
    setSaved(false);
    setLink(undefined);
  }

  return { saving, saved, link, save, reset };
}
