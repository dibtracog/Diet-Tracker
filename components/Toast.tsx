"use client";

import { useCallback, useRef, useState } from "react";
import { Icon, type IconName } from "./Icons";

type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { icon?: IconName; action?: ToastAction };

export function useToast() {
  const [message, setMessage] = useState("");
  const [icon, setIcon] = useState<IconName>("check");
  const [action, setAction] = useState<ToastAction | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((msg: string, opts: ToastOptions = {}) => {
    setMessage(msg);
    setIcon(opts.icon ?? "check");
    setAction(opts.action ?? null);
    setVisible(true);
    window.clearTimeout(timer.current);
    // Leave more time when there is an Undo button to reach for.
    timer.current = window.setTimeout(() => setVisible(false), opts.action ? 4500 : 1800);
  }, []);

  const node = (
    <div className={`toast ${visible ? "show" : ""} ${action ? "has-action" : ""}`} role="status" aria-live="polite">
      <Icon name={icon} size={16} strokeWidth={2.4} />
      <span>{message}</span>
      {action ? (
        <button
          type="button"
          className="toast-action"
          tabIndex={visible ? 0 : -1}
          onClick={() => {
            action.onClick();
            setVisible(false);
          }}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );

  return { show, node };
}
