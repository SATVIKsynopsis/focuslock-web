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
    source: "TODO_SOURCE_URL",
    releases: "TODO_RELEASES_URL",
    licenseText: "https://fsl.software/",
  },

  analytics: {
    provider: "none" as "none" | "goatcounter" | "plausible",
    id: "TODO_ANALYTICS_ID",
  },

  url: "TODO_SITE_URL",
} as const;

export const isPlaceholder = (value: string | undefined): boolean =>
  !value || value.startsWith("TODO");
