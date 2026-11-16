const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

const MODES = ["rtl", "ltr", "auto"];
const BEGIN = "/* RTL-TOGGLE-BEGIN */", END = "/* RTL-TOGGLE-END */";
const strip = (s) => s.replace(new RegExp(`\n?${BEGIN.replace(/[*/]/g, "\$&")}[\s\S]*?${END.replace(/[*/]/g, "\$&")}`, "g"), "");
const mainJs = () => path.join(vscode.env.appRoot, "out", "vs", "workbench", "workbench.desktop.main.js");

// Minimal server->client-only WebSocket (text frames, payload < 126 bytes).
function startServer(port, getMode, onSet) {
  const clients = new Set();
  const frame = (s) => Buffer.concat([Buffer.from([0x81, Buffer.byteLength(s)]), Buffer.from(s)]);
  let owner = false;
  // A second window can't bind the port; it asks the owning window to broadcast instead.
  const server = http.createServer((req, res) => { const m = (req.url || "").slice(1); if (MODES.includes(m)) onSet(m); res.end(); });
  server.on("upgrade", (req, sock) => {
    const accept = crypto.createHash("sha1")
      .update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    clients.add(sock);
    sock.write(frame(getMode()));
    sock.on("close", () => clients.delete(sock));
    sock.on("error", () => clients.delete(sock));
    sock.on("data", () => {}); // client frames ignored
  });
  server.on("error", () => {});
  server.on("listening", () => (owner = true));
  server.listen(port, "127.0.0.1");
  return { broadcast: (m) => owner ? clients.forEach((c) => c.write(frame(m))) : http.get({ host: "127.0.0.1", port, path: "/" + m }).on("error", () => {}).end(), close: () => { clients.forEach((c) => c.destroy()); server.close(); } };
}

function activate(ctx) {
  let mode = ctx.globalState.get("mode", "ltr");
  const port = vscode.workspace.getConfiguration("rtlToggle").get("port");
  const srv = startServer(port, () => mode, (m) => { mode = m; render(); srv.broadcast(m); });

  const bars = MODES.map((m, i) => {
    const b = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1003 - i);
    b.command = { command: "rtlToggle.set", title: m, arguments: [m] };
    b.tooltip = "Chat text direction: " + m.toUpperCase();
    return b;
  });
  const render = () => bars.forEach((b, i) => { b.text = (MODES[i] === mode ? "$(circle-filled) " : "$(circle-outline) ") + MODES[i].toUpperCase(); b.show(); });
  const setMode = (m) => { mode = m; ctx.globalState.update("mode", m); srv.broadcast(m); render(); };
  render();

  const install = async () => {
    try {
      const f = mainJs();
      const bak = f + ".rtlbak";
      if (!fs.existsSync(bak)) fs.copyFileSync(f, bak);
      const code = fs.readFileSync(path.join(__dirname, "inject.js"), "utf8").replace("__PORT__", port);
      fs.writeFileSync(f, strip(fs.readFileSync(f, "utf8")) + "\n" + code);
      const r = await vscode.window.showInformationMessage(
        "RTL Toggle installed. Reload once to activate (a 'corrupt installation' notice is expected; dismiss it).", "Reload");
      if (r) vscode.commands.executeCommand("workbench.action.reloadWindow");
    } catch (e) { vscode.window.showErrorMessage("RTL Toggle install failed: " + e.message); }
  };
  const uninstall = () => {
    try {
      const f = mainJs();
      fs.writeFileSync(f, strip(fs.readFileSync(f, "utf8")));
      vscode.window.showInformationMessage("RTL Toggle removed. Reload VS Code.");
    } catch (e) { vscode.window.showErrorMessage("RTL Toggle uninstall failed: " + e.message); }
  };

  ctx.subscriptions.push(
    ...bars, { dispose: srv.close },
    vscode.commands.registerCommand("rtlToggle.set", (m) => setMode(m)),
    vscode.commands.registerCommand("rtlToggle.pick", async () => {
      const m = await vscode.window.showQuickPick(MODES.map((x) => x.toUpperCase()), { placeHolder: "Current: " + mode.toUpperCase() });
      if (m) setMode(m.toLowerCase());
    }),
    vscode.commands.registerCommand("rtlToggle.install", install),
    vscode.commands.registerCommand("rtlToggle.uninstall", uninstall)
  );

  // First run: patch automatically if not yet patched.
  try { if (!fs.readFileSync(mainJs(), "utf8").includes(BEGIN)) install(); } catch {}
}

module.exports = { activate };
