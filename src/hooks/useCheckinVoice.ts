import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

type Recognition = typeof import("expo-speech-recognition")["ExpoSpeechRecognitionModule"];
type Phase = "idle" | "starting" | "listening" | "stopping";
type VoiceError = "voiceUnavailable" | "voicePermission" | "voiceNoSpeech" | "voiceFailed";
type Session = {
  module?: Recognition;
  started: boolean;
  heardSpeech: boolean;
  subscriptions: { remove(): void }[];
};

export function useCheckinVoice(enabled: boolean, language: string, onTranscript: (text: string) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<VoiceError | null>(null);
  const current = useRef<Session | null>(null);

  const release = useCallback((session: Session, abort = false) => {
    if (current.current !== session) return;
    current.current = null;
    session.subscriptions.forEach(subscription => subscription.remove());
    if (abort && session.started) {
      try {
        session.module?.abort();
      } catch {
        // Recognition may already have ended after permission or audio service changes.
      }
    }
  }, []);

  const cancel = useCallback(() => {
    if (current.current) release(current.current, true);
    setPhase("idle");
    setError(null);
  }, [release]);

  useEffect(() => {
    if (!enabled) {
      cancel();
      return;
    }
    const appState = AppState.addEventListener("change", next => {
      if (next === "background") cancel();
    });
    return () => {
      appState.remove();
      if (current.current) release(current.current, true);
    };
  }, [enabled, cancel, release]);

  async function toggle() {
    if (!enabled) return;
    const active = current.current;
    if (active) {
      if (phase === "stopping") return;
      if (!active.started) {
        cancel();
      } else {
        setPhase("stopping");
        try {
          active.module?.stop();
        } catch {
          release(active, true);
          setPhase("idle");
          setError("voiceFailed");
        }
      }
      return;
    }

    const session: Session = { started: false, heardSpeech: false, subscriptions: [] };
    current.current = session;
    setError(null);
    setPhase("starting");
    const finish = (issue: VoiceError | null = null) => {
      if (current.current !== session) return;
      release(session);
      setPhase("idle");
      setError(issue);
    };

    try {
      // Resolve on demand so native builds without the speech module can still open chat.
      const { ExpoSpeechRecognitionModule: speech } = require("expo-speech-recognition") as typeof import("expo-speech-recognition");
      if (current.current !== session) return;
      if (!speech.isRecognitionAvailable()) {
        finish("voiceUnavailable");
        return;
      }
      session.module = speech;
      if (Platform.OS !== "web") {
        const permission = await speech.requestPermissionsAsync();
        if (current.current !== session) return;
        if (!permission.granted) {
          finish("voicePermission");
          return;
        }
      }
      session.subscriptions.push(
        speech.addListener("start", () => {
          if (current.current === session) setPhase(previous => previous === "stopping" ? previous : "listening");
        }),
        speech.addListener("result", event => {
          if (current.current !== session || !event.isFinal || session.heardSpeech) return;
          const transcript = event.results[0]?.transcript.trim();
          if (!transcript) return;
          session.heardSpeech = true;
          onTranscript(transcript);
        }),
        speech.addListener("end", () => finish(session.heardSpeech ? null : "voiceNoSpeech")),
        speech.addListener("error", ({ error: code }) => {
          if (code === "not-allowed") finish("voicePermission");
          else if (code === "no-speech") finish("voiceNoSpeech");
          else if (code === "service-not-allowed" || code === "language-not-supported") finish("voiceUnavailable");
          else finish(code === "aborted" ? null : "voiceFailed");
        }),
      );
      session.started = true;
      speech.start({ lang: language, continuous: false, interimResults: false, maxAlternatives: 1 });
    } catch {
      finish(session.module ? "voiceFailed" : "voiceUnavailable");
    }
  }

  return { phase, error, toggle, cancel };
}
