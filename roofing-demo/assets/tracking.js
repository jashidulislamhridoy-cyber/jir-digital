/* Tracking: remembers where a visitor came from, asks for cookie consent, then loads GA4 and Meta Pixel
   (only when their IDs are set in assets/config.js) and records phone taps, estimate clicks and leads. */
(function () {
  var C = window.SITE_CONFIG || {};
  var KEY = "cookie_consent";
  var store = {
    get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) {} },
    del: function (s, k) { try { window[s].removeItem(k); } catch (e) {} }
  };

  /* 1. Where did this visitor come from? (first page of the visit only) */
  if (!store.get("sessionStorage", "lead_src")) {
    var q = new URLSearchParams(location.search), ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
    if (ref === location.hostname) ref = "";
    var src = q.get("utm_source") || (q.get("gclid") ? "google-ads" : "") || (q.get("fbclid") ? "facebook" : "") || ref || "direct";
    var medium = q.get("utm_medium") || (q.get("gclid") ? "cpc" : "") || (q.get("fbclid") ? "social" : "") || (ref ? "referral" : "");
    if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(ref) && !q.get("utm_source")) medium = "organic";
    store.set("sessionStorage", "lead_src", JSON.stringify({
      source: src, medium: medium, campaign: q.get("utm_campaign") || "",
      landing: location.pathname.split("/").pop() || "index.html"
    }));
  }

  /* 2. Event helper used across the site */
  var queue = [];
  window.track = function (name, params) {
    params = params || {};
    if (window.gtag) window.gtag("event", name, params); else queue.push([name, params]);
    if (window.fbq) {
      if (name === "generate_lead") window.fbq("track", "Lead", params);
      else if (name === "phone_click") window.fbq("track", "Contact", params);
      else window.fbq("trackCustom", name, params);
    }
    if (C.debug) console.log("[track]", name, params);
  };

  function beacon(type, extra) {
    if (!C.leadWebhookUrl || !navigator.sendBeacon) return;
    var s = {};
    try { s = JSON.parse(store.get("sessionStorage", "lead_src") || "{}"); } catch (e) {}
    var body = Object.assign({ type: type, page: location.pathname.split("/").pop() || "index.html", source: s.source || "direct", submittedAt: new Date().toISOString() }, extra || {});
    navigator.sendBeacon(C.leadWebhookUrl, new Blob([JSON.stringify(body)], { type: "text/plain" }));
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (href.indexOf("tel:") === 0) { window.track("phone_click", { link_text: a.textContent.trim().slice(0, 40) }); beacon("call_click"); }
    else if (/estimate\.html/.test(href)) window.track("estimate_click", { link_text: a.textContent.trim().slice(0, 40) });
  }, true);

  /* 3. Load tags after consent */
  function loadTags() {
    if (C.ga4Id && !window.gtag) {
      var g = document.createElement("script");
      g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.ga4Id);
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", C.ga4Id);
      queue.splice(0).forEach(function (ev) { window.gtag("event", ev[0], ev[1]); });
    }
    if (C.metaPixelId && !window.fbq) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", C.metaPixelId);
      window.fbq("track", "PageView");
    }
  }

  function banner() {
    var d = document.createElement("div");
    d.id = "consent";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-label", "Cookie consent");
    d.className = "fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-xl rounded-2xl bg-charcoal p-5 text-sm text-white/80 shadow-2xl ring-1 ring-white/10 lg:bottom-6";
    d.innerHTML = '<p>We use cookies to understand how visitors use this site and to measure our advertising. See our <a href="privacy-policy.html" class="underline hover:text-accent">Privacy Policy</a>.</p>' +
      '<div class="mt-4 flex gap-3"><button type="button" data-c="yes" class="rounded-xl bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-600">Accept</button>' +
      '<button type="button" data-c="no" class="rounded-xl px-5 py-2.5 font-semibold text-white ring-1 ring-white/25 hover:bg-white/10">Decline</button></div>';
    d.addEventListener("click", function (e) {
      var c = e.target.getAttribute && e.target.getAttribute("data-c");
      if (!c) return;
      store.set("localStorage", KEY, c);
      d.remove();
      if (c === "yes") loadTags();
    });
    document.body.appendChild(d);
  }

  function start() {
    if (!C.ga4Id && !C.metaPixelId) return; // nothing to load, so no banner is needed
    var choice = store.get("localStorage", KEY);
    if (choice === "yes") loadTags(); else if (!choice) banner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  /* 4. Conversion: fires once on the thank-you page after a real submission */
  window.addEventListener("load", function () {
    var t = store.get("sessionStorage", "pending_lead");
    if (t && /thank-you\.html$/.test(location.pathname)) {
      store.del("sessionStorage", "pending_lead");
      window.track("generate_lead", { lead_type: t });
    }
  });
})();
