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
];

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

const tick = () => {
  const now = new Date();
  const london = document.getElementById("clock-london");
  const utc = document.getElementById("clock-utc");
  if (london) london.textContent = formatClock(now, "Europe/London");
  if (utc) utc.textContent = formatClock(now, "UTC");
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
        link.rel = "noopener noreferrer";
        link.target = "_blank";
        link.textContent = value;
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

tick();
window.setInterval(tick, 1000);
renderLog();
