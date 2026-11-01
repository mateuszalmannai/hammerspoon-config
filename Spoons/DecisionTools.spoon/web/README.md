# Decision tools web app

`tools/`, `scripts/`, `utils/` and `styles/` are copied unchanged from the
Decision-Making Tools Framework (commit 33b594c), a client-side web app. Only
`panel.html` was written for Hammerspoon: it shows the tools in an iframe, adds
the bar to switch between them, and bridges import and export to Lua. A plain
webview can't download files or open file pickers on its own.

To update the tools, copy those four folders over again; the panel needs no
changes unless a tool is added or renamed (see `TOOLS` in `panel.html`).
