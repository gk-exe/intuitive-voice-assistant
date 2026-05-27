import { Mic } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onPress?: () => void;
  isListening?: boolean;
  label?: string;
}

/**
 * MicButton — the single most important control in the app.
 *
 * - Huge tap target (168px) so it's reachable for anyone.
 * - Idle: a soft breathing ring invites interaction without nagging.
 * - Listening state will be wired in the voice phase.
 *
 * Decoupled from any STT engine — emits onPress only. The voice service
 * (added in a later phase) owns capture/transcription.
 */
export function MicButton({ onPress, isListening = false, label = "Tap to talk" }: Props) {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/25 animate-breathe"
        />
        <motion.button
          type="button"
          onClick={onPress}
          whileTap={{ scale: 0.94 }}
          aria-label={label}
          className={[
            "relative flex items-center justify-center rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-lifted",
            "transition-colors",
            isListening ? "ring-8 ring-primary/30" : "",
          ].join(" ")}
          style={{ width: 168, height: 168 }}
        >
          <Mic className="size-16" strokeWidth={1.5} />
        </motion.button>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
