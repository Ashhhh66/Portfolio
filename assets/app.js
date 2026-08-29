const engagements = [];

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
};

tick();
window.setInterval(tick, 1000);
renderLog();
