const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const paras = t => String(t ?? "").split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("");
const faNum = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);

const S = { cases: [], count: 3, c: null, players: [], seen: 0, stage: 0, timer: null };
const MIN = 3, MAX = 12;
const screens = [...document.querySelectorAll(".screen")];
const go = id => { screens.forEach(s => s.hidden = s.id !== id); scrollTo(0, 0); };
document.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) go(b.dataset.go); });

/* ---------- موسیقی ---------- */
const bgm = $("#bgm"), mBtn = $("#musicBtn");
let musicOn = true, started = false;
document.addEventListener("pointerdown", () => {
  if (started) return; started = true;
  if (musicOn) bgm.play().catch(() => {});
}, { once: true });
mBtn.onclick = e => {
  e.stopPropagation(); started = true; musicOn = !musicOn;
  musicOn ? bgm.play().catch(() => {}) : bgm.pause();
  mBtn.textContent = musicOn ? "🔊" : "🔇";
};

/* ---------- آموزش مرحله‌ای ---------- */
const STEPS = [
  ["ورود به بازی", "در صفحه اصلی روی «ورود به بازی» بزنید."],
  ["تعداد نفرات", "بگویید چند نفر هستید. بازی فقط پرونده‌هایی را باز می‌کند که برای همین تعداد ساخته شده‌اند."],
  ["انتخاب پرونده", "یکی از پرونده‌ها را انتخاب کنید. پرونده‌های «در حال توسعه» هنوز آماده نیستند."],
  ["نوشتن نام‌ها", "اسم همه را وارد کنید. نقش‌ها خودکار و تصادفی پخش می‌شوند."],
  ["دیدن نقش مخفی", "هر نفر روی کارت اسم خودش بزند و نقشش را بخواند. بعد پنجره را ببندد و گوشی را به نفر بعد بدهد. دیگران نباید نگاه کنند. قاضی فقط کلمه «قاضی» را می‌بیند."],
  ["دادرسی", "پرونده با صدای بلند خوانده می‌شود. اول شاکی و بعد متهم صحبت می‌کند. بعد همه آزادانه گفتگو می‌کنند و قاضی سؤال می‌پرسد."],
  ["رأی و نتیجه", "قاضی در گوشی رأی می‌دهد و بازی نشان می‌دهد چه کسی برنده شد."]
];
let step = 0;
function drawStep() {
  $("#stepBox").innerHTML = `<h3>مرحله ${faNum(step + 1)}: ${esc(STEPS[step][0])}</h3><p>${esc(STEPS[step][1])}</p>`;
  $("#stepDots").innerHTML = STEPS.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("");
  $("#stepPrev").disabled = step === 0;
  $("#stepNext").textContent = step === STEPS.length - 1 ? "تمام" : "بعدی";
}
$("#stepPrev").onclick = () => { step = Math.max(0, step - 1); drawStep(); };
$("#stepNext").onclick = () => { if (step === STEPS.length - 1) { step = 0; drawStep(); go("home"); } else { step++; drawStep(); } };
document.querySelector('[data-go="how"]').addEventListener("click", () => { step = 0; drawStep(); });

/* ---------- بارگذاری پرونده‌ها ---------- */
fetch("cases.json").then(r => r.json()).then(d => S.cases = d.cases || []).catch(() => $("#loadErr").hidden = false);
const need = c => 1 + c.plaintiffRoles.length + c.defendantRoles.length;

/* ---------- تعداد نفرات ---------- */
const drawCount = () => $("#countVal").textContent = faNum(S.count);
$("#minus").onclick = () => { S.count = Math.max(MIN, S.count - 1); drawCount(); };
$("#plus").onclick = () => { S.count = Math.min(MAX, S.count + 1); drawCount(); };
drawCount();

$("#toCases").onclick = () => {
  const list = $("#caseList"); list.innerHTML = "";
  let ok = 0;
  S.cases.forEach(c => {
    const b = document.createElement("button"); b.className = "case";
    if (c.status !== "ready") {
      b.classList.add("off"); b.innerHTML = `<b>${esc(c.title)}</b><small>در حال توسعه</small>`;
      b.onclick = () => alert("این پرونده در حال توسعه است.");
    } else if (need(c) !== S.count) {
      b.classList.add("off"); b.innerHTML = `<b>${esc(c.title)}</b><small>${esc(c.summary)}</small><small>این پرونده ${faNum(need(c))} نفر می‌خواهد</small>`;
      b.onclick = () => alert(`این پرونده ${faNum(need(c))} نفر می‌خواهد، ولی شما ${faNum(S.count)} نفر هستید.`);
    } else {
      ok++; b.innerHTML = `<b>${esc(c.title)}</b><small>${esc(c.summary)}</small><small>${faNum(need(c))} نفر</small>`;
      b.onclick = () => { S.c = c; buildNames(); go("names"); };
    }
    list.appendChild(b);
  });
  $("#casesNote").textContent = ok ? "" : `برای ${faNum(S.count)} نفر هنوز پرونده‌ای آماده نیست. تعداد را تغییر دهید.`;
  go("cases");
};

/* ---------- نام‌ها و نقش‌ها ---------- */
function buildNames() {
  $("#namesForm").innerHTML = Array.from({ length: S.count }, (_, i) =>
    `<label for="n${i}">بازیکن ${faNum(i + 1)}</label><input id="n${i}" maxlength="20">`).join("");
  $("#namesErr").hidden = true;
}
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

