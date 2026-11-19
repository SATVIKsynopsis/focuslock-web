const SESSION_SECS = 25 * 60;
const PASS_SECS = 2 * 60;
const MAX_PASSES = 3;
const MIN_REASON = 10;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Kind = "allowed" | "distraction";
const TITLES: Record<string, string> = {
  editor: "main.rs — focus",
  reader: "paper.pdf — PDF Reader",
  terminal: "zsh — 80×24",
  video: "Video — autoplay",
  chat: "Chat — #general",
  social: "Social — For you",
};
const NAMES: Record<string, string> = {
  editor: "Editor",
  reader: "PDF Reader",
  terminal: "Terminal",
  video: "Video",
  chat: "Chat",
  social: "Social",
};

export interface TickDetail {
  session: string;
  pass: string | null;
}

export function initDesktop(root: HTMLElement) {
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const desk = q("[data-desk]");
  const screen = q("[data-screen]");
  const toasts = q("[data-toasts]");
  const hint = q("[data-hint]");
  const timerEl = q("[data-timer]");
  const passChip = q("[data-pass-chip]");
  const passEl = q("[data-pass]");
  const countEl = q("[data-count]");
  const mbApp = q("[data-mb-app]");
  const clockEl = q("[data-clock]");
  const announceEl = q("[data-announce]");
  const needBtn = q<HTMLButtonElement>("[data-need]");
  const dialog = q<HTMLDialogElement>("[data-dialog]");
  const form = q<HTMLFormElement>("[data-dialog-form]");
  const reason = q<HTMLInputElement>("[data-reason]");
  const reasonCount = q("[data-reason-count]");
  const okBtn = q<HTMLButtonElement>("[data-ok]");
  const passesLeftEl = q("[data-passes-left]");

  let sessionEnd = Date.now() + (SESSION_SECS - 1) * 1000;
  let passEnd = 0;
  let passesUsed = 0;
  let blocked = 0;
  let z = 10;
  let opener: HTMLElement | null = null;
  const windows = new Map<string, HTMLElement>();
  const busy = new Set<string>();

  const secsLeft = (end: number) => Math.max(0, Math.ceil((end - Date.now()) / 1000));
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const passActive = () => passEnd > Date.now();
  const minutesLeft = () => Math.max(1, Math.floor(secsLeft(sessionEnd) / 60));

  function announce(text: string) {
    announceEl.textContent = "";
    requestAnimationFrame(() => (announceEl.textContent = text));
  }

  let wasPass = false;
  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (secsLeft(sessionEnd) === 0) {
      toast("✓", "Session complete", "25 minutes of focus. Nice work!", "ok");
      sessionEnd = Date.now() + SESSION_SECS * 1000;
      passesUsed = 0;
      passEnd = 0;
      updatePassUi();
    }
    timerEl.textContent = fmt(secsLeft(sessionEnd));

    const pass = passActive();
    passChip.hidden = !pass;
    if (pass) passEl.textContent = fmt(secsLeft(passEnd));
    if (wasPass && !pass) passEnded();
    wasPass = pass;

    document.dispatchEvent(
      new CustomEvent<TickDetail>("focuslock:tick", {
        detail: { session: fmt(secsLeft(sessionEnd)), pass: pass ? fmt(secsLeft(passEnd)) : null },
      })
    );
  }
  tick();
  setTimeout(() => {
    tick();
    setInterval(tick, 1000);
  }, (sessionEnd - Date.now()) % 1000);

  function toast(icon: string, title: string, body: string, tone: "nope" | "ok") {
    const t = document.createElement("div");
    t.className = `fd-toast is-${tone}`;
    const ic = document.createElement("span");
    ic.className = "fd-toast-icon";
    ic.textContent = icon;
    const text = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = title;
    const s = document.createElement("span");
    s.textContent = body;
    text.append(b, s);
    t.append(ic, text);
    toasts.prepend(t);
    while (toasts.children.length > 3) toasts.lastElementChild!.remove();
    setTimeout(() => {
      t.classList.add("is-out");
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  function makeWindow(app: string): HTMLElement {
    const win = document.createElement("section");
    win.className = "fd-win";
    win.dataset.win = app;
    win.setAttribute("aria-label", `${NAMES[app]} window`);

    const bar = document.createElement("div");
    bar.className = "fd-win-bar";
    const lights = document.createElement("div");
    lights.className = "fd-lights";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "fd-close";
    close.setAttribute("aria-label", `Close ${NAMES[app]}`);
    close.addEventListener("click", () => closeWindow(app));
    lights.append(close, document.createElement("span"), document.createElement("span"));
    const title = document.createElement("div");
    title.className = "fd-win-title";
    title.textContent = TITLES[app];
    bar.append(lights, title);

    const body = document.createElement("div");
    body.className = "fd-win-body";
    const tpl = root.querySelector<HTMLTemplateElement>(`template[data-tpl="${app}"]`);
    if (tpl) body.append(tpl.content.cloneNode(true));

    win.append(bar, body);
    makeDraggable(win, bar);
    win.addEventListener("pointerdown", () => focusWindow(app));
    return win;
  }

  function placeWindow(win: HTMLElement) {
    const n = windows.size;
    win.style.left = `${6 + (n % 4) * 7}%`;
    win.style.top = `${5 + (n % 4) * 7}%`;
  }

  function openWindow(app: string) {
    const existing = windows.get(app);
    if (existing) return focusWindow(app);
    const win = makeWindow(app);
    placeWindow(win);
    win.classList.add("is-new");
    screen.append(win);
    windows.set(app, win);
    dockButton(app).classList.add("is-open");
    focusWindow(app);
    if (!reducedMotion()) {
      zoomFromDock(win, app, "open");
    }
    hint.classList.add("is-gone");
  }

  function closeWindow(app: string) {
    const win = windows.get(app);
    if (!win) return;
    windows.delete(app);
    dockButton(app).classList.remove("is-open");
    win.remove();
    const front = [...windows.entries()].sort((a, b) => Number(b[1].style.zIndex) - Number(a[1].style.zIndex))[0];
    mbApp.textContent = front ? NAMES[front[0]] : "Finder";
    for (const [, w] of windows) w.classList.toggle("is-front", w === front?.[1]);
    dockButton(app).focus({ preventScroll: true });
  }

  function focusWindow(app: string) {
    const win = windows.get(app);
    if (!win) return;
    win.style.zIndex = String(++z);
    for (const [, w] of windows) w.classList.toggle("is-front", w === win);
    mbApp.textContent = NAMES[app];
  }

  function makeDraggable(win: HTMLElement, handle: HTMLElement) {
    handle.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (root.clientWidth <= 520) return;
      const start = { x: e.clientX, y: e.clientY, left: win.offsetLeft, top: win.offsetTop };
      handle.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const maxL = screen.clientWidth - 80;
        const maxT = screen.clientHeight - 40;
        win.style.left = `${Math.min(maxL, Math.max(-win.offsetWidth + 80, start.left + ev.clientX - start.x))}px`;
        win.style.top = `${Math.min(maxT, Math.max(0, start.top + ev.clientY - start.y))}px`;
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  }

  const dockButton = (app: string) => root.querySelector<HTMLButtonElement>(`[data-app="${app}"]`)!;

  function dockTransform(win: HTMLElement, app: string) {
    const w = win.getBoundingClientRect();
    const d = dockButton(app).getBoundingClientRect();
    const sx = d.width / w.width;
    const sy = d.height / w.height;
    return `translate(${d.left - w.left}px, ${d.top - w.top}px) scale(${sx}, ${sy})`;
  }

  function zoomFromDock(win: HTMLElement, app: string, dir: "open" | "close") {
    win.style.transformOrigin = "0 0";
    const docked = { transform: dockTransform(win, app), opacity: 0.2 };
    const full = { transform: "none", opacity: 1 };
    return win.animate(dir === "open" ? [docked, full] : [full, docked], {
      duration: dir === "open" ? 260 : 320,
      easing: dir === "open" ? "cubic-bezier(.2,.9,.3,1)" : "cubic-bezier(.6,0,.9,.4)",
      fill: "forwards",
    }).finished;
  }

  async function bounce(app: string, existingWin?: HTMLElement) {
    if (busy.has(app)) return;
    busy.add(app);
    blocked++;
    countEl.textContent = String(blocked);
    const left = minutesLeft();
    hint.classList.add("is-gone");

    if (reducedMotion()) {
      existingWin?.remove();
      if (existingWin) windows.delete(app);
      dockButton(app).classList.remove("is-open");
    } else {
      const btn = dockButton(app);
      btn.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-22px)" }, { transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }],
        { duration: 600, easing: "ease-out" }
      );
      const win = existingWin ?? makeWindow(app);
      if (!existingWin) {
        win.style.left = "20%";
        win.style.top = "12%";
        win.style.zIndex = String(++z);
        win.style.pointerEvents = "none";
        win.setAttribute("aria-hidden", "true");
        screen.append(win);
        await zoomFromDock(win, app, "open");
      }
      await win.animate(
        [0, -14, 12, -10, 8, -5, 3, 0].map((x) => ({ transform: `translateX(${x}px) rotate(${x / 8}deg)` })),
        { duration: 420, easing: "ease-in-out" }
      ).finished;
      desk.animate(
        [0, -6, 5, -4, 3, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? 2 : -2}px)` })),
        { duration: 280, easing: "ease-out" }
      );
      await zoomFromDock(win, app, "close");
      win.remove();
      windows.delete(app);
      btn.classList.remove("is-open");
    }

    toast("✕", `Nope. ${left} min left.`, `${NAMES[app]} is blocked during your focus session.`, "nope");
    announce(`${NAMES[app]} blocked. Nope, ${left} minutes left in the session.`);
    const front = [...windows.keys()].at(-1);
    mbApp.textContent = front ? NAMES[front] : "Finder";
    busy.delete(app);
  }

  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-app]")) {
    btn.addEventListener("click", () => {
      const app = btn.dataset.app!;
      const kind = btn.dataset.kind as Kind;
      if (kind === "allowed" || passActive()) {
        openWindow(app);
        announce(`${NAMES[app]} opened.`);
      } else {
        bounce(app);
      }
    });
  }

  function updatePassUi() {
    const left = MAX_PASSES - passesUsed;
    passesLeftEl.textContent = `${left} of ${MAX_PASSES}`;
    needBtn.disabled = left === 0 || passActive();
    needBtn.textContent = left === 0 ? "No passes left this session" : passActive() ? "Pass active…" : "I need something else…";
  }

  function passEnded() {
    toast("🔒", "Pass over", "Back to focus. Distractions are blocked again.", "ok");
    announce("Pass over. Back to focus.");
    for (const app of ["video", "chat", "social"]) {
      const win = windows.get(app);
      if (win) bounce(app, win);
    }
    updatePassUi();
  }

  function openDialog(trigger: HTMLElement) {
    if (passActive() || passesUsed >= MAX_PASSES) return;
    opener = trigger;
    reason.value = "";
    updateReason();
    dialog.showModal();
    reason.focus();
  }

  function updateReason() {
    const n = reason.value.trim().length;
    okBtn.disabled = n < MIN_REASON;
    reasonCount.textContent = n >= MIN_REASON ? "✓ good enough" : `${n} / ${MIN_REASON} characters`;
    reasonCount.classList.toggle("is-ok", n >= MIN_REASON);
  }

  reason.addEventListener("input", updateReason);
  needBtn.addEventListener("click", () => openDialog(needBtn));
  const timerBtn = q("[data-timer-btn]");
  timerBtn.addEventListener("click", () => openDialog(timerBtn));

  form.addEventListener("submit", (e) => {
    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "ok" && reason.value.trim().length < MIN_REASON) {
      e.preventDefault();
    }
  });

  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "ok" && reason.value.trim().length >= MIN_REASON) {
      passesUsed++;
      passEnd = Date.now() + PASS_SECS * 1000;
      wasPass = true;
      tick();
      toast("🎟", "Pass granted: 2 min", "Distractions open normally until it runs out. Be quick!", "ok");
      announce("Pass granted. Distractions are unblocked for 2 minutes.");
    }
    dialog.returnValue = "";
    updatePassUi();
    const target = opener && !(opener as HTMLButtonElement).disabled ? opener : timerBtn;
    target.focus({ preventScroll: true });
  });

  updatePassUi();
}
