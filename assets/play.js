(() => {
  const themeButton = document.getElementById("theme-toggle");
  const waveButton = document.getElementById("wave");
  const waveHand = document.querySelector(".wave-hand");
  const visits = document.getElementById("visits");
  const clock = document.getElementById("clock");
  const live = document.getElementById("live");
  const discordButton = document.getElementById("copy-discord");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const themeColors = { dark: "#110e0c", light: "#f4efe8" };

  // Last played. Edit song, artist, and url here when you want the chip to
  // show something current. Leave song and artist blank to hide it.
  // TODO: replace with live Spotify API call once backend exists
  const nowPlaying = {
    song: "",
    artist: "",
    url: "",
  };

  const announce = (text) => {
    if (live) live.textContent = text;
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
      themeButton.setAttribute(
        "aria-label",
        `Theme is ${theme}. Hit with a ball or press to flip.`
      );
    }
  };

  const flipTheme = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    paintTheme(next);
    announce(`${next} theme`);
    if (!themeButton) return;
    themeButton.classList.remove("hit");
    void themeButton.offsetWidth;
    themeButton.classList.add("hit");
  };

  let lastBallFlip = 0;
  const flipFromBall = () => {
    const now = performance.now();
    if (now - lastBallFlip < 650) return;
    lastBallFlip = now;
    flipTheme();
  };

  const playWave = () => {
    if (!waveHand || reduceMotion) return;
    waveHand.classList.remove("waving");
    void waveHand.offsetWidth;
    waveHand.classList.add("waving");
  };

  const bonk = (el) => {
    const now = performance.now();
    const previous = Number(el.dataset.bonkedAt || 0);
    if (now - previous < 280) return;
    el.dataset.bonkedAt = String(now);
    const tilt = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 10);
    el.style.setProperty("--tilt", `${tilt}deg`);
    el.classList.remove("bonk");
    void el.offsetWidth;
    el.classList.add("bonk");
  };

  paintTheme(currentTheme());

  if (visits) {
    try {
      const stored = Number(localStorage.getItem("ashh66-visits") || "0");
      const next = Number.isFinite(stored) && stored >= 0 ? stored + 1 : 1;
      localStorage.setItem("ashh66-visits", String(next));
      const word = next === 1 ? "visit" : "visits";
      visits.textContent = `this browser · ${next} ${word}`;
    } catch (_) {
      visits.textContent = "this browser · —";
    }
  }

  const paintClock = () => {
    if (!clock) return;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "--";
    clock.textContent = `currently in · london · ${hour}:${minute}`;
  };

  const paintListening = (track) => {
    const el = document.getElementById("listening");
    if (!el) return;
    const song = String(track?.song || "").trim();
    const artist = String(track?.artist || "").trim();
    const url = String(track?.url || "").trim();
    const title = [song, artist].filter(Boolean).join(" — ");
    el.replaceChildren();
    if (!title) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.append(document.createTextNode("listening · "));
    const safeUrl = /^https?:\/\//i.test(url) ? url : "";
    if (safeUrl) {
      const link = document.createElement("a");
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = title;
      el.append(link);
    } else {
      el.append(document.createTextNode(title));
    }
  };

  paintClock();
  window.setInterval(paintClock, 1000);
  paintListening(nowPlaying);

  themeButton?.addEventListener("click", flipTheme);
  waveButton?.addEventListener("click", playWave);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
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
    }
  };

  discordButton?.addEventListener("click", async () => {
    const handle = discordButton.querySelector("[data-handle]");
    if (!handle) return;
    const copied = await copyText("AshhFX");
    if (!copied) return;
    handle.textContent = "copied";
    window.setTimeout(() => {
      handle.textContent = "AshhFX";
    }, 1200);
  });

  if (!reduceMotion) window.setTimeout(playWave, 600);

  if (reduceMotion || !window.Matter) {
    document.body.classList.add("no-physics");
    return;
  }

  const { Engine, Runner, Bodies, Body, Composite, Events } = window.Matter;
  const engine = Engine.create({
    enableSleeping: false,
    gravity: { x: 0, y: 0.95 },
  });
  engine.positionIterations = 12;
  const world = engine.world;
  const stage = document.getElementById("stage");
  const elByBody = new WeakMap();
  const balls = [];
  const MAX_BALLS = 8;
  let obstacles = [];
  let walls = [];
  let drag = null;
  const pointer = { x: 0, y: 0 };
  let queuedRebuild = false;

  document.body.classList.add("has-physics");

  const roundedRect = (x, y, width, height, label) => {
    const maxRadius = Math.min(width, height) / 2;
    const radius = Math.max(
      0,
      label === "letter" ? maxRadius - 0.5 : Math.min(22, maxRadius - 0.5)
    );
    const bouncy = label === "letter" || label === "theme" || label === "wave";
    const options = {
      isStatic: true,
      label,
      friction: label === "letter" ? 0.02 : 0.35,
      restitution: bouncy ? 0.95 : 0.4,
    };
    if (radius >= 1) options.chamfer = { radius };
    return Bodies.rectangle(x, y, width, height, options);
  };

  const removeBall = (body) => {
    Composite.remove(world, body);
    body.el.remove();
    const index = balls.indexOf(body);
    if (index >= 0) balls.splice(index, 1);
  };

  const spawnBall = (x, y, velocity) => {
    if (balls.length >= MAX_BALLS) {
      const index = balls.findIndex((ball) => ball !== drag?.body);
      if (index >= 0) removeBall(balls[index]);
    }

    const radius = 16 + Math.random() * 8;
    const body = Bodies.circle(x, y, radius, {
      label: "ball",
      restitution: 0.78,
      friction: 0.04,
      frictionAir: 0.018,
      density: 0.0016,
      sleepThreshold: Infinity,
    });
    const el = document.createElement("div");
    el.className = "ball";
    el.dataset.tone = String(Math.floor(Math.random() * 3));
    el.style.width = `${radius * 2}px`;
    el.style.height = `${radius * 2}px`;
    body.el = el;
    stage.append(el);
    Composite.add(world, body);
    balls.push(body);
    if (velocity) Body.setVelocity(body, velocity);
    return body;
  };

  const rebuildFixtures = () => {
    for (const body of obstacles) Composite.remove(world, body);
    for (const body of walls) Composite.remove(world, body);
    obstacles = [];
    walls = [];

    const width = window.innerWidth;
    const height = window.innerHeight;
    const thick = 180;
    const wallOptions = { isStatic: true, label: "wall", friction: 0.2, restitution: 0.35 };
    walls = [
      Bodies.rectangle(width / 2, -thick / 2, width + thick * 2, thick, wallOptions),
      Bodies.rectangle(width / 2, height + thick / 2, width + thick * 2, thick, wallOptions),
      Bodies.rectangle(-thick / 2, height / 2, thick, height + thick * 2, wallOptions),
      Bodies.rectangle(width + thick / 2, height / 2, thick, height + thick * 2, wallOptions),
    ];
    Composite.add(world, walls);

    document.querySelectorAll("[data-collider]").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const body = roundedRect(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        rect.width,
        rect.height,
        el.dataset.collider || "card"
      );
      elByBody.set(body, el);
      obstacles.push(body);
    });
    if (obstacles.length) Composite.add(world, obstacles);
  };

  const scheduleRebuild = () => {
    if (queuedRebuild) return;
    queuedRebuild = true;
    requestAnimationFrame(() => {
      queuedRebuild = false;
      rebuildFixtures();
    });
  };

  const syncObstacles = () => {
    for (const body of obstacles) {
      const el = elByBody.get(body);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      Body.setAngle(body, 0);
      Body.setPosition(body, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
    }
  };

  const paintBalls = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (const ball of balls) {
      let { x, y } = ball.position;
      if (y > height + 240 || y < -420 || x < -420 || x > width + 420) {
        Body.setPosition(ball, { x: width * 0.5, y: 36 });
        Body.setVelocity(ball, { x: 0, y: 0 });
        x = width * 0.5;
        y = 36;
      }
      const radius = ball.circleRadius;
      ball.el.style.transform = `translate3d(${x - radius}px, ${y - radius}px, 0) rotate(${ball.angle}rad)`;
    }
  };

  const handleHit = (a, b) => {
    const ball = a.label === "ball" ? a : b.label === "ball" ? b : null;
    const other = ball === a ? b : ball === b ? a : null;
    if (!ball || !other) return;
    const el = elByBody.get(other);
    if (!el) return;
    if (other.label === "letter") bonk(el);
    else if (other.label === "wave") playWave();
    else if (other.label === "theme") flipFromBall();
  };

  Events.on(engine, "beforeUpdate", () => {
    syncObstacles();
    if (drag?.body) {
      Body.setPosition(drag.body, pointer);
      Body.setVelocity(drag.body, { x: 0, y: 0 });
      Body.setAngularVelocity(drag.body, 0);
    }
  });
  Events.on(engine, "afterUpdate", paintBalls);
  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) handleHit(pair.bodyA, pair.bodyB);
  });

  const releaseDrag = () => {
    if (!drag) return;
    const current = drag;
    drag = null;
    document.body.classList.remove("is-dragging");
    if (!current.body) return;
    const first = current.samples[0];
    const last = current.samples[current.samples.length - 1];
    if (last) Body.setPosition(current.body, { x: last.x, y: last.y });
    let vx = 0;
    let vy = 0;
    if (first && last && last.t - first.t > 8) {
      const scale = 16.67 / (last.t - first.t);
      vx = (last.x - first.x) * scale;
      vy = (last.y - first.y) * scale;
    }
    const speed = Math.hypot(vx, vy);
    const max = 32;
    if (speed > max) {
      vx = (vx / speed) * max;
      vy = (vy / speed) * max;
    }
    Body.setVelocity(current.body, { x: vx, y: vy });
    Body.setAngularVelocity(current.body, vx * 0.012);
  };

  const startDrag = (body, event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    drag = {
      id: event.pointerId,
      body,
      samples: [{ x: event.clientX, y: event.clientY, t: performance.now() }],
    };
    document.body.classList.add("is-dragging");
    try {
      document.documentElement.setPointerCapture(event.pointerId);
    } catch (_) {}
  };

  window.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button > 0 || drag) return;
      const ballEl = event.target.closest?.(".ball");
      if (ballEl) {
        const body = balls.find((ball) => ball.el === ballEl);
        if (!body) return;
        event.preventDefault();
        startDrag(body, event);
        return;
      }
      if (event.target.closest?.("a, button, input, textarea, select, label")) return;
      if (event.pointerType === "touch") {
        drag = {
          id: event.pointerId,
          body: null,
          pending: true,
          x: event.clientX,
          y: event.clientY,
          samples: [],
        };
        return;
      }
      event.preventDefault();
      startDrag(spawnBall(event.clientX, event.clientY), event);
    },
    { passive: false }
  );

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (drag.pending) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) < 12) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          drag = null;
          return;
        }
        const body = spawnBall(drag.x, drag.y);
        startDrag(body, event);
        return;
      }
      event.preventDefault();
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      drag.samples.push({ x: event.clientX, y: event.clientY, t: performance.now() });
      const cutoff = performance.now() - 90;
      while (drag.samples.length > 2 && drag.samples[0].t < cutoff) drag.samples.shift();
    },
    { passive: false }
  );

  window.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    releaseDrag();
  });
  window.addEventListener("pointercancel", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    releaseDrag();
  });

  rebuildFixtures();
  const watch = new ResizeObserver(() => scheduleRebuild());
  document.querySelectorAll("[data-collider]").forEach((el) => watch.observe(el));
  window.addEventListener("resize", scheduleRebuild);
  if (document.fonts) document.fonts.ready.then(scheduleRebuild);

  const dropStarterBalls = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = Math.max(0, (width - 680) / 2);
    if (margin > 110) {
      spawnBall(margin * 0.45, 110, { x: 1.4, y: 1 });
      spawnBall(width - margin * 0.4, 170, { x: -1.6, y: 0.8 });
      spawnBall(width - margin * 0.55, height * 0.58, { x: -0.6, y: -1.5 });
      return;
    }
    spawnBall(40, height - 48, { x: 2.2, y: -7 });
    spawnBall(width - 46, height - 78, { x: -2.4, y: -5 });
  };
  dropStarterBalls();

  const runner = Runner.create();
  Runner.run(runner, engine);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) Runner.stop(runner);
    else Runner.run(runner, engine);
  });
})();
