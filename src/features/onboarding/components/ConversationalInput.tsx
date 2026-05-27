/**
 * Conversational Input Field
 * --------------------------
 * A calm, large, single-line/multi-line text field designed to feel like a
 * chat reply — not a form input. Voice-ready: in a future phase, the mic
 * adornment becomes active and pipes a transcript into `onChange`.
 *
 * Intentionally not a shadcn Input: onboarding's UX is bespoke and we
 * don't want generic form styling here.
 */

import { Mic } from "lucide-react";
import { type TextareaHTMLAttributes, forwardRef } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Show the (currently inert) voice adornment. Defaults to true. */
  showVoiceHint?: boolean;
}

export const ConversationalInput = forwardRef<HTMLTextAreaElement, Props>(
  function ConversationalInput(
    { showVoiceHint = true, className = "", ...rest },
    ref,
  ) {
    return (
      <div className="relative">
        <textarea
          ref={ref}
          rows={3}
          className={[
            "w-full resize-none rounded-3xl bg-surface px-5 py-4 pr-14",
            "text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/70",
            "shadow-soft outline-none",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
            className,
          ].join(" ")}
          {...rest}
        />
        {showVoiceHint && (
          <div
            aria-hidden
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary/70"
            title="Voice input arrives in a later phase"
          >
            <Mic className="size-5" strokeWidth={1.5} />
          </div>
        )}
      </div>
    );
  },
);
