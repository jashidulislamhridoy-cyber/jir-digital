/* Quick-message panel behind the floating message button. Submissions go through submitLead() as a "quick-message" lead. */
(function () {
  var C = window.SITE_CONFIG || {};
  var btn = document.querySelector('button[aria-label="Message our team"]');
  if (!btn) return;
  var panel;

  function build() {
    panel = document.createElement("div");
    panel.id = "qm";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Send us a message");
    panel.className = "fixed inset-x-3 bottom-44 z-50 mx-auto max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-line sm:inset-x-auto sm:right-6 lg:bottom-24";
    panel.innerHTML =
      '<div class="flex items-start justify-between gap-4 bg-charcoal p-5 text-white"><div><p class="font-heading text-lg font-bold">Send us a quick message</p>' +
      '<p class="mt-1 text-sm text-white/65">We reply during business hours. Need help now? Call <a class="font-semibold text-accent" href="tel:' + (C.phoneE164 || "") + '">' + (C.phoneDisplay || "") + '</a></p></div>' +
      '<button type="button" id="qmClose" class="grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-white/25 hover:bg-white/10" aria-label="Close">&times;</button></div>' +
      '<form id="qmForm" novalidate class="grid gap-3 p-5">' +
      '<label class="text-sm font-semibold text-charcoal">Name<input name="name" required autocomplete="name" class="mt-1.5 block w-full rounded-xl border border-line px-4 py-3 text-[16px] font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"></label>' +
      '<label class="text-sm font-semibold text-charcoal">Phone<input name="phone" type="tel" required autocomplete="tel" class="mt-1.5 block w-full rounded-xl border border-line px-4 py-3 text-[16px] font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"></label>' +
      '<label class="text-sm font-semibold text-charcoal">Message<textarea name="message" rows="3" required class="mt-1.5 block w-full rounded-xl border border-line px-4 py-3 text-[16px] font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"></textarea></label>' +
      '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true">' +
      '<p id="qmErr" class="hidden text-sm font-medium text-red-600" role="alert"></p>' +
      '<button type="submit" class="btn btn-p !h-12 w-full"><span>Send Message</span></button>' +
      '<p class="text-xs text-slate">By sending, you agree we may contact you about your request.</p></form>' +
      '<div id="qmDone" class="hidden p-6 text-center"><p class="font-heading text-lg font-bold text-charcoal">Thanks — message received!</p>' +
      '<p class="mt-2 text-sm text-slate">We\'ll get back to you shortly.</p>' + (C.formAccessKey || C.leadWebhookUrl ? "" : '<p class="mt-4 flag">Demo mode — nothing was sent</p>') + '</div>';
    document.body.appendChild(panel);
    panel.querySelector("#qmClose").onclick = close;
    var f = panel.querySelector("#qmForm");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = panel.querySelector("#qmErr"), ok = true;
      ["name", "phone", "message"].forEach(function (n) { if (!f.elements[n].value.trim()) ok = false; });
      if (ok && !/\d{3}.*\d{3}.*\d{4}/.test(f.elements.phone.value)) ok = false;
      err.textContent = ok ? "" : "Please add your name, a valid phone number and a short message.";
      err.classList.toggle("hidden", ok);
      if (!ok) return;
      var b = f.querySelector("button[type=submit]");
      b.disabled = true; b.querySelector("span").textContent = "Sending…";
      window.submitLead(f, "quick-message", b, { onDone: function () {
        try { sessionStorage.removeItem("pending_lead"); } catch (x) {}
        if (window.track) window.track("generate_lead", { lead_type: "quick-message" });
        f.classList.add("hidden"); panel.querySelector("#qmDone").classList.remove("hidden");
      } });
    });
  }

  function open() { if (!panel) build(); panel.classList.remove("hidden"); btn.setAttribute("aria-expanded", "true"); var i = panel.querySelector("input"); if (i) i.focus(); }
  function close() { panel.classList.add("hidden"); btn.setAttribute("aria-expanded", "false"); btn.focus(); }
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", function () { panel && !panel.classList.contains("hidden") ? close() : open(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel && !panel.classList.contains("hidden")) close(); });
})();
