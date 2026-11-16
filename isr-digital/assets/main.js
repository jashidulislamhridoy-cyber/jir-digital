/* ISR Digital Marketing Services — shared site script */

/* ===== Configuration (fill in later) ===== */
const FORM_ENDPOINT = "";   // e.g. Formspree / Web3Forms / CRM webhook URL
const GA4_ID = "";          // e.g. "G-XXXXXXXXXX"
const META_PIXEL_ID = "";   // e.g. "123456789012345"
const CONSENT_KEY = "isr_consent";

/* ===== Mobile menu ===== */
(function () {
  const btn = document.getElementById("menuBtn");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }));
})();

/* ===== Reveal on scroll ===== */
(function () {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  items.forEach(el => io.observe(el));
})();

/* ===== Footer year ===== */
document.querySelectorAll("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });

/* ===== Consent + analytics ===== */
function storageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function storageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function loadAnalytics() {
  if (GA4_ID && !window.__ga) {
    window.__ga = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }
  if (META_PIXEL_ID && !window.__px) {
    window.__px = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  }
}

function track(name, params) {
  if (storageGet(CONSENT_KEY) !== "accepted") return;
  if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  const map = { form_submit: "Lead", estimate_click: "Lead", phone_click: "Contact", whatsapp_click: "Contact" };
  if (typeof window.fbq === "function" && map[name]) window.fbq("track", map[name], params || {});
}

(function () {
  const bar = document.getElementById("consent");
  const saved = storageGet(CONSENT_KEY);
  if (saved === "accepted") loadAnalytics();
  if (!bar) return;
  if (!saved) bar.classList.add("show");
  const accept = document.getElementById("consentAccept");
  const decline = document.getElementById("consentDecline");
  if (accept) accept.addEventListener("click", () => { storageSet(CONSENT_KEY, "accepted"); bar.classList.remove("show"); loadAnalytics(); });
  if (decline) decline.addEventListener("click", () => { storageSet(CONSENT_KEY, "declined"); bar.classList.remove("show"); });
})();

/* Click tracking */
document.addEventListener("click", e => {
  if (e.target.closest(".js-estimate")) track("estimate_click");
  if (e.target.closest('a[href^="tel:"]')) track("phone_click");
  if (e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]')) track("whatsapp_click");
});

/* ===== UTM capture (kept for the session) ===== */
(function () {
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const params = new URLSearchParams(location.search);
  keys.forEach(k => {
    const v = params.get(k);
    if (v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
    const input = document.querySelector('input[name="' + k + '"]');
    if (input) { let stored = null; try { stored = sessionStorage.getItem(k); } catch (e) {} input.value = v || stored || ""; }
  });
})();

/* ===== Platform tabs with screenshot slots (used on Home + Work) ===== */
document.querySelectorAll("[data-tabgroup]").forEach(function (group) {
  const holder = document.getElementById(group.dataset.target);
  const count = parseInt(group.dataset.count, 10) || 10;
  const tabs = group.querySelectorAll(".tab[data-platform]");
  if (!holder || !tabs.length) return;
  function render(platform) {
    holder.innerHTML = "";
    const items = (window.ISR_PORTFOLIO && window.ISR_PORTFOLIO[platform]) || [];
    items.slice(0, count).forEach(function (it) {
      const d = document.createElement("div");
      d.className = "slot";
      d.style.padding = "0";
      d.style.overflow = "hidden";
      const img = document.createElement("img");
      img.src = it.image; img.alt = it.title || platform; img.loading = "lazy";
      img.style.cssText = "width:100%;height:auto;display:block";
      const cap = document.createElement("div");
      cap.style.cssText = "padding:12px 14px";
      const t = document.createElement("b"); t.textContent = it.title || ""; t.style.display = "block";
      const meta = document.createElement("span"); meta.textContent = [it.client, it.metric].filter(Boolean).join(" · ");
      cap.appendChild(t); cap.appendChild(meta);
      d.appendChild(img); d.appendChild(cap);
      holder.appendChild(d);
    });
    for (let i = 1; i <= (items.length ? 0 : count); i++) {
      const d = document.createElement("div");
      d.className = "slot";
      d.innerHTML = "<b>" + String(i).padStart(2, "0") + "</b>" + platform + " screenshot<br><span>[Client to provide]</span>";
      holder.appendChild(d);
    }
    tabs.forEach(t => {
      const on = t.dataset.platform === platform;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
  }
  tabs.forEach(t => t.addEventListener("click", () => render(t.dataset.platform)));
  render(tabs[0].dataset.platform);
});

/* ===== Contact form ===== */
(function () {
  const form = document.getElementById("contactForm");
  if (!form) return;
  const msg = document.getElementById("formMsg");
  function show(type, text) {
    msg.className = "form-msg show " + type;
    msg.textContent = text;
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!FORM_ENDPOINT) {
      show("warn", "Preview mode: the form is not connected yet. Once the form endpoint is set, messages will be delivered.");
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const res = await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Request failed");
      show("ok", "Thank you! Your message has been sent. We'll be in touch soon.");
      track("form_submit");
      form.reset();
    } catch (err) {
      show("warn", "Something went wrong. Please try again in a moment.");
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });
})();

/* ===== 3D portrait tilt ===== */
(function () {
  const wrap = document.querySelector(".portrait3d");
  const card = wrap && wrap.querySelector(".p-card");
  if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  wrap.addEventListener("pointermove", e => {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty("--ry", (x * 22).toFixed(2) + "deg");
    card.style.setProperty("--rx", (-y * 22).toFixed(2) + "deg");
  });
  wrap.addEventListener("pointerleave", () => {
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--rx", "0deg");
  });
})();
