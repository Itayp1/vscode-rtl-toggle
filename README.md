# RTL Toggle for VS Code (Copilot Chat)

Switch the text direction of the GitHub Copilot Chat window (messages **and** the input box) between **RTL**, **LTR** and **AUTO** from three buttons in the status bar — **no window reload** when you switch.

- **RTL** – everything right-to-left.
- **LTR** – default VS Code behavior.
- **AUTO** – a paragraph/input containing any Hebrew letter is RTL, otherwise LTR. Code blocks stay LTR.

## Install

Download `rtl-toggle-*.vsix` from [Releases](../../releases) and run:

```bash
code --install-extension rtl-toggle-0.2.2.vsix
```

Reload VS Code once. On first start the extension patches VS Code (see below); a one-time reload activates it.

## How it works (read this)

VS Code extensions cannot style the chat UI. So this extension:

1. Appends a small script to VS Code's own `workbench.desktop.main.js` (a backup is kept as `*.rtlbak`).
2. Runs a tiny WebSocket server bound to `127.0.0.1:37645` (loopback only) that pushes the selected mode to that script, so switching needs no reload.

Consequences:

- VS Code will show an **"installation appears corrupt"** notice. It is expected; dismiss it.
- **Every VS Code update removes the patch.** Run `RTL Toggle: Install into VS Code (one-time)` from the Command Palette again.
- To remove: run `RTL Toggle: Uninstall from VS Code`, then reload.
- If VS Code is installed system-wide, the file may need admin rights to write.
- The `rtlToggle.port` setting changes the port (re-run Install afterwards).

## Known limitations

- The chat input is a Monaco editor, which doesn't fully support RTL: the caret may lag by a character when mixing Latin letters into Hebrew text, and jumps once when the first Hebrew letter flips AUTO to RTL.
- Selectors target current Copilot Chat class names (`.interactive-*`, `.chat-widget`) and may need updating in future VS Code versions.
- Tested only on VS Code 1.146 on Windows.

## License

MIT
