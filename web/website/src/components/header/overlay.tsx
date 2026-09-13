"use client";

import { useLayoutEffect, useId, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { IconX } from "@tabler/icons-react";

export type HeaderOverlayProps = { logo: ReactNode; icon: ReactNode; className: string };

export function HeaderOverlay({ logo, icon, className, label, title, panel = false, children }: HeaderOverlayProps & {
  label: string;
  title: string;
  panel?: boolean;
  children: (state: { opened: boolean; close: () => void; id: string }) => ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState(false);

  useLayoutEffect(() => {
    if (!opened) return;
    const root = document.documentElement;
    const body = document.body;
    const modal = dialog.current!;
    const previous = { root: root.style.overflow, body: body.style.overflow, padding: body.style.paddingRight, modalPadding: modal.style.paddingRight };
    // Preserve the same usable width in the page and overlay when scroll is locked.
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbarWidth}px`;
    modal.style.paddingRight = `${scrollbarWidth}px`;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous.root;
      body.style.overflow = previous.body;
      body.style.paddingRight = previous.padding;
      modal.style.paddingRight = previous.modalPadding;
    };
  }, [opened]);

  function close() { dialog.current?.close(); }
  function closeOutside(event: MouseEvent<HTMLElement>) {
    if (event.target === event.currentTarget) close();
  }

  return <>
    <button ref={trigger} type="button" className={className} aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={opened} aria-controls={id}
      onClick={() => { dialog.current?.showModal(); setOpened(true); }}>{icon}</button>
    <dialog ref={dialog} id={id} aria-label={title} aria-modal="true"
      onClose={() => { setOpened(false); trigger.current?.focus({ preventScroll: true }); }}
      onClick={closeOutside}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-section-dark-text backdrop:bg-menu-overlay">
      <div className="mx-auto h-full w-full max-w-[1440px]" onClick={closeOutside}>
        <div className={`flex h-[143px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-[120px] ${panel ? "bg-section-dark-bg" : ""}`}>
          <div className="w-[370.616px] min-w-0" onClick={close}>{logo}</div>
          <div className="flex w-24 shrink-0 justify-end sm:w-[156px]">
            <button type="button" autoFocus onClick={close} aria-label={`${label} хаах`} title={`${label} хаах`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-section-dark-text/10 hover:bg-section-dark-text/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><IconX size={24} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="h-[calc(100dvh-143px)] overflow-y-auto overscroll-contain" onClick={closeOutside}>
          {children({ opened, close, id })}
        </div>
      </div>
    </dialog>
  </>;
}
