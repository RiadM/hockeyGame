const state = {
  players: [],
  answer: null,
  score: 0,
  hintIndex: 0,
};

const scoreEl = document.getElementById("score");
const tableHead = document.getElementById("table-head");
const statsBody = document.getElementById("stats-body");
const guessForm = document.getElementById("guess-form");
const guessInput = document.getElementById("guess-input");
const guessOptions = document.getElementById("player-options");
const hintButton = document.getElementById("hint-button");
const nextButton = document.getElementById("next-button");
const feedbackEl = document.getElementById("feedback");
const hintOutput = document.getElementById("hint-output");

init();

async function init() {
  try {
    const response = await fetch("data/players.json");
    if (!response.ok) {
      throw new Error(`Unable to load player data (status ${response.status}).`);
    }

    const payload = await response.json();
    const players = Array.isArray(payload.players) ? payload.players : [];
    if (!players.length) {
      throw new Error("The players list is empty. Add entries to data/players.json.");
    }

    state.players = players;
    populateGuessOptions(players);
    startRound();
  } catch (error) {
    console.error(error);
    setFeedback(error.message, "error");
    guessForm.querySelector("button[type='submit']").disabled = true;
    hintButton.disabled = true;
  }
}

function startRound() {
  state.answer = pickRandom(state.players);
  state.hintIndex = 0;
  hintOutput.textContent = "";
  setFeedback("Who is this player?", "");
  guessInput.value = "";
  guessInput.disabled = false;
  guessInput.focus();
  guessForm.querySelector("button[type='submit']").disabled = false;
  hintButton.disabled = false;
  nextButton.classList.add("hidden");
  renderTable(state.answer);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function populateGuessOptions(players) {
  guessOptions.innerHTML = players
    .map((player) => `<option value="${escapeHtml(player.name)}"></option>`)
    .join("");
}

function renderTable(player) {
  if (player.position === "G" || Array.isArray(player.goalie_regular_season)) {
    renderGoalieTable(player);
  } else {
    renderSkaterTable(player);
  }
}

function renderSkaterTable(player) {
  tableHead.innerHTML = `
    <tr>
      <th rowspan="2">Season</th>
      <th rowspan="2">Team</th>
      <th rowspan="2">Lge</th>
      <th colspan="6">Regular Season</th>
      <th colspan="5">Playoffs</th>
    </tr>
    <tr>
      <th>GP</th>
      <th>G</th>
      <th>A</th>
      <th>Pts</th>
      <th>+/−</th>
      <th>PIM</th>
      <th>GP</th>
      <th>G</th>
      <th>A</th>
      <th>Pts</th>
      <th>PIM</th>
    </tr>`;

  const rows = mergeSeasonRows(player.regular_season, player.playoffs);
  statsBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.season}</td>
        <td>${row.team}</td>
        <td>${row.league}</td>
        ${renderRegularCells(row.regular)}
        ${renderPlayoffCells(row.playoffs)}
      </tr>`)
    .join("");
}

function renderGoalieTable(player) {
  tableHead.innerHTML = `
    <tr>
      <th rowspan="2">Season</th>
      <th rowspan="2">Team</th>
      <th rowspan="2">Lge</th>
      <th colspan="9">Regular Season</th>
      <th colspan="1">Playoffs</th>
    </tr>
    <tr>
      <th>GP</th>
      <th>Min</th>
      <th>GA</th>
      <th>SO</th>
      <th>W</th>
      <th>L</th>
      <th>OT</th>
      <th>GAA</th>
      <th>SV%</th>
      <th>GP</th>
    </tr>`;

  const rows = mergeSeasonRows(player.goalie_regular_season, player.goalie_playoffs);
  statsBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.season}</td>
        <td>${row.team}</td>
        <td>${row.league}</td>
        ${renderGoalieRegularCells(row.regular)}
        <td>${formatStat(row.playoffs?.gp)}</td>
      </tr>`)
    .join("");
}

function mergeSeasonRows(regular = [], playoffs = []) {
  const map = new Map();

  if (Array.isArray(regular)) {
    for (const entry of regular) {
      const key = `${entry.season}|${entry.team}|${entry.league}`;
      if (!map.has(key)) {
        map.set(key, {
          season: entry.season ?? "—",
          team: entry.team ?? "—",
          league: entry.league ?? "—",
          regular: null,
          playoffs: null,
        });
      }
      if (entry.playoffs_only) {
        map.get(key).playoffs = entry;
      } else {
        map.get(key).regular = entry;
      }
    }
  }

  if (Array.isArray(playoffs)) {
    for (const entry of playoffs) {
      const key = `${entry.season}|${entry.team}|${entry.league}`;
      if (!map.has(key)) {
        map.set(key, {
          season: entry.season ?? "—",
          team: entry.team ?? "—",
          league: entry.league ?? "—",
          regular: null,
          playoffs: null,
        });
      }
      map.get(key).playoffs = entry;
    }
  }

  const rows = Array.from(map.values());
  rows.sort((a, b) => compareSeason(a.season, b.season));
  return rows;
}

