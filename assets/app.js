const capabilities = [
  { label: "Alert triage", href: "" }, // TODO: evidence
  { label: "Log analysis", href: "" }, // TODO: evidence
  { label: "Threat intel lookup", href: "" }, // TODO: evidence
  { label: "Incident notes", href: "" }, // TODO: evidence
  { label: "TCP connect scanning", href: "https://github.com/Ashhhh66/Port-Scanner" },
  { label: "Network fundamentals", href: "" }, // TODO: evidence
  { label: "File hashing", href: "https://github.com/Ashhhh66/Hash-Checker" },
  { label: "Python tooling", href: "https://github.com/Ashhhh66" },
  { label: "OSINT hygiene", href: "" }, // TODO: evidence
  { label: "Identity & access basics", href: "" }, // TODO: evidence
  { label: "Privacy hygiene", href: "66-tool/" },
  { label: "Secure ops discipline", href: "" }, // TODO: evidence
];

const tools = [
  {
    kicker: "Python",
    name: "Port Scanner",
    blurb:
      "TCP connect scanner for authorized hosts. Concurrent probes, common-port presets, optional banners, JSON. No raw sockets.",
    href: "https://github.com/Ashhhh66/Port-Scanner",
    repoLabel: "github.com/Ashhhh66/Port-Scanner",
    writeup: "", // TODO: blog / walkthrough URL
    writeupLabel: "Notes",
  },
  {
    kicker: "Python",
    name: "Hash Checker",
    blurb:
      "File and text digests for integrity checks. SHA-256 by default, optional known-hash compare, JSON. Local files only.",
    href: "https://github.com/Ashhhh66/Hash-Checker",
    repoLabel: "github.com/Ashhhh66/Hash-Checker",
    writeup: "", // TODO: blog / walkthrough URL
    writeupLabel: "Notes",
  },
];

const productExtras = {
  // TODO: demo GIF / video URL. Empty = hidden.
  demoSrc: "",
  demoType: "gif",
  demoAlt: "66-Tool demo",
  // TODO: support / refund line. Empty = hidden.
  supportPolicy: "",
  // TODO: changelog URL. Empty = hidden.
  changelogHref: "",
  changelogLabel: "Version history",
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
  const grid = document.getElementById("work-grid");
  if (!grid) return;
  grid.replaceChildren();
  for (const tool of tools) {
    const card = document.createElement("article");
    card.className = "work-card card";

    const kicker = document.createElement("span");
    kicker.className = "kicker";
    kicker.textContent = tool.kicker;

    const name = document.createElement("strong");
    name.textContent = tool.name;

    const blurb = document.createElement("p");
    blurb.textContent = tool.blurb;

    const links = document.createElement("span");
    links.className = "work-links";

    const repo = document.createElement("a");
    repo.className = "fine";
    repo.href = tool.href;
    repo.textContent = tool.repoLabel;
    if (tool.href.startsWith("http")) {
      repo.rel = "noopener noreferrer";
      repo.target = "_blank";
    }
    links.append(repo);

    if (tool.writeup) {
      const notes = document.createElement("a");
      notes.className = "fine";
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

renderCapabilities();
renderTools();
renderProductExtras();
