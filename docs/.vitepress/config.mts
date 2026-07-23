import { defineConfig } from "vitepress";

// Ziro Designer documentation site.
// Docs live as plain Markdown next to this config; the nav/sidebar below
// maps them into sections. Add a page → drop a .md file in and link it here.
export default defineConfig({
  title: "Ziro Designer",
  description:
    "Documentation for Ziro Designer — the browser-native, open-source electronics design suite from ZiroEDA.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Design Notes", link: "/design/collaboration" },
      {
        text: "App",
        link: "https://github.com/ZiroEDA/ziro-designer",
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
          ],
        },
      ],
      "/design/": [
        {
          text: "Design Notes",
          items: [
            { text: "Real-time Collaboration", link: "/design/collaboration" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/ZiroEDA/ziro-designer" },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the GPL-3.0-or-later License.",
      copyright: "Ziro Designer — ZiroEDA",
    },
  },
});
