export const site = {
  name: "FocusLock",
  tagline: "Focus mode built for developers.",
  description:
    "A macOS menu bar app for focus sessions. Switch freely between your editor, docs and PDF. Get blocked from everything else.",

  version: "0.1.0",
  requirements: { macos: "14", chip: "Apple Silicon" },

  author: "Satvik",
  license: "FSL-1.1-MIT",

  links: {
    download: "/download/FocusLock.dmg",
    installScript: "/download/install.sh",
    source: "https://github.com/SATVIKsynopsis/focuslock",
    releases: "TODO_RELEASES_URL",
    licenseText: "https://github.com/SATVIKsynopsis/focuslock/blob/main/LICENSE.md",
  },

  analytics: {
    provider: "goatcounter" as "none" | "goatcounter" | "plausible",
    id: "focuslock",
  },

  url: "https://focuslock-web-five.vercel.app",
} as const;

export const isPlaceholder = (value: string | undefined): boolean =>
  !value || value.startsWith("TODO");
