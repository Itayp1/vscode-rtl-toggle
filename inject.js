/* RTL-TOGGLE-BEGIN */
(() => {
  const PORT = "__PORT__", KEY = "rtlToggle.mode";
  const SEL = ":is(.interactive-item-container,.chat-widget) :is(p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,.value)";
  const st = document.createElement("style");
  const LINES = ".interactive-input-part .view-lines";
  st.textContent =
    `html[data-rtl-mode="rtl"] :is(${SEL}, ${LINES}, ${LINES} .view-line){direction:rtl!important;text-align:right!important}` +
    `html[data-rtl-mode="auto"] ${LINES}[dir=rtl] .view-line{direction:rtl!important;text-align:right!important}`;
  document.head.appendChild(st);
  // AUTO: any Hebrew letter in a block => RTL, otherwise LTR. The editor's stable .view-lines
  // container is flagged (not the re-rendered lines), so typing does not flicker.
  const HEB = /[֐-׿]/;
  let raf;
  const apply = () => {
    const auto = document.documentElement.dataset.rtlMode === "auto";
    document.querySelectorAll(SEL + ", .interactive-input-part .view-lines").forEach((el) => {
      const want = auto ? (HEB.test(el.textContent) ? "rtl" : "ltr") : null;
      if (want ? el.dir !== want : el.hasAttribute("dir")) want ? (el.dir = want) : el.removeAttribute("dir");
    });
  };
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true });
  const set = (m) => { document.documentElement.dataset.rtlMode = m; try { localStorage.setItem(KEY, m); } catch {} later(); };
  set(localStorage.getItem(KEY) || "ltr");
  const connect = () => {
    const ws = new WebSocket("ws://127.0.0.1:" + PORT);
    ws.onmessage = (e) => set(e.data);
    ws.onclose = () => setTimeout(connect, 2000);
  };
  connect();
})();
/* RTL-TOGGLE-END */
