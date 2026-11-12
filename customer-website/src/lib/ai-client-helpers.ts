export interface ClientAttachment {
  name: string;
  mimeType: string;
  textContent?: string;
  dataUrl?: string;
}

export async function readFileToAiAttachment(file: File): Promise<ClientAttachment> {
  const mime = file.type || "application/octet-stream";
  const name = file.name;

  if (mime.startsWith("image/")) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
    return { name, mimeType: mime, dataUrl };
  }

  if (
    mime.startsWith("text/") ||
    /\.(txt|md|csv|json|html|xml)$/i.test(name)
  ) {
    const textContent = (await file.text()).slice(0, 14000);
    return { name, mimeType: mime, textContent };
  }

  // Extract readable ASCII/UTF-8 runs for DOCX/PDF client previews without blocking
  const buf = await file.arrayBuffer();
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 120000));
  const cleanRuns = decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\x20-\x7E\u00A0-\u024F\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

  return {
    name,
    mimeType: mime,
    textContent: cleanRuns || `[Uploaded ${name} (${Math.round(file.size / 1024)} KB)]`,
  };
}

export function speakAiText(text: string, onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[#*_`>]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return false;
  const utter = new SpeechSynthesisUtterance(clean.slice(0, 2000));
  utter.rate = 1.0;
  utter.pitch = 1.0;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
  return true;
}

export function stopAiSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function startVoiceDictation(
  onTranscript: (text: string) => void,
  onError: (msg: string) => void,
  onEnd: () => void
): (() => void) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: (ev: { error?: string }) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    webkitSpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: (ev: { error?: string }) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onError("Voice dictation requires a modern browser with Web Speech API (Chrome / Edge / Safari).");
    onEnd();
    return null;
  }

  try {
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript || "";
      if (text) onTranscript(text);
    };
    rec.onerror = (ev) => {
      onError(ev.error === "not-allowed" ? "Microphone permission denied." : `Voice input error: ${ev.error || "unknown"}`);
    };
    rec.onend = onEnd;
    rec.start();
    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  } catch {
    onError("Could not start microphone recognition.");
    onEnd();
    return null;
  }
}
