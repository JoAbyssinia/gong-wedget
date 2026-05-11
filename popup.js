const gongButton     = document.getElementById("gongButton");
const gongStage      = document.getElementById("gongStage");
const kickoffMessage = document.getElementById("kickoffMessage");
const discoOverlay   = document.getElementById("discoOverlay");
const meterDots      = document.querySelectorAll(".meter-dot");

let audioContext;
let resetTimerId;
let discoTimerId;
let strikeResetTimer;
let strikeCount = 0;

const DISCO_THRESHOLD = 3;
const EMOJIS       = ["🎉","✨","🥳","🔥","💫","🎊","🚀","⭐","💥","🎶","👏","🌟"];
const SPARK_COLORS = ["#ff4444","#ff9900","#ffff00","#44ff88","#4499ff","#ff44ff","#44ffff","#ffffff","#ff6b9d","#ffd700"];

/** Lazily create AudioContext after first user interaction. */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/** Synthesise a deep resonant gong strike using layered oscillators. */
function playGongSound() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.45, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
  master.connect(ctx.destination);

  const partials = [
    { freq: 110, gain: 0.85, decay: 3.1, type: "sine"     },
    { freq: 165, gain: 0.55, decay: 2.6, type: "triangle" },
    { freq: 231, gain: 0.35, decay: 2.2, type: "sine"     },
    { freq: 318, gain: 0.22, decay: 1.8, type: "triangle" },
  ];

  partials.forEach(({ freq, gain, decay, type }) => {
    const osc  = ctx.createOscillator();
    const gain_ = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.24);
    gain_.gain.setValueAtTime(gain, now);
    gain_.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(gain_);
    gain_.connect(master);
    osc.start(now);
    osc.stop(now + decay + 0.08);
  });
}

/** Update the 5 strike-meter dots to reflect current strikeCount. */
function updateMeter(count) {
  meterDots.forEach((dot, i) => {
    dot.classList.toggle("filled", i < count);
  });
}

/** Spawn 18 emojis raining down from the top of the popup. */
function spawnEmojiRain() {
  for (let i = 0; i < 18; i++) {
    const el    = document.createElement("span");
    el.className = "emoji-drop";
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left = `${Math.random() * 410 + 15}px`;
    el.style.setProperty("--fall-dur",   `${(1.2 + Math.random() * 1.2).toFixed(2)}s`);
    el.style.setProperty("--fall-delay", `${(Math.random() * 0.6).toFixed(2)}s`);
    el.style.setProperty("--spin",       `${Math.round((Math.random() - 0.5) * 540)}deg`);
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** Burst 14 spark particles in a full circle at (x, y) inside the disco overlay. */
function spawnFirework(x, y) {
  for (let i = 0; i < 14; i++) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${x}px`;
    spark.style.top  = `${y}px`;
    spark.style.setProperty("--angle", `${(i / 14) * 360}deg`);
    spark.style.setProperty("--color", SPARK_COLORS[i % SPARK_COLORS.length]);
    spark.style.setProperty("--dur",   `${(0.7 + Math.random() * 0.5).toFixed(2)}s`);
    discoOverlay.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
  }
}

/** Launch 6 staggered firework bursts spread around the overlay. */
function launchFireworks() {
  // Positions scaled for 450×525 overlay
  const bursts = [
    [90, 270], [360, 210], [225, 420],
    [135, 150], [330, 360], [225, 270],
  ];
  bursts.forEach(([x, y], i) => {
    setTimeout(() => spawnFirework(x, y), 400 + i * 480);
  });
}

/**
 * Drop the disco ball, spin the beams, show "Happy Sprinting!",
 * and fire fireworks. Auto-dismisses after 6.5 s.
 */
function triggerDiscoMode() {
  discoOverlay.classList.remove("active");
  void discoOverlay.offsetWidth;
  discoOverlay.classList.add("active");
  discoOverlay.removeAttribute("aria-hidden");
  launchFireworks();

  clearTimeout(discoTimerId);
  discoTimerId = setTimeout(() => {
    discoOverlay.classList.remove("active");
    discoOverlay.setAttribute("aria-hidden", "true");
  }, 6500);
}

/** Trigger gong + stick animations and emoji rain. */
function triggerAnimation() {
  gongButton.classList.remove("struck");
  gongStage.classList.remove("hit");
  kickoffMessage.classList.remove("show");
  void gongButton.offsetWidth;
  void gongStage.offsetWidth;
  gongButton.classList.add("struck");
  gongStage.classList.add("hit");
  kickoffMessage.classList.add("show");
  spawnEmojiRain();

  clearTimeout(resetTimerId);
  resetTimerId = setTimeout(() => {
    gongButton.classList.remove("struck");
    gongStage.classList.remove("hit");
    kickoffMessage.classList.remove("show");
  }, 2500);
}

gongButton.addEventListener("click", () => {
  playGongSound();
  triggerAnimation();

  // Increment strike counter; reset after 8 s of inactivity.
  strikeCount = Math.min(strikeCount + 1, DISCO_THRESHOLD);
  updateMeter(strikeCount);

  clearTimeout(strikeResetTimer);
  strikeResetTimer = setTimeout(() => {
    strikeCount = 0;
    updateMeter(0);
  }, 8000);

  if (strikeCount >= DISCO_THRESHOLD) {
    strikeCount = 0;
    updateMeter(0);
    triggerDiscoMode();
  }
});
