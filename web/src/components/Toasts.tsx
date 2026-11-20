import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon.tsx";

export type ToastTone = "success" | "error" | "info" | "undo";
interface ToastItem {
  id: number;
  tone: ToastTone;
  text: string;
  ms: number;
  /** A toast with a group replaces the one before it in that group instead of stacking under it. */
  group?: string;
  /** An undo toast's own picture (the bin by default). */
  icon?: IconName;
}

export interface ToastOptions {
  /** One toast per group on screen: a new one replaces the last (for example, practice taps on "Try it"). */
  group?: string;
  /** How long it stays (default 4.2 s, or 7 s for an error). */
  ms?: number;
}

export interface UndoOptions {
  /** Runs if the owner taps Undo in time. */
  onUndo: () => void;
  /** Runs when the time is up (or the page is closing): this is where the real delete happens. */
  onCommit: () => void;
  /** How long Undo stays available. */
  ms?: number;
  /** The picture beside the words: the bin by default; an undo of an addition shows what was added (§38). */
  icon?: IconName;
}

export interface Toaster {
  success(text: string, options?: ToastOptions): void;
  error(text: string, options?: ToastOptions): void;
  info(text: string, options?: ToastOptions): void;
  /** "Thrown away. Undo": the action only really happens after `ms` (8 s) unless Undo is tapped. */
  undo(text: string, options: UndoOptions): void;
}

export const UNDO_MS = 8000;

const Ctx = createContext<Toaster | null>(null);

export function useToast(): Toaster {
  const t = useContext(Ctx);
  if (!t) throw new Error("useToast outside ToastProvider");
  return t;
}

/** Toasts live in two live regions: polite for news, assertive for errors. `onError` plays the deny sound. */
export function ToastProvider({ children, onError }: { children: ReactNode; onError?: () => void }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  // Undo toasts that have not been decided yet: id → what to run.
  const pending = useRef(new Map<number, UndoOptions & { timer: ReturnType<typeof setTimeout> }>());

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const commit = useCallback(
    (id: number) => {
      const p = pending.current.get(id);
      if (!p) return;
      pending.current.delete(id);
      clearTimeout(p.timer);
      dismiss(id);
      p.onCommit();
    },
    [dismiss],
  );

  const undo = useCallback(
    (id: number) => {
      const p = pending.current.get(id);
      if (!p) return;
      pending.current.delete(id);
      clearTimeout(p.timer);
      dismiss(id);
      p.onUndo();
    },
    [dismiss],
  );

  // Closing the tab inside the Undo window still carries out what the owner asked for.
  useEffect(() => {
    const flush = () => {
      for (const id of Array.from(pending.current.keys())) commit(id);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [commit]);

  const push = useCallback(
    (tone: ToastTone, text: string, ms?: number, group?: string, icon?: IconName): number => {
      const id = next.current++;
      const life = ms ?? (tone === "error" ? 7000 : 4200);
      setItems((all) => {
        // Never drop an undo toast that is still counting down: it holds a decision.
        const keep = all.filter((t) => t.tone === "undo" || (t.text !== text && (!group || t.group !== group)));
        const old = keep.filter((t) => t.tone !== "undo").slice(-2);
        const undos = keep.filter((t) => t.tone === "undo");
        const item: ToastItem = { id, tone, text, ms: life, ...(group ? { group } : {}), ...(icon ? { icon } : {}) };
        return [...undos, ...old, item].sort((a, b) => a.id - b.id);
      });
      if (tone === "error") onErrorRef.current?.();
      if (tone !== "undo") setTimeout(() => dismiss(id), life);
      return id;
    },
    [dismiss],
  );

  const api = useMemo<Toaster>(
    () => ({
      success: (t, o) => void push("success", t, o?.ms, o?.group),
      error: (t, o) => void push("error", t, o?.ms, o?.group),
      info: (t, o) => void push("info", t, o?.ms, o?.group),
      undo: (t, options) => {
        const ms = options.ms ?? UNDO_MS;
        const id = push("undo", t, ms, undefined, options.icon);
        pending.current.set(id, { ...options, timer: setTimeout(() => commit(id), ms) });
      },
    }),
    [push, commit],
  );

  const icon = (t: ToastItem) =>
    t.icon ?? (t.tone === "error" ? "alert" : t.tone === "success" ? "checkCircle" : t.tone === "undo" ? "trash" : "info");

  const render = (filter: (t: ToastItem) => boolean) =>
    items.filter(filter).map((t) => (
      <div key={t.id} className={`toast toast--${t.tone} glass`}>
        <Icon name={icon(t)} />
        <p className="toast__text">{t.text}</p>
        {t.tone === "undo" ? (
          <>
            <button type="button" className="toast__undo" onClick={() => undo(t.id)}>
              <Icon name="undo" size={18} />
              <span>Undo</span>
            </button>
            <span className="toast__timer" style={{ animationDuration: `${t.ms}ms` }} aria-hidden="true" />
          </>
        ) : (
          <button type="button" className="toast__close" aria-label="Close message" onClick={() => dismiss(t.id)}>
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
    ));

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts">
        <div aria-live="polite" className="toasts__group">
          {render((t) => t.tone !== "error")}
        </div>
        <div aria-live="assertive" className="toasts__group">
          {render((t) => t.tone === "error")}
        </div>
      </div>
    </Ctx.Provider>
  );
}
