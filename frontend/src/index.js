import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// ─── MediaPipe CDN error suppressor (inside webpack bundle) ───────────────────
// CRA's dev overlay hooks into the webpack runtime. Patching window.onerror here
// (inside the bundle) intercepts errors before the overlay renders them.
(function suppressMediaPipeErrors() {
  function isMediaPipeErr(msg, src) {
    var m = String(msg || '');
    var s = String(src || '');
    return (
      s.indexOf('mediapipe') !== -1 ||
      s.indexOf('jsdelivr.net/npm/@mediapipe') !== -1 ||
      m.indexOf('hands_solution_packed_assets') !== -1 ||
      m.indexOf('pose_solution_packed_assets') !== -1 ||
      m.indexOf('@mediapipe') !== -1
    );
  }
  // window.onerror returning true is the canonical way to suppress an error
  var _prev = window.onerror;
  window.onerror = function(msg, src, line, col, err) {
    if (isMediaPipeErr(msg, src)) return true;
    return _prev ? _prev.call(this, msg, src, line, col, err) : false;
  };
  // Belt-and-suspenders: capture-phase addEventListener with stopImmediatePropagation
  window.addEventListener('error', function(e) {
    if (isMediaPipeErr(e.message, e.filename)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
})();
// ─────────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