function renderRegularCells(entry) {
  if (!entry) {
    return `<td colspan="6">—</td>`;
  }

  if (entry.stats_unavailable) {
    return `<td colspan="6">Stats unavailable</td>`;
  }

  const plusMinus = entry["+/-"] ?? entry.plusMinus;
  return `
    <td>${formatStat(entry.gp)}</td>
    <td>${formatStat(entry.g)}</td>
    <td>${formatStat(entry.a)}</td>
    <td>${formatStat(entry.pts)}</td>
    <td>${formatSigned(plusMinus)}</td>
    <td>${formatStat(entry.pim)}</td>`;
}

function renderPlayoffCells(entry) {
  if (!entry) {
    return `<td colspan="5">—</td>`;
  }

  const keys = ["gp", "g", "a", "pts", "pim"];
  return keys.map((key) => `<td>${formatStat(entry[key])}</td>`).join("");
}

function renderGoalieRegularCells(entry = {}) {
  if (!entry || Object.keys(entry).length === 0) {
    return `<td colspan="9">—</td>`;
  }

  const cells = [
    formatStat(entry.gp),
    formatStat(entry.min),
    formatStat(entry.ga),
    formatStat(entry.so),
    formatStat(entry.w),
    formatStat(entry.l),
    formatStat(entry.t ?? entry.ot ?? entry.otl),
    formatAverage(entry.gaa),
    formatSavePct(entry.pct),
  ];

  return cells.map((value) => `<td>${value}</td>`).join("");
}

function compareSeason(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return 0;
  }

  const clean = (value) => Number.parseInt(value.split("-")[0], 10);
  return clean(a) - clean(b);
}

function formatStat(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return Number.isFinite(value) ? value : value;
}

function formatSigned(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value;
  }
  return number > 0 ? `+${number}` : number.toString();
}

function formatAverage(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value ?? "—";
  }
  return number.toFixed(2);
}

function formatSavePct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value ?? "—";
  }
  return number.toFixed(3);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[match]);
}

guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const guess = guessInput.value.trim();
  if (!guess) {
    return;
  }

  if (!state.answer) {
    return;
  }

  if (normalize(guess) === normalize(state.answer.name)) {
    state.score += 1;
    scoreEl.textContent = state.score;
    setFeedback(`Correct! It was ${state.answer.name}.`, "success");
    endRound();
  } else {
    setFeedback("Nope, try another guess.", "error");
  }
});

hintButton.addEventListener("click", () => {
  if (!state.answer) {
    return;
  }

  const hints = buildHints(state.answer);
  if (state.hintIndex >= hints.length) {
    setHintOutput("No more hints available.");
    hintButton.disabled = true;
    return;
  }

  setHintOutput(hints[state.hintIndex]);
  state.hintIndex += 1;
  if (state.hintIndex >= hints.length) {
    hintButton.disabled = true;
  }
});

nextButton.addEventListener("click", () => {
  startRound();
});

function buildHints(player) {
  const hints = [];
  if (player.position) {
    hints.push(`Position: ${player.position}`);
  }
  if (player.shoots) {
    hints.push(`Shoots: ${player.shoots}`);
  }
  if (player.birth?.place) {
    hints.push(`Birthplace: ${player.birth.place}`);
  }
  if (player.draft?.team) {
    const draft = player.draft;
    const detail = [draft.team, draft.year ? draft.year : "", draft.round ? `Rd ${draft.round}` : ""].filter(Boolean).join(" · ");
    hints.push(`Drafted by: ${detail}`);
  }
  if (player.totals?.nhl?.gp) {
    const totals = player.totals.nhl;
    const goals = totals.g ?? totals.goals ?? "—";
    const assists = totals.a ?? totals.assists ?? "—";
    hints.push(`NHL totals: ${totals.gp} GP, ${goals} G, ${assists} A`);
  }
  if (!hints.length) {
    hints.push("No hints available for this player.");
  }
  return hints;
}

function endRound() {
  guessInput.disabled = true;
  guessForm.querySelector("button[type='submit']").disabled = true;
  hintButton.disabled = true;
  nextButton.classList.remove("hidden");
}

function setFeedback(message, type) {
  feedbackEl.textContent = message;
  feedbackEl.className = "feedback" + (type ? ` ${type}` : "");
}

function setHintOutput(message) {
  hintOutput.textContent = message;
}

function normalize(value) {
  return value.toLowerCase();
}
