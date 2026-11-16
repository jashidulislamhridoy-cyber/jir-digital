/* Lead capture: sends form submissions to email (Web3Forms) and/or the lead dashboard (Google Apps Script).
   Settings live in assets/config.js. With neither set, the site runs in demo mode and nothing is sent. */
(function () {
  var C = window.SITE_CONFIG || {};

  function source() {
    try { return JSON.parse(sessionStorage.getItem("lead_src") || "{}"); } catch (e) { return {}; }
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (k === "botcheck" || k === "website_url") return;
      var key = k.replace(/^[ec]-/, "");
      data[key] = data[key] ? data[key] + ", " + v : String(v);
    });
    if (data.msg && !data.message) { data.message = data.msg; delete data.msg; }
    if (data.notes && !data.message) { data.message = data.notes; delete data.notes; }
    if (data.serviceType && !data.service) { data.service = data.serviceType; delete data.serviceType; }
    return data;
  }

  function isBot(form) {
    var a = form.querySelector('[name="botcheck"]'), b = form.querySelector('[name="website_url"]');
    return (a && a.checked) || (b && b.value);
  }

  function post(url, body, opts) {
    return fetch(url, Object.assign({ method: "POST", body: JSON.stringify(body) }, opts || {}));
  }

  window.submitLead = function (form, type, button, options) {
    options = options || {};
    var label = button && button.querySelector("span");
    var original = label ? label.textContent : "";
    var done = function () {
      try { sessionStorage.setItem("pending_lead", type); } catch (e) {}
      if (options.onDone) return options.onDone();
      location.href = "thank-you.html?type=" + encodeURIComponent(type) + (demo ? "&demo=1" : "");
    };
    var fail = function () {
      if (button) button.disabled = false;
      if (label) label.textContent = original || "Try again";
      var box = form.querySelector(".lead-error");
      if (!box) {
        box = document.createElement("p");
        box.className = "lead-error mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700";
        box.setAttribute("role", "alert");
        form.appendChild(box);
      }
      box.textContent = "Sorry, your request could not be sent. Please call us at " + (C.phoneDisplay || "our office") + ".";
    };

    if (isBot(form)) return done();

    var src = source();
    var lead = Object.assign({ type: type }, collect(form), {
      page: location.pathname.split("/").pop() || "index.html",
      source: src.source || "direct",
      medium: src.medium || "",
      campaign: src.campaign || "",
      landing: src.landing || "",
      submittedAt: new Date().toISOString()
    });

    var demo = !C.formAccessKey && !C.leadWebhookUrl;
    if (demo) return setTimeout(done, 600);

    var jobs = [];
    if (C.leadWebhookUrl) {
      // Apps Script does not send CORS headers on POST, so the reply is opaque; a network error still rejects.
      jobs.push(post(C.leadWebhookUrl, lead, { mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" } }).then(function () { return true; }));
    }
    if (C.formAccessKey) {
      var mail = Object.assign({
        access_key: C.formAccessKey,
        subject: "New " + type.replace(/-/g, " ") + " from your website" + (lead.name ? " — " + lead.name : ""),
        from_name: (C.businessName || "Website") + " website"
      }, lead);
      jobs.push(post("https://api.web3forms.com/submit", mail, { headers: { "Content-Type": "application/json", Accept: "application/json" } })
        .then(function (r) { return r.json(); }).then(function (j) { return !!j.success; }));
    }
    Promise.allSettled(jobs).then(function (res) {
      var ok = res.some(function (r) { return r.status === "fulfilled" && r.value; });
      ok ? done() : fail();
    });
  };
})();