$("#assign").onclick = () => {
  const names = [...document.querySelectorAll("#namesForm input")].map(i => i.value.trim());
  const err = $("#namesErr");
  if (names.some(n => !n)) { err.textContent = "نام همه بازیکنان را بنویسید."; err.hidden = false; return; }
  if (new Set(names).size !== names.length) { err.textContent = "نام‌ها باید با هم فرق داشته باشند."; err.hidden = false; return; }
  const c = S.c;
  const roles = [
    { side: "judge", title: "قاضی" },
    ...c.plaintiffRoles.map(r => ({ ...r, side: "plaintiff" })),
    ...c.defendantRoles.map(r => ({ ...r, side: "defendant" }))
  ];
  const order = shuffle(names);
  S.players = order.map((name, i) => ({ name, role: roles[i], seen: false }));
  S.seen = 0;
  drawCards(); go("deal");
};

function drawCards() {
  const g = $("#cardGrid"); g.innerHTML = "";
  shuffle(S.players).forEach(p => {
    const b = document.createElement("button"); b.className = "card" + (p.seen ? " seen" : "");
    b.textContent = p.name; b.disabled = p.seen;
    b.onclick = () => openRole(p, b);
    g.appendChild(b);
  });
  $("#seenCount").textContent = `${faNum(S.seen)} از ${faNum(S.players.length)} نفر نقش خود را دیده‌اند`;
  $("#toHearing").disabled = S.seen < S.players.length;
}

let current = null;
function openRole(p) {
  current = p; const r = p.role;
  let html;
  if (r.side === "judge") html = `<div class="big">قاضی</div>`;
  else {
    const def = `assets/avatars/${r.side}.png`;
    html = `<img class="av" src="${esc(r.avatar || def)}" alt="" onerror="this.outerHTML='<div class=&quot;emoji&quot;>${r.side === "plaintiff" ? "🙋" : "🧑‍⚖️"}</div>'">
      <h2>${esc(r.title)}</h2>${r.name ? `<p class="nm">${esc(r.name)}</p>` : ""}${paras(r.secret)}`;
  }
  $("#modalBody").innerHTML = html; $("#modalBody").scrollTop = 0;
  $("#modal").hidden = false; $("#modalClose").focus();
}
$("#modalClose").onclick = () => {
  $("#modal").hidden = true; $("#modalBody").innerHTML = "";
  if (current && !current.seen) { current.seen = true; S.seen++; }
  current = null; drawCards();
  if (S.seen < S.players.length) alert("گوشی را به نفر بعد بدهید.");
};

/* ---------- دادرسی ---------- */
const STAGES = [
  ["خواندن پرونده", "یک نفر پرونده را با صدای بلند برای قاضی بخواند."],
  ["سخنان شاکی", "شاکی (و تیمش) ماجرا را از دید خودشان تعریف می‌کنند."],
  ["دفاعیات متهم", "متهم (و تیمش) از خودشان دفاع می‌کنند."],
  ["گفتگوی آزاد", "هر دو طرف جواب می‌دهند و قاضی سؤال می‌پرسد. قاضی هر وقت به نتیجه رسید می‌تواند رأی بدهد."]
];
$("#toHearing").onclick = () => {
  S.stage = 0;
  const f = S.c.publicFile || {};
  $("#publicFile").innerHTML = `<h3>${esc(S.c.title)}</h3>${paras(Array.isArray(f.paragraphs) ? f.paragraphs.join("\n") : f.paragraphs)}`;
  drawStage(); go("hearing");
};
function drawStage() {
  const [t, d] = STAGES[S.stage];
  $("#stageBox").innerHTML = `<b>${esc(t)}</b><p>${esc(d)}</p>`;
  $("#nextStage").textContent = S.stage === STAGES.length - 1 ? "رأی دادن" : "مرحله بعد";
  stopTimer();
}
$("#nextStage").onclick = () => {
  if (S.stage === STAGES.length - 1) { stopTimer(); go("verdict"); } else { S.stage++; drawStage(); }
};
function stopTimer() { clearInterval(S.timer); const o = $("#timerOut"); o.textContent = "00:00"; o.classList.remove("end"); }
document.querySelectorAll(".chip").forEach(b => b.onclick = () => {
  clearInterval(S.timer); let left = +b.dataset.sec; const o = $("#timerOut"); o.classList.remove("end");
  const tick = () => {
    o.textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
    if (left-- <= 0) { clearInterval(S.timer); o.classList.add("end"); navigator.vibrate?.(300); }
  };
  tick(); S.timer = setInterval(tick, 1000);
});

/* ---------- رأی و نتیجه ---------- */
document.querySelectorAll(".vote").forEach(b => b.onclick = () => {
  const label = b.dataset.v === "plaintiff" ? "شاکی" : "متهم";
  if (!confirm(`رأی نهایی: حق با ${label}. مطمئنید؟`)) return;
  showResult(b.dataset.v);
});
function showResult(vote) {
  const c = S.c, right = vote === c.correctVerdict;
  const winSides = right ? ["judge", "plaintiff"] : ["defendant"];
  const names = { judge: "قاضی", plaintiff: "شاکی", defendant: "متهم" };
  $("#resultBox").innerHTML = `
    <div class="gavel">${right ? "⚖" : "🎭"}</div>
    <h2>${right ? "قاضی درست تشخیص داد" : "قاضی فریب خورد"}</h2>
    <p class="lead">${right ? "برنده‌ها: قاضی و شاکی" : "برنده: متهم. او توانست قاضی را راضی کند."}</p>
    <div class="paper"><h3>واقعیت ماجرا</h3>${paras(c.truth)}</div>
    <div class="paper"><h3>نقش‌ها</h3>${S.players.map(p =>
      `<p>${esc(p.name)} <span class="tag ${winSides.includes(p.role.side) ? "win" : ""}">${names[p.role.side]}${winSides.includes(p.role.side) ? " (برنده)" : ""}</span></p>`).join("")}</div>`;
  go("result");
}
$("#again").onclick = () => { S.c = null; S.players = []; go("home"); };
