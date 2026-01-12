"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Sun, Moon, Monitor, Newspaper, Rss, Volume2, Check, Loader2 } from "lucide-react";

interface UserPreferences {
  theme: "LIGHT" | "DARK" | "SYSTEM";
  defaultView: "FEED" | "EDITIONS";
  ttsVoice: string;
  availableVoices: Array<{id: string; name: string; language: string;}>;
}

const THEME_OPTIONS = [
  { value: "LIGHT", label: "Jasny", icon: Sun },
  { value: "DARK", label: "Ciemny", icon: Moon },
  { value: "SYSTEM", label: "Systemowy", icon: Monitor },
] as const;

const VIEW_OPTIONS = [
  { value: "FEED", label: "Feed", description: "Lista wszystkich artykulow", icon: Rss },
  { value: "EDITIONS", label: "Wydania", description: "Artykuly pogrupowane w wydania", icon: Newspaper },
] as const;

export default function AppearanceSettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => { fetchPreferences(); }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      if (!response.ok) throw new Error("Nie udalo sie pobrac");
      setPreferences(await response.json());
    } catch (err) { setError(err instanceof Error ? err.message : "Blad"); }
    finally { setIsLoading(false); }
  };

  const updatePreference = async (key: string, value: string) => {
    if (!preferences) return;
    setIsSaving(true); setError(null); setSavedMessage(null);
    try {
      const response = await fetch("/api/user/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) });
      if (!response.ok) throw new Error("Nie udalo sie zapisac");
      const data = await response.json();
      setPreferences((prev) => prev ? { ...prev, ...data } : prev);
      setSavedMessage("Zapisano"); setTimeout(() => setSavedMessage(null), 2000);
    } catch (err) { setError(err instanceof Error ? err.message : "Blad"); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return (<div className="max-w-md mx-auto min-h-screen bg-card pb-24"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mt-12" /></div>);
  if (error && !preferences) return (<div className="max-w-md mx-auto p-4"><p className="text-destructive text-center">{error}</p></div>);

  return (<div className="max-w-md mx-auto min-h-screen bg-card pb-24">
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="text-primary"><ChevronLeft className="w-6 h-6" /></Link>
        <h1 className="text-xl font-bold text-primary">Wyglad</h1>
        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted ml-auto" />}
        {savedMessage && <span className="text-sm text-accent ml-auto flex items-center gap-1"><Check className="w-4 h-4" />{savedMessage}</span>}
      </div>
    </header>
    <div className="p-4 space-y-6">
      {error && <div className="p-3 bg-destructive/10 rounded-lg text-destructive text-sm">{error}</div>}
      <section><h2 className="text-sm font-semibold text-muted uppercase mb-3">Motyw</h2>
        <div className="grid grid-cols-3 gap-2">{THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => updatePreference("theme", value)} disabled={isSaving} className={"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all " + (preferences?.theme === value ? "border-accent bg-accent/10" : "border-border")}>
            <Icon className={"w-6 h-6 " + (preferences?.theme === value ? "text-accent" : "text-muted")} />
            <span className={"text-sm " + (preferences?.theme === value ? "text-primary" : "text-muted")}>{label}</span>
          </button>
        ))}</div>
      </section>
      <section><h2 className="text-sm font-semibold text-muted uppercase mb-3">Domyslny widok</h2>
        <div className="space-y-2">{VIEW_OPTIONS.map(({ value, label, description, icon: Icon }) => (
          <button key={value} onClick={() => updatePreference("defaultView", value)} disabled={isSaving} className={"w-full flex items-center gap-4 p-4 rounded-xl border-2 " + (preferences?.defaultView === value ? "border-accent bg-accent/10" : "border-border")}>
            <div className={"w-10 h-10 rounded-full flex items-center justify-center " + (preferences?.defaultView === value ? "bg-accent text-card" : "bg-muted/20 text-muted")}><Icon className="w-5 h-5" /></div>
            <div className="flex-1 text-left"><p className={preferences?.defaultView === value ? "text-primary font-medium" : "text-muted"}>{label}</p><p className="text-sm text-muted">{description}</p></div>
            {preferences?.defaultView === value && <Check className="w-5 h-5 text-accent" />}
          </button>
        ))}</div>
      </section>
      <section><h2 className="text-sm font-semibold text-muted uppercase mb-3">Glos TTS</h2>
        <p className="text-sm text-muted mb-3">Wybierz glos do odczytywania artykulow.</p>
        <div className="space-y-2">{preferences?.availableVoices.map((voice) => (
          <button key={voice.id} onClick={() => updatePreference("ttsVoice", voice.id)} disabled={isSaving} className={"w-full flex items-center gap-4 p-4 rounded-xl border-2 " + (preferences?.ttsVoice === voice.id ? "border-accent bg-accent/10" : "border-border")}>
            <div className={"w-10 h-10 rounded-full flex items-center justify-center " + (preferences?.ttsVoice === voice.id ? "bg-accent text-card" : "bg-muted/20 text-muted")}><Volume2 className="w-5 h-5" /></div>
            <div className="flex-1 text-left"><p className={preferences?.ttsVoice === voice.id ? "text-primary font-medium" : "text-muted"}>{voice.name}</p><p className="text-sm text-muted">{voice.language}</p></div>
            {preferences?.ttsVoice === voice.id && <Check className="w-5 h-5 text-accent" />}
          </button>
        ))}</div>
      </section>
    </div>
  </div>);
}
