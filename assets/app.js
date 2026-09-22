const engagements = [
  {
    opened: "2026-08-29",
    id: "PS-001",
    severity: "info",
    summary: "TCP connect port scanner published",
    status: "live",
    href: "https://github.com/Ashhhh66/Port-Scanner",
  },
  {
    opened: "2026-08-29",
    id: "HC-001",
    severity: "info",
    summary: "File hash checker published",
    status: "live",
    href: "https://github.com/Ashhhh66/Hash-Checker",
  },
  {
    opened: "2026-08-30",
    id: "66-001",
    severity: "info",
    summary: "66-Tool paid privacy hygiene panel listed",
    status: "live",
    href: "66-tool/",
  },
];

const capabilities = [
  { label: "Alert triage", href: "" }, // TODO: evidence — writeup, ticket sample, or profile
  { label: "Log analysis", href: "" }, // TODO: evidence — log-review note or repo
  { label: "Threat intel lookup", href: "" }, // TODO: evidence — lookup notes or tool
  { label: "Incident notes", href: "" }, // TODO: evidence — redacted note or template
  { label: "TCP connect scanning", href: "https://github.com/Ashhhh66/Port-Scanner" },
  { label: "Network fundamentals", href: "" }, // TODO: evidence — lab notes or cert/profile
  { label: "File hashing", href: "https://github.com/Ashhhh66/Hash-Checker" },
  { label: "Python tooling", href: "https://github.com/Ashhhh66" },
  { label: "OSINT hygiene", href: "" }, // TODO: evidence — writeup or repo
  { label: "Identity & access basics", href: "" }, // TODO: evidence — writeup or lab
  { label: "Privacy hygiene", href: "66-tool/" },
  { label: "Secure ops discipline", href: "" }, // TODO: evidence — checklist or note
];

const tools = [
  {
    kicker: "PS-001 // Python",
    name: "Port Scanner",
    blurb:
      "TCP connect scanner for authorized hosts. Concurrent probes, common port presets, optional banners, JSON output. No raw sockets.",
    href: "https://github.com/Ashhhh66/Port-Scanner",
    repoLabel: "github.com/Ashhhh66/Port-Scanner",
    writeup: "", // TODO: blog / walkthrough / case study URL
    writeupLabel: "Notes",
  },
  {
    kicker: "HC-001 // Python",
    name: "Hash Checker",
    blurb:
      "File and text digests for integrity checks. SHA-256 by default, optional known-hash compare, JSON output. Local files only.",
    href: "https://github.com/Ashhhh66/Hash-Checker",
    repoLabel: "github.com/Ashhhh66/Hash-Checker",
    writeup: "", // TODO: blog / walkthrough / case study URL
    writeupLabel: "Notes",
  },
];

const productExtras = {
  // TODO: path or URL to a short demo GIF / video. Empty = hidden.
  demoSrc: "",
  // "gif" | "video" | "youtube"
  demoType: "gif",
  demoAlt: "66-Tool demo",
  // TODO: one-line support / refund policy. Empty = hidden.
  supportPolicy: "",
  // TODO: changelog / version-history URL. Empty = hidden.
  changelogHref: "",
  changelogLabel: "Version history",
};

const pad = (value) => String(value).padStart(2, "0");

