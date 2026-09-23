(() => {
  const themeButton = document.querySelector(".theme");
  const nameEl = document.querySelector(".name");
  const live = document.getElementById("live");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const themeColors = { dark: "#0B0D17", light: "#FAFAFC" };

  // Edit this when you are somewhere else. Shown as "currently in …".
  const currentlyIn = "London";

  // TODO: replace this object with a fetch() call to a Cloudflare Worker endpoint
  // that returns live/recent Spotify data — see spotify-now-playing worker.
  const lastPlayed = {
    title: "Song title",
    artist: "Artist",
    url: "",
  };

  const currentTheme = () =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark";

  const paintTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("ashh66-theme", theme);
    } catch (_) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeColors[theme]);
    if (themeButton) {
      const next = theme === "dark" ? "light" : "dark";
      themeButton.setAttribute("aria-label", `Switch to ${next} theme`);
    }
  };

  paintTheme(currentTheme());
  requestAnimationFrame(() => document.documentElement.classList.add("theme-ready"));

  themeButton?.addEventListener("click", () => {
    paintTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  const where = document.getElementById("where");
  if (where) {
    const place = String(currentlyIn || "").trim();
    where.textContent = place ? `currently in ${place}` : "currently in";
  }

  const visits = document.getElementById("visits");
  if (visits) {
    // Count is stored in this browser only, for the last 30 days.
    // TODO: replace this block with a backend call that returns a 30-day visit count.
    try {
      const key = "ashh66-visits-30d";
      const now = Date.now();
      const month = 30 * 24 * 60 * 60 * 1000;
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      const recent = Array.isArray(stored)
        ? stored.filter((stamp) => typeof stamp === "number" && now - stamp < month)
        : [];
      recent.push(now);
      localStorage.setItem(key, JSON.stringify(recent));
      visits.textContent = String(recent.length);
    } catch (_) {
      visits.textContent = "—";
    }
  }

  const paintLastPlayed = (track) => {
    const host = document.getElementById("played");
    const body = document.getElementById("played-body");
    if (!host || !body) return;
    const title = String(track?.title || "").trim();
    const artist = String(track?.artist || "").trim();
    const url = String(track?.url || "").trim();
    const line = [title, artist].filter(Boolean).join(" — ");
    const label = document.createElement("span");
    label.className = "played-label";
    label.textContent = "last played";
    const name = document.createElement("span");
    name.className = "played-title";
    name.textContent = line || "Song title — Artist";
    const safeUrl = /^https?:\/\//i.test(url) ? url : "";
    if (safeUrl) {
      const link = document.createElement("a");
      link.className = "played-link";
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(label, name);
      body.replaceWith(link);
      return;
    }
    body.replaceChildren(label, name);
  };

  paintLastPlayed(lastPlayed);

  const copyTextSync = (text) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-999px";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {
      ok = false;
    }
    area.remove();
    return ok;
  };

  let toastTimer = 0;
  const showCopied = (button, value) => {
    const toast = button.querySelector(".toast");
    document.querySelectorAll(".toast").forEach((el) => {
      el.hidden = true;
    });
    if (toast) toast.hidden = false;
    if (live) live.textContent = `Copied ${value}`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toast) toast.hidden = true;
    }, 1100);
  };

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-copy") || "";
      let copied = false;
      const mark = () => {
        if (copied) return;
        copied = true;
        showCopied(button, value);
      };
      if (copyTextSync(value)) mark();
      const pending = navigator.clipboard?.writeText(value);
      if (pending) pending.then(mark).catch(() => {});
    });
  });

  let nameHot = false;
  let nameReadyAt = 0;
  const flashName = () => {
    if (!nameEl || reduceMotion) return;
    const now = performance.now();
    if (now < nameReadyAt) return;
    nameReadyAt = now + 700;
    const flash = Math.random() < 0.5 ? "var(--accent)" : "var(--accent-2)";
    nameEl.style.setProperty("--flash", flash);
    nameEl.classList.remove("pulse");
    void nameEl.offsetWidth;
    nameEl.classList.add("pulse");
  };

  const nameIsNear = (x, y) => {
    if (!nameEl) return false;
    const rect = nameEl.getBoundingClientRect();
    const pad = 28;
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
  };

  const watchName = (x, y) => {
    const near = nameIsNear(x, y);
    if (near && !nameHot) flashName();
    nameHot = near;
  };

  const canvas = document.getElementById("field");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const spacing = 46;
  const dots = [];
  const ripples = [];
  let mouse = null;
  let frame = 0;

  const readColors = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      dot: style.getPropertyValue("--muted").trim() || "#9096b0",
      line: style.getPropertyValue("--accent-2").trim() || "#00e5ff",
    };
  };

  const layoutDots = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots.length = 0;
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * spacing + spacing * 0.5;
        const y = row * spacing + spacing * 0.5;
        dots.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 });
      }
    }
  };

  const drawDots = (colors, alpha) => {
    ctx.fillStyle = colors.dot;
    ctx.globalAlpha = alpha;
    for (const dot of dots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const drawStatic = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);
    drawDots(readColors(), 0.55);
  };

  const pushTarget = (dot, now) => {
    let tx = dot.ox;
    let ty = dot.oy;
    if (mouse) {
      const dx = dot.ox - mouse.x;
      const dy = dot.oy - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 90 && dist > 0.01) {
        const push = (1 - dist / 90) * 22;
        tx += (dx / dist) * push;
        ty += (dy / dist) * push;
      }
    }
    for (const ripple of ripples) {
      const age = (now - ripple.t) / 520;
      if (age < 0 || age > 1) continue;
      const dx = dot.ox - ripple.x;
      const dy = dot.oy - ripple.y;
      const dist = Math.hypot(dx, dy);
      const reach = 150;
      if (dist < reach && dist > 0.01) {
        const wave = Math.sin(age * Math.PI) * (1 - dist / reach) * 26;
        tx += (dx / dist) * wave;
        ty += (dy / dist) * wave;
      }
    }
    return { tx, ty };
  };

  const drawField = (now) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      if (now - ripples[i].t > 520) ripples.splice(i, 1);
    }
    for (const dot of dots) {
      const { tx, ty } = pushTarget(dot, now);
      dot.vx += (tx - dot.x) * 0.18;
      dot.vy += (ty - dot.y) * 0.18;
      dot.vx *= 0.72;
      dot.vy *= 0.72;
      dot.x += dot.vx;
      dot.y += dot.vy;
    }
    ctx.clearRect(0, 0, width, height);
    const colors = readColors();
    if (mouse) {
      const near = [];
      for (const dot of dots) {
        if (Math.hypot(dot.x - mouse.x, dot.y - mouse.y) < 120) near.push(dot);
      }
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1;
      for (let i = 0; i < near.length; i += 1) {
        for (let j = i + 1; j < near.length; j += 1) {
          const a = near[i];
          const b = near[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) > 64) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    drawDots(colors, 0.8);
  };

  const tick = (now) => {
    drawField(now);
    frame = requestAnimationFrame(tick);
  };

  layoutDots();
  if (reduceMotion) {
    drawStatic();
    window.addEventListener("resize", () => {
      layoutDots();
      drawStatic();
    });
    return;
  }

  window.addEventListener("resize", () => {
    layoutDots();
  });

  window.addEventListener("pointermove", (event) => {
    mouse = { x: event.clientX, y: event.clientY };
    watchName(event.clientX, event.clientY);
  });

  window.addEventListener("pointerdown", (event) => {
    mouse = { x: event.clientX, y: event.clientY };
    ripples.push({ x: event.clientX, y: event.clientY, t: performance.now() });
    watchName(event.clientX, event.clientY);
  });

  window.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") mouse = null;
  });

  window.addEventListener("pointerleave", () => {
    mouse = null;
    nameHot = false;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (!frame) frame = requestAnimationFrame(tick);
  });

  frame = requestAnimationFrame(tick);
})();
