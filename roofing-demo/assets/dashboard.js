/* Lead dashboard. Reads leads from the Google Apps Script web app set as leadWebhookUrl in assets/config.js.
   Without it, the dashboard shows clearly labelled sample data so the layout can be demonstrated. */
(function () {
  var C = window.SITE_CONFIG || {};
  var LIVE = !!C.leadWebhookUrl;
  var STATUSES = ["New", "Contacted", "Estimate Sent", "Won", "Lost"];
  var TYPES = { estimate: "Estimate request", contact: "Contact form", "quick-message": "Quick message" };
  var state = { leads: [], events: [], token: "", filter: { status: "", type: "", q: "" } };
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var monthKey = function (d) { d = new Date(d); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  var monthName = function (k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" }); };

  function sample() {
    var names = ["Mark Ellison", "Dana Ruiz", "Priya Shah", "Tom Becker", "Lisa Grant", "Omar Haddad", "Karen Holt", "Jason Lee", "Megan Price", "Victor Soto", "Ann Carter", "Ben Ford", "Rita Moss", "Sam Patel", "Joy Kim", "Leo Grant"];
    var services = ["Roof Replacement", "Roof Repair", "Storm Damage Restoration", "Roof Leak Detection", "Gutter Installation & Repair", "Commercial Roofing"];
    var sources = ["google-ads", "facebook", "google", "direct", "google", "google-ads"];
    var types = ["estimate", "estimate", "contact", "quick-message"];
    var now = new Date(), leads = [], events = [], n = 0;
    var perMonth = [6, 8, 9, 11, 13, 15]; // gentle upward trend, oldest month first
    for (var m = 5; m >= 0; m--) {
      var start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var days = m === 0 ? now.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      var count = m === 0 ? Math.max(2, Math.round(perMonth[5] * days / 30)) : perMonth[5 - m];
      for (var k = 0; k < count; k++, n++) {
        var t = new Date(start.getTime() + ((k + 0.5) / count) * days * 864e5 + (n % 5) * 3600e3);
        if (t > now) t = new Date(now.getTime() - (k + 1) * 3600e3);
        var st = m === 0 && k >= count - 3 ? "New" : ["Contacted", "Estimate Sent", "Won", "Lost", "Won", "Contacted", "Won"][n % 7];
        leads.push({ id: "S" + (100 + n), created: t.toISOString(), type: types[n % 4], status: st, name: names[n % names.length] + " (sample)",
          phone: "(555) 010-" + String(1000 + n * 37).slice(-4), email: "sample" + n + "@example.com", service: services[n % services.length],
          city: ["Anytown", "Sample City A", "Sample City B"][n % 3], zip: "00000", message: "Sample lead for the demo dashboard.",
          source: sources[n % sources.length], campaign: n % 2 ? "spring-roof-promo" : "", page: "estimate.html" });
        for (var c = 0; c < 2; c++) events.push({ created: t.toISOString(), type: "call_click", page: "index.html", source: sources[(n + c) % 6] });
      }
    }
    leads.sort(function (a, b) { return new Date(b.created) - new Date(a.created); });
    return { leads: leads, events: events };
  }

  function api(params) {
    var u = new URL(C.leadWebhookUrl);
    Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); });
    u.searchParams.set("token", state.token);
    return fetch(u.toString()).then(function (r) { return r.json(); });
  }

  function load() {
    if (!LIVE) { var s = sample(); state.leads = s.leads; state.events = s.events; return Promise.resolve(true); }
    return api({ action: "list" }).then(function (j) {
      if (!j.ok) throw new Error(j.error || "error");
      state.leads = j.leads.sort(function (a, b) { return new Date(b.created) - new Date(a.created); });
      state.events = j.events || [];
      return true;
    });
  }

  function kpis() {
    var cur = monthKey(new Date()), prevD = new Date(); prevD.setDate(1); prevD.setMonth(prevD.getMonth() - 1);
    var prev = monthKey(prevD);
    var inM = function (k) { return state.leads.filter(function (l) { return monthKey(l.created) === k; }); };
    var day = new Date().getDate();
    var c = inM(cur), p = inM(prev).filter(function (l) { return new Date(l.created).getDate() <= day; });
    var calls = state.events.filter(function (e) { return monthKey(e.created) === cur; }).length;
    var won = state.leads.filter(function (l) { return l.status === "Won"; }).length;
    var closed = state.leads.filter(function (l) { return l.status === "Won" || l.status === "Lost"; }).length;
    var newCount = state.leads.filter(function (l) { return l.status === "New"; }).length;
    var diff = p.length ? Math.round((c.length - p.length) / p.length * 100) : null;
    var card = function (label, value, sub) {
      return '<div class="card p-5"><p class="text-sm font-medium text-slate">' + label + '</p><p class="mt-2 font-heading text-3xl font-extrabold text-charcoal">' + value + '</p><p class="mt-1 text-xs text-slate">' + sub + '</p></div>';
    };
    $("#kpi").innerHTML =
      card("Leads this month", c.length, diff === null ? "No data for last month" : (diff >= 0 ? "+" : "") + diff + "% vs same point last month") +
      card("Waiting for reply", newCount, "Leads still marked New") +
      card("Call button taps", calls, "This month (taps, not answered calls)") +
      card("Jobs won", won, closed ? Math.round(won / closed * 100) + "% of closed leads" : "No closed leads yet");
  }

  function monthly() {
    var keys = [], d = new Date(); d.setDate(1);
    for (var i = 0; i < 6; i++) { keys.unshift(monthKey(d)); d.setMonth(d.getMonth() - 1); }
    var rows = keys.map(function (k) {
      var L = state.leads.filter(function (l) { return monthKey(l.created) === k; });
      return { k: k, total: L.length,
        est: L.filter(function (l) { return l.type === "estimate"; }).length,
        con: L.filter(function (l) { return l.type === "contact"; }).length,
        qm: L.filter(function (l) { return l.type === "quick-message"; }).length,
        calls: state.events.filter(function (e) { return monthKey(e.created) === k; }).length,
        won: L.filter(function (l) { return l.status === "Won"; }).length };
    });
    var max = Math.max.apply(null, rows.map(function (r) { return r.total; }).concat([1]));
    $("#chart").innerHTML = rows.map(function (r) {
      return '<div class="flex flex-1 flex-col items-center gap-2"><span class="text-xs font-semibold text-charcoal">' + r.total + '</span>' +
        '<div class="flex h-36 w-full items-end justify-center"><div class="w-full max-w-10 rounded-t-lg bg-accent" style="height:' + Math.max(4, r.total / max * 100) + '%"></div></div>' +
        '<span class="text-[11px] text-slate">' + monthName(r.k).split(" ")[0] + '</span></div>';
    }).join("");
    $("#monthly").innerHTML = rows.slice().reverse().map(function (r) {
      return "<tr class=\"border-t border-line\"><td class=\"py-3 pr-4 font-medium text-charcoal\">" + monthName(r.k) + "</td><td class=\"py-3 pr-4\">" + r.est + "</td><td class=\"py-3 pr-4\">" + r.con + "</td><td class=\"py-3 pr-4\">" + r.qm + "</td><td class=\"py-3 pr-4\">" + r.calls + "</td><td class=\"py-3 pr-4 font-semibold text-charcoal\">" + r.won + "</td></tr>";
    }).join("");
  }

  function sources() {
    var counts = {};
    state.leads.forEach(function (l) { var s = l.source || "direct"; counts[s] = (counts[s] || 0) + 1; });
    var total = state.leads.length || 1;
    var label = { "google-ads": "Google Ads", facebook: "Facebook / Instagram", google: "Google search", direct: "Direct / unknown" };
    $("#sources").innerHTML = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (s) {
      var pct = Math.round(counts[s] / total * 100);
      return '<li><div class="flex justify-between text-sm"><span class="font-medium text-charcoal">' + esc(label[s] || s) + '</span><span class="text-slate">' + counts[s] + " · " + pct + '%</span></div>' +
        '<div class="mt-1.5 h-2 rounded-full bg-offwhite"><div class="h-2 rounded-full bg-navy" style="width:' + pct + '%"></div></div></li>';
    }).join("");
  }

  var badge = { New: "bg-accent-50 text-accent-600", Contacted: "bg-blue-50 text-blue-700", "Estimate Sent": "bg-amber-50 text-amber-700", Won: "bg-green-50 text-green-700", Lost: "bg-slate/10 text-slate" };

  function table() {
    var f = state.filter, q = f.q.toLowerCase();
    var list = state.leads.filter(function (l) {
      return (!f.status || l.status === f.status) && (!f.type || l.type === f.type) &&
        (!q || [l.name, l.phone, l.email, l.service, l.city].join(" ").toLowerCase().indexOf(q) >= 0);
    });
    $("#count").textContent = list.length + " lead" + (list.length === 1 ? "" : "s");
    $("#rows").innerHTML = list.length ? list.map(function (l) {
      var opts = STATUSES.map(function (s) { return "<option" + (s === l.status ? " selected" : "") + ">" + s + "</option>"; }).join("");
      return '<tr class="border-t border-line align-top">' +
        '<td class="py-4 pr-4 whitespace-nowrap text-slate">' + new Date(l.created).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + '</td>' +
        '<td class="py-4 pr-4"><button type="button" data-open="' + esc(l.id) + '" class="text-left font-semibold text-charcoal hover:text-accent">' + esc(l.name || "—") + '</button><span class="block text-xs text-slate">' + esc(TYPES[l.type] || l.type) + '</span></td>' +
        '<td class="py-4 pr-4 whitespace-nowrap"><a class="font-medium text-charcoal hover:text-accent" href="tel:' + esc(String(l.phone).replace(/[^\d+]/g, "")) + '">' + esc(l.phone) + '</a></td>' +
        '<td class="py-4 pr-4">' + esc(l.service || "—") + '</td>' +
        '<td class="py-4 pr-4 text-slate">' + esc(l.source || "direct") + '</td>' +
        '<td class="py-4"><select data-id="' + esc(l.id) + '" aria-label="Status" class="rounded-lg border-0 px-2.5 py-1.5 text-xs font-semibold ' + (badge[l.status] || "") + '">' + opts + '</select></td></tr>';
    }).join("") : '<tr><td colspan="6" class="py-10 text-center text-slate">No leads match these filters.</td></tr>';
  }

  function detail(id) {
    var l = state.leads.find(function (x) { return x.id === id; });
    if (!l) return;
    var extra = {};
    try { extra = typeof l.details === "string" ? JSON.parse(l.details || "{}") : (l.details || {}); } catch (e) {}
    var row = function (k, v) { return v ? '<div class="border-t border-line py-3"><dt class="text-xs font-semibold uppercase tracking-wider text-slate">' + esc(k) + '</dt><dd class="mt-1 text-charcoal">' + esc(v) + "</dd></div>" : ""; };
    $("#drawerBody").innerHTML = '<p class="text-sm text-slate">' + esc(TYPES[l.type] || l.type) + " · " + new Date(l.created).toLocaleString("en-US") + '</p><h2 class="mt-1 text-2xl font-extrabold">' + esc(l.name) + '</h2>' +
      '<div class="mt-5 flex gap-3"><a class="btn btn-p !h-11 !px-5" href="tel:' + esc(String(l.phone).replace(/[^\d+]/g, "")) + '">Call</a>' + (l.email ? '<a class="btn btn-s !h-11" href="mailto:' + esc(l.email) + '">Email</a>' : "") + '</div><dl class="mt-6">' +
      row("Phone", l.phone) + row("Email", l.email) + row("Service", l.service) + row("Location", [l.city, l.zip].filter(Boolean).join(" ")) + row("Message", l.message) +
      row("Came from", [l.source, l.medium, l.campaign].filter(Boolean).join(" / ")) + row("Page", l.page) +
      Object.keys(extra).map(function (k) { return row(k, extra[k]); }).join("") + "</dl>";
    $("#drawer").classList.remove("hidden");
  }

  function setStatus(id, status, el) {
    var l = state.leads.find(function (x) { return x.id === id; });
    var before = l.status;
    l.status = status;
    el.className = el.className.replace(/bg-\S+ text-\S+$/, "") + (badge[status] || "");
    render();
    if (!LIVE) return;
    api({ action: "update", id: id, status: status }).then(function (j) { if (!j.ok) throw 0; })
      .catch(function () { l.status = before; render(); alert("Could not save the change. Please try again."); });
  }

  function csv() {
    var cols = ["created", "type", "status", "name", "phone", "email", "service", "city", "zip", "message", "source", "campaign"];
    var out = [cols.join(",")].concat(state.leads.map(function (l) {
      return cols.map(function (c) { return '"' + String(l[c] == null ? "" : l[c]).replace(/"/g, '""') + '"'; }).join(",");
    })).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" }));
    a.download = "leads-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
  }

  function render() { kpis(); monthly(); sources(); table(); }

  function showApp() {
    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#mode").textContent = LIVE ? "Live data" : "Sample data — connect the lead system to see real leads";
    $("#mode").className = LIVE ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700" : "flag";
    render();
  }

  function login(pass) {
    state.token = pass;
    var err = $("#loginErr");
    err.classList.add("hidden");
    return load().then(function () {
      try { sessionStorage.setItem("dash_token", pass); } catch (e) {}
      showApp();
    }).catch(function () {
      try { sessionStorage.removeItem("dash_token"); } catch (e) {}
      err.textContent = "Wrong password, or the lead system could not be reached.";
      err.classList.remove("hidden");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!LIVE) $("#loginHint").textContent = "Demo mode: any password works and the data shown is sample data.";
    $("#loginForm").addEventListener("submit", function (e) { e.preventDefault(); login($("#pass").value); });
    var saved = null;
    try { saved = sessionStorage.getItem("dash_token"); } catch (e) {}
    if (saved) login(saved);
    ["status", "type"].forEach(function (k) { $("#f-" + k).addEventListener("change", function (e) { state.filter[k] = e.target.value; table(); }); });
    $("#f-q").addEventListener("input", function (e) { state.filter.q = e.target.value; table(); });
    $("#rows").addEventListener("change", function (e) { if (e.target.dataset.id) setStatus(e.target.dataset.id, e.target.value, e.target); });
    $("#rows").addEventListener("click", function (e) { var b = e.target.closest("[data-open]"); if (b) detail(b.dataset.open); });
    $("#drawerClose").addEventListener("click", function () { $("#drawer").classList.add("hidden"); });
    $("#drawer").addEventListener("click", function (e) { if (e.target.id === "drawer") $("#drawer").classList.add("hidden"); });
    $("#export").addEventListener("click", csv);
    $("#refresh").addEventListener("click", function () { load().then(render).catch(function () { alert("Could not refresh."); }); });
    $("#logout").addEventListener("click", function () { try { sessionStorage.removeItem("dash_token"); } catch (e) {} location.reload(); });
  });
})();