const formatClock = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${pad(lookup.hour)}:${pad(lookup.minute)}:${pad(lookup.second)}`;
};

const setTextIfChanged = (node, value) => {
  if (node && node.textContent !== value) node.textContent = value;
};

const tick = () => {
  const now = new Date();
  setTextIfChanged(document.getElementById("clock-london"), formatClock(now, "Europe/London"));
  setTextIfChanged(document.getElementById("clock-utc"), formatClock(now, "UTC"));
};

const scheduleTick = () => {
  tick();
  const delay = 1000 - (Date.now() % 1000);
  window.setTimeout(scheduleTick, delay);
};

const renderLog = () => {
  const body = document.getElementById("log-body");
  const count = document.getElementById("log-count");
  if (!body || !count) return;

  count.textContent = `${engagements.length} record${engagements.length === 1 ? "" : "s"}`;

  if (!engagements.length) {
    body.innerHTML = `
      <tr>
        <td class="empty" colspan="5">
          <strong>Queue clear</strong>
          No engagements logged. This desk is live, but the ticket file is empty.
        </td>
      </tr>
    `;
    return;
  }

  body.replaceChildren();
  for (const item of engagements) {
    const row = document.createElement("tr");
    const cells = [item.opened, item.id, item.severity, item.summary, item.status];
    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 3 && item.href) {
        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = value;
        if (item.href.startsWith("http")) {
          link.rel = "noopener noreferrer";
          link.target = "_blank";
        }
        cell.append(link);
      } else {
        cell.textContent = value;
        if (index === 4) cell.classList.add(`state-${item.status}`);
      }
      row.append(cell);
    });
    body.append(row);
  }
};

const renderCapabilities = () => {
  const list = document.getElementById("caps");
  if (!list) return;
  list.replaceChildren();
  for (const item of capabilities) {
    const li = document.createElement("li");
    if (item.href) {
      const link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.label;
      if (item.href.startsWith("http")) {
        link.rel = "noopener noreferrer";
        link.target = "_blank";
      }
      li.append(link);
    } else {
      li.textContent = item.label;
    }
    list.append(li);
  }
};

const renderTools = () => {
  const grid = document.getElementById("tool-grid");
  if (!grid) return;
  grid.replaceChildren();
  for (const tool of tools) {
    const card = document.createElement("article");
    card.className = "tool-card";

    const kicker = document.createElement("span");
    kicker.className = "tool-kicker";
    kicker.textContent = tool.kicker;

    const name = document.createElement("strong");
    name.textContent = tool.name;

    const blurb = document.createElement("span");
    blurb.textContent = tool.blurb;

    const links = document.createElement("span");
    links.className = "tool-links";

    const repo = document.createElement("a");
    repo.className = "tool-url";
    repo.href = tool.href;
    repo.textContent = tool.repoLabel;
    if (tool.href.startsWith("http")) {
      repo.rel = "noopener noreferrer";
      repo.target = "_blank";
    }
    links.append(repo);

    if (tool.writeup) {
      const notes = document.createElement("a");
      notes.className = "tool-url";
      notes.href = tool.writeup;
      notes.textContent = tool.writeupLabel || "Notes";
      if (tool.writeup.startsWith("http")) {
        notes.rel = "noopener noreferrer";
        notes.target = "_blank";
      }
      links.append(notes);
    }

    card.append(kicker, name, blurb, links);
    grid.append(card);
  }
};

const renderProductExtras = () => {
  const demo = document.getElementById("product-demo");
  if (demo && productExtras.demoSrc) {
    demo.hidden = false;
    demo.replaceChildren();
    if (productExtras.demoType === "youtube") {
      const frame = document.createElement("iframe");
      frame.src = productExtras.demoSrc;
      frame.title = productExtras.demoAlt;
      frame.setAttribute("allowfullscreen", "");
      demo.append(frame);
    } else if (productExtras.demoType === "video") {
      const video = document.createElement("video");
      video.src = productExtras.demoSrc;
      video.controls = true;
      video.playsInline = true;
      demo.append(video);
    } else {
      const img = document.createElement("img");
      img.src = productExtras.demoSrc;
      img.alt = productExtras.demoAlt;
      demo.append(img);
    }
  }

  const policy = document.getElementById("product-policy");
  if (policy && productExtras.supportPolicy) {
    policy.hidden = false;
    policy.textContent = productExtras.supportPolicy;
  }

  const changelog = document.getElementById("product-changelog");
  if (changelog && productExtras.changelogHref) {
    changelog.hidden = false;
    changelog.replaceChildren();
    const link = document.createElement("a");
    link.href = productExtras.changelogHref;
    link.textContent = productExtras.changelogLabel || "Version history";
    if (productExtras.changelogHref.startsWith("http")) {
      link.rel = "noopener noreferrer";
      link.target = "_blank";
    }
    changelog.append(link);
  }
};

scheduleTick();
renderLog();
renderCapabilities();
renderTools();
renderProductExtras();
