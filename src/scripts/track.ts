type Goat = { count: (o: { path: string; title?: string; event: boolean }) => void };
type Plausible = (event: string) => void;

export function track(event: string) {
  const w = window as Window & { goatcounter?: Goat; plausible?: Plausible };
  try {
    if (w.goatcounter?.count) w.goatcounter.count({ path: event, title: event, event: true });
    else if (typeof w.plausible === "function") w.plausible(event);
  } catch {
  }
}
