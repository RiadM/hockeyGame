const state = {
  players: [],
  tokens: 0,
  round: 0,
  stats: {
    rounds: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  revealed: {},
  candidates: [],
  answer: null,
  concluded: false,
};

const sections = [
  "regularSeason",
  "playoffs",
  "tournaments",
  "awards",
  "totals",
  "identity",
];

const tokenDisplay = document.getElementById("token-count");
const feedbackEl = document.getElementById("feedback");
const guessForm = document.getElementById("guess-form");
const guessInput = document.getElementById("guess-input");
const guessOptions = document.getElementById("guess-options");
const nextRoundBtn = document.getElementById("next-round");

async function init() {
  try {
    const response = await fetch("data/players.json");
    if (!response.ok) {
      throw new Error(`Unable to load player data: ${response.status}`);
    }
    const data = await response.json();
    state.players = normalizePlayers(data.players ?? []);
    if (!state.players.length) {
      throw new Error("Player list is empty. Ensure data/players.json is populated.");
    }
    startRound();
  } catch (error) {
    console.error(error);
    setFeedback(error.message, "error");
    disableAllInteractions();
  }
}

document.querySelectorAll(".reveal-button").forEach((button) => {
  button.addEventListener("click", () => handleReveal(button));
});

guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleGuess();
});

nextRoundBtn.addEventListener("click", () => {
  if (!nextRoundBtn.disabled) {
    if (!state.concluded) {
      concludeRound(false);
    }
    startRound();
  }
});

function startRound() {
  state.round += 1;
  state.tokens = 6;
  state.revealed = Object.fromEntries(sections.map((key) => [key, false]));
  state.candidates = pickFive(state.players);
  state.answer = state.candidates[Math.floor(Math.random() * state.candidates.length)];
  state.concluded = false;

  updateTokens();
  renderBio();
  resetTables();
  resetButtons();
  renderGuessOptions();
  guessInput.value = "";
  guessInput.disabled = false;
  guessInput.focus();
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  nextRoundBtn.disabled = true;
  nextRoundBtn.textContent = "Start Next Round";
}

function pickFive(players) {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(5, shuffled.length));
}

function updateTokens() {
  tokenDisplay.textContent = state.tokens;
}

function handleReveal(button) {
  const section = button.dataset.section;
  const cost = Number.parseInt(button.dataset.cost ?? "1", 10);

  if (state.revealed[section]) {
    return;
  }

  if (state.tokens < cost) {
    setFeedback(`Not enough tokens. You need ${cost} token(s).`, "error");
    return;
  }

  state.tokens -= cost;
  state.revealed[section] = true;
  updateTokens();

  switch (section) {
    case "regularSeason":
      renderStatTable("regularSeason", state.answer.regularSeason);
      renderTotalsRow("regularSeason", state.answer.totals?.regularSeason);
      break;
    case "playoffs":
      renderStatTable("playoffs", state.answer.playoffs);
      renderTotalsRow("playoffs", state.answer.totals?.playoffs);
      break;
    case "tournaments":
      renderTournamentTable();
      break;
    case "awards":
      renderAwards();
      break;
    case "totals":
      renderCareerTotals();
      break;
    case "identity":
      revealIdentity();
      concludeRound(false);
      setFeedback(`Identity revealed. The mystery player was ${state.answer?.name ?? "unknown"}.`, "error");
      break;
    default:
      break;
  }

  button.disabled = true;

  if (state.tokens === 0) {
    setFeedback("No tokens remaining. Make your best guess!", "error");
    nextRoundBtn.disabled = false;
    nextRoundBtn.textContent = "Out of tokens? Start a new round";
  }
}

function renderBio() {
  const bioList = document.getElementById("bio-list");
  bioList.innerHTML = "";
  if (!state.answer) {
    return;
  }
  const bioEntries = {
    Position: state.answer.bio?.position ?? "—",
    Shoots: state.answer.bio?.shoots ?? "—",
    Born: state.answer.bio?.born ?? "—",
    "Birth Place": state.answer.bio?.birthPlace ?? "—",
    Height: state.answer.bio?.height ?? "—",
    Weight: state.answer.bio?.weight ?? "—",
    Drafted: state.answer.bio?.draft ?? "—",
    Nationality: state.answer.bio?.nationality ?? "—",
  };

  Object.entries(bioEntries).forEach(([label, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    bioList.append(dt, dd);
  });

  const identityText = document.getElementById("identity-reveal");
  identityText.textContent = "";
}

function renderGuessOptions() {
  guessOptions.innerHTML = "";
  state.candidates.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.name;
    guessOptions.append(option);
  });
}

function resetTables() {
  ["regularSeason", "playoffs", "tournaments", "totals"].forEach((section) => {
    const head = document.getElementById(`${section}-head`);
    const body = document.getElementById(`${section}-body`);
    const isGoalie = state.answer?.category === "goalie";
    const placeholderColspan =
      section === "tournaments"
        ? isGoalie
          ? 8
          : 7
        : section === "totals"
        ? isGoalie
          ? 8
          : 6
        : isGoalie
        ? 9
        : 8;
    head.innerHTML = "";
    body.innerHTML = `<tr><td colspan="${placeholderColspan}" class="placeholder">Spend tokens to reveal data.</td></tr>`;
    const foot = document.getElementById(`${section}-foot`);
    if (foot) {
      foot.innerHTML = "";
    }
  });
  document.getElementById("awards-list").innerHTML = "<li class=placeholder>Spend tokens to reveal data.</li>";
  document.getElementById("identity-reveal").textContent = "";
}

function resetButtons() {
  document.querySelectorAll(".reveal-button").forEach((button) => {
    button.disabled = false;
  });
}

function renderStatTable(section, entries = []) {
  const head = document.getElementById(`${section}-head`);
  const body = document.getElementById(`${section}-body`);
  const foot = document.getElementById(`${section}-foot`);

  const isGoalie = state.answer?.category === "goalie";
  head.innerHTML = isGoalie
    ? "<th>Season</th><th>Team</th><th>League</th><th>GP</th><th>W</th><th>L</th><th>OT</th><th>GAA</th><th>SV%</th>"
    : "<th>Season</th><th>Team</th><th>League</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>PIM</th>";

  if (!entries?.length) {
    const placeholderColspan = isGoalie ? 9 : 8;
    body.innerHTML = `<tr><td colspan="${placeholderColspan}" class="placeholder">No stats available.</td></tr>`;
  } else {
    body.innerHTML = entries
      .map((entry) => (isGoalie ? rowGoalie(entry) : rowSkater(entry)))
      .join("");
  }

  if (foot && state.answer?.totals?.[section]) {
    const totals = state.answer.totals[section];
    foot.innerHTML = isGoalie
      ? `<tr><th>Totals</th><td></td><td></td><td>${totals.gp ?? "—"}</td><td>${totals.w ?? "—"}</td><td>${totals.l ?? "—"}</td><td>${totals.ot ?? "—"}</td><td>${totals.gaa ?? "—"}</td><td>${formatNumber(totals.svPct)}</td></tr>`
      : `<tr><th>Totals</th><td></td><td></td><td>${totals.gp ?? "—"}</td><td>${totals.g ?? "—"}</td><td>${totals.a ?? "—"}</td><td>${totals.pts ?? "—"}</td><td>${totals.pim ?? "—"}</td></tr>`;
  }
}

function renderTotalsRow(section, totals) {
  if (!totals) return;
  const foot = document.getElementById(`${section}-foot`);
  if (!foot) return;
  const isGoalie = state.answer?.category === "goalie";
  foot.innerHTML = isGoalie
    ? `<tr><th>Totals</th><td></td><td></td><td>${totals.gp ?? "—"}</td><td>${totals.w ?? "—"}</td><td>${totals.l ?? "—"}</td><td>${totals.ot ?? "—"}</td><td>${totals.gaa ?? "—"}</td><td>${formatNumber(totals.svPct)}</td></tr>`
    : `<tr><th>Totals</th><td></td><td></td><td>${totals.gp ?? "—"}</td><td>${totals.g ?? "—"}</td><td>${totals.a ?? "—"}</td><td>${totals.pts ?? "—"}</td><td>${totals.pim ?? "—"}</td></tr>`;
}

function renderTournamentTable() {
  const head = document.getElementById("tournaments-head");
  const body = document.getElementById("tournaments-body");
  const entries = state.answer?.tournaments ?? [];
  const isGoalie = state.answer?.category === "goalie";

  const useGoalieColumns =
    isGoalie &&
    entries.some(
      (entry) =>
        entry.w !== undefined ||
        entry.l !== undefined ||
        entry.gaa !== undefined ||
        entry.svPct !== undefined
    );

  head.innerHTML = useGoalieColumns
    ? "<th>Year</th><th>Event</th><th>Team</th><th>GP</th><th>W</th><th>L</th><th>GAA</th><th>SV%</th>"
    : "<th>Year</th><th>Event</th><th>Team</th><th>GP</th><th>G</th><th>A</th><th>PTS</th>";

  if (!entries.length) {
    const placeholderColspan = useGoalieColumns ? 8 : 7;
    body.innerHTML = `<tr><td colspan="${placeholderColspan}" class="placeholder">No tournaments recorded.</td></tr>`;
    return;
  }

  body.innerHTML = entries
    .map((entry) =>
      useGoalieColumns
        ? `<tr><td>${entry.year ?? ""}</td><td>${entry.event ?? ""}</td><td>${entry.team ?? ""}</td><td>${entry.gp ?? "—"}</td><td>${entry.w ?? "—"}</td><td>${entry.l ?? "—"}</td><td>${entry.gaa ?? "—"}</td><td>${formatNumber(entry.svPct)}</td></tr>`
        : `<tr><td>${entry.year ?? ""}</td><td>${entry.event ?? ""}</td><td>${entry.team ?? ""}</td><td>${entry.gp ?? "—"}</td><td>${entry.g ?? "—"}</td><td>${entry.a ?? "—"}</td><td>${entry.pts ?? "—"}</td></tr>`
    )
    .join("");
}

function renderAwards() {
  const list = document.getElementById("awards-list");
  const awards = state.answer?.awards ?? [];
  if (!awards.length) {
    list.innerHTML = "<li class=placeholder>No major awards listed.</li>";
    return;
  }
  list.innerHTML = awards
    .map((award) => `<li><strong>${award.season}</strong> — ${award.name}</li>`)
    .join("");
}

function renderCareerTotals() {
  const head = document.getElementById("totals-head");
  const body = document.getElementById("totals-body");
  const isGoalie = state.answer?.category === "goalie";
  const totals = state.answer?.totals ?? {};

  head.innerHTML = isGoalie
    ? "<th>Split</th><th>GP</th><th>W</th><th>L</th><th>OT</th><th>GAA</th><th>SV%</th><th>SO</th>"
    : "<th>Split</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>PIM</th>";

  const regular = totals.regularSeason ?? {};
  const playoffs = totals.playoffs ?? {};

  body.innerHTML = isGoalie
    ? `
        <tr><td>Regular Season</td><td>${regular.gp ?? "—"}</td><td>${regular.w ?? "—"}</td><td>${regular.l ?? "—"}</td><td>${regular.ot ?? "—"}</td><td>${regular.gaa ?? "—"}</td><td>${formatNumber(regular.svPct)}</td><td>${regular.so ?? "—"}</td></tr>
        <tr><td>Playoffs</td><td>${playoffs.gp ?? "—"}</td><td>${playoffs.w ?? "—"}</td><td>${playoffs.l ?? "—"}</td><td>${playoffs.ot ?? "—"}</td><td>${playoffs.gaa ?? "—"}</td><td>${formatNumber(playoffs.svPct)}</td><td>${playoffs.so ?? "—"}</td></tr>
      `
    : `
        <tr><td>Regular Season</td><td>${regular.gp ?? "—"}</td><td>${regular.g ?? "—"}</td><td>${regular.a ?? "—"}</td><td>${regular.pts ?? "—"}</td><td>${regular.pim ?? "—"}</td></tr>
        <tr><td>Playoffs</td><td>${playoffs.gp ?? "—"}</td><td>${playoffs.g ?? "—"}</td><td>${playoffs.a ?? "—"}</td><td>${playoffs.pts ?? "—"}</td><td>${playoffs.pim ?? "—"}</td></tr>
      `;
}

function rowSkater(entry) {
  if (entry.statsUnavailable) {
    return `<tr><td>${entry.season ?? ""}</td><td>${entry.team ?? ""}</td><td>${entry.league ?? ""}</td><td colspan="5" class="placeholder">Stats unavailable</td></tr>`;
  }
  return `<tr><td>${entry.season ?? ""}</td><td>${entry.team ?? ""}</td><td>${entry.league ?? ""}</td><td>${entry.gp ?? "—"}</td><td>${entry.g ?? "—"}</td><td>${entry.a ?? "—"}</td><td>${entry.pts ?? "—"}</td><td>${entry.pim ?? "—"}</td></tr>`;
}

function rowGoalie(entry) {
  return `<tr><td>${entry.season ?? ""}</td><td>${entry.team ?? ""}</td><td>${entry.league ?? ""}</td><td>${entry.gp ?? "—"}</td><td>${entry.w ?? "—"}</td><td>${entry.l ?? "—"}</td><td>${entry.ot ?? "—"}</td><td>${entry.gaa ?? "—"}</td><td>${formatNumber(entry.svPct)}</td></tr>`;
}

function formatNumber(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "number") {
    return value % 1 === 0 ? value : value.toFixed(3);
  }
  return value;
}

function normalizePlayers(rawPlayers = []) {
  return rawPlayers
    .map((player) => normalizePlayer(player))
    .filter(Boolean);
}

function normalizePlayer(raw = {}) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const isGoalie = Array.isArray(raw.goalie_regular_season);

  return {
    name: raw.name ?? "Unknown",
    category: isGoalie ? "goalie" : "skater",
    bio: {
      position: raw.position ?? (isGoalie ? "G" : undefined),
      shoots: raw.shoots,
      born: formatBirth(raw.birth),
      birthPlace: raw.birth?.place,
      height: formatHeight(raw.size?.height_in, raw.size?.height_cm),
      weight: formatWeight(raw.size?.weight_lb, raw.size?.weight_kg),
      nationality: raw.birth?.country ?? raw.nationality,
      draft: formatDraft(raw.draft),
    },
    regularSeason: isGoalie
      ? (raw.goalie_regular_season ?? []).map((entry) => normalizeGoalieSeason(entry))
      : (raw.regular_season ?? []).map((entry) => normalizeSkaterSeason(entry)),
    playoffs: isGoalie
      ? (raw.goalie_playoffs ?? []).map((entry) => normalizeGoalieSeason(entry))
      : (raw.playoffs ?? []).map((entry) => normalizeSkaterSeason(entry)),
    tournaments: (raw.tournaments ?? []).map((entry) => normalizeTournament(entry)),
    awards: (raw.awards ?? []).map((entry) => normalizeAward(entry)),
    totals: normalizeTotals(raw.totals, isGoalie),
  };
}

function normalizeSkaterSeason(entry = {}) {
  const statsUnavailable = Boolean(entry.stats_unavailable ?? entry.statsUnavailable);
  return {
    season: entry.season ?? "",
    team: entry.team ?? "",
    league: entry.league ?? "",
    gp: statsUnavailable ? "—" : cleanValue(entry.gp),
    g: statsUnavailable ? "—" : cleanValue(entry.g),
    a: statsUnavailable ? "—" : cleanValue(entry.a),
    pts: statsUnavailable ? "—" : cleanValue(entry.pts),
    pim: statsUnavailable ? "—" : cleanValue(entry.pim),
    statsUnavailable,
  };
}

function normalizeGoalieSeason(entry = {}) {
  return {
    season: entry.season ?? "",
    team: entry.team ?? "",
    league: entry.league ?? "",
    gp: cleanValue(entry.gp),
    w: cleanValue(entry.w ?? entry.win),
    l: cleanValue(entry.l ?? entry.loss),
    ot: cleanValue(entry.ot ?? entry.overtime_losses ?? entry.t),
    gaa: cleanValue(entry.gaa),
    svPct: cleanValue(entry.svPct ?? entry.pct),
  };
}

function normalizeTournament(entry = {}) {
  return {
    year: entry.year ?? entry.season ?? "",
    event: entry.event ?? entry.tournament ?? "",
    team: entry.team ?? "",
    gp: cleanValue(entry.gp),
    g: cleanValue(entry.g),
    a: cleanValue(entry.a),
    pts: cleanValue(entry.pts),
    pim: cleanValue(entry.pim),
    w: cleanValue(entry.w),
    l: cleanValue(entry.l),
    gaa: cleanValue(entry.gaa),
    svPct: cleanValue(entry.svPct ?? entry.pct),
  };
}

function normalizeAward(entry = {}) {
  const awardName = entry.award ?? entry.name ?? "";
  const leaguePrefix = entry.league ? `${entry.league} — ` : "";
  return {
    season: entry.season ?? entry.year ?? "",
    name: `${leaguePrefix}${awardName}`.trim(),
  };
}

function normalizeTotals(rawTotals = {}, isGoalie = false) {
  if (!rawTotals || typeof rawTotals !== "object") {
    return {};
  }

  const totals = {};

  const regularKeys = ["regularSeason", "regular_season", "nhl", "overall", "career"];
  const playoffKeys = ["playoffs", "playoffs_totals", "nhl_playoffs", "playoffsOverall"];

  const regularKey = regularKeys.find((key) => rawTotals[key]);
  const playoffKey = playoffKeys.find((key) => rawTotals[key]);

  if (regularKey) {
    totals.regularSeason = isGoalie
      ? normalizeGoalieTotals(rawTotals[regularKey])
      : normalizeSkaterTotals(rawTotals[regularKey]);
  }

  if (playoffKey) {
    totals.playoffs = isGoalie
      ? normalizeGoalieTotals(rawTotals[playoffKey])
      : normalizeSkaterTotals(rawTotals[playoffKey]);
  }

  return totals;
}

function normalizeSkaterTotals(totals = {}) {
  return {
    gp: cleanValue(totals.gp),
    g: cleanValue(totals.g),
    a: cleanValue(totals.a),
    pts: cleanValue(totals.pts),
    pim: cleanValue(totals.pim),
  };
}

function normalizeGoalieTotals(totals = {}) {
  return {
    gp: cleanValue(totals.gp),
    w: cleanValue(totals.w),
    l: cleanValue(totals.l),
    ot: cleanValue(totals.ot ?? totals.overtime_losses ?? totals.t),
    gaa: cleanValue(totals.gaa),
    svPct: cleanValue(totals.svPct ?? totals.pct),
    so: cleanValue(totals.so ?? totals.shutouts),
  };
}

function formatBirth(birth = {}) {
  if (!birth || typeof birth !== "object") {
    return undefined;
  }

  const parts = [];
  if (birth.date) {
    const parsed = new Date(birth.date);
    if (!Number.isNaN(parsed.getTime())) {
      parts.push(
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(parsed)
      );
    } else {
      parts.push(birth.date);
    }
  }

  if (birth.age !== undefined && birth.age !== null) {
    parts.push(`Age ${birth.age}`);
  }

  if (!parts.length) {
    return undefined;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} (${parts.slice(1).join(", ")})`;
}

function formatHeight(heightIn, heightCm) {
  const imperial = parseHeight(heightIn);
  const metric = heightCm ? `${heightCm} cm` : undefined;

  if (imperial && metric) {
    return `${imperial} (${metric})`;
  }

  return imperial ?? metric;
}

function parseHeight(heightIn) {
  if (heightIn === undefined || heightIn === null || heightIn === "") {
    return undefined;
  }

  const [feetPart, inchPart = "0"] = String(heightIn).split(".");
  const feet = Number.parseInt(feetPart, 10);
  let inches = Number.parseInt(inchPart, 10);

  if (Number.isNaN(inches)) {
    const decimal = Number.parseFloat(`0.${inchPart}`);
    inches = Number.isNaN(decimal) ? 0 : Math.round(decimal * 12);
  }

  if (Number.isNaN(feet)) {
    return undefined;
  }

  return `${feet}'${Number.isNaN(inches) ? 0 : inches}"`;
}

function formatWeight(weightLb, weightKg) {
  const pounds =
    weightLb === undefined || weightLb === null || weightLb === ""
      ? undefined
      : `${weightLb} lbs`;
  const kilos =
    weightKg === undefined || weightKg === null || weightKg === ""
      ? undefined
      : `${weightKg} kg`;

  if (pounds && kilos) {
    return `${pounds} (${kilos})`;
  }

  return pounds ?? kilos;
}

function formatDraft(draft = {}) {
  if (!draft || typeof draft !== "object" || !draft.team) {
    return undefined;
  }

  const details = [];
  if (draft.round !== undefined && draft.round !== null) {
    details.push(`Round ${draft.round}`);
  }
  if (draft.overall !== undefined && draft.overall !== null) {
    details.push(`#${draft.overall} overall`);
  }

  const detailSegment = details.length ? ` (${details.join(", ")})` : "";
  const yearSegment = draft.year ? `, ${draft.year}` : "";

  return `${draft.team}${detailSegment}${yearSegment}`;
}

function cleanValue(value) {
  return value === undefined || value === null ? undefined : value;
}

window.addEventListener("DOMContentLoaded", init);

function handleGuess() {
  if (!state.answer) return;
  const guess = guessInput.value.trim();
  if (!guess) return;

  if (guess.toLowerCase() === state.answer.name.toLowerCase()) {
    setFeedback(`Correct! The mystery player is ${state.answer.name}.`, "success");
    concludeRound(true);
  } else {
    setFeedback(`${guess} is not the mystery player. Keep digging!`, "error");
  }
}

function concludeRound(won) {
  guessInput.disabled = true;
  document.querySelectorAll(".reveal-button").forEach((button) => {
    button.disabled = true;
  });
  nextRoundBtn.disabled = false;
  nextRoundBtn.textContent = "Play Again";
  state.concluded = true;

  state.stats.rounds += 1;
  if (won) {
    state.stats.wins += 1;
    state.stats.currentStreak += 1;
    state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
    revealAll();
  } else {
    state.stats.currentStreak = 0;
  }
  updateStatsCard();
}

function revealAll() {
  [
    { section: "regularSeason", renderer: () => renderStatTable("regularSeason", state.answer.regularSeason) },
    { section: "playoffs", renderer: () => renderStatTable("playoffs", state.answer.playoffs) },
    { section: "tournaments", renderer: renderTournamentTable },
    { section: "awards", renderer: renderAwards },
    { section: "totals", renderer: renderCareerTotals },
    { section: "identity", renderer: revealIdentity },
  ].forEach(({ section, renderer }) => {
    if (!state.revealed[section]) {
      renderer();
      state.revealed[section] = true;
    }
  });
}

function revealIdentity() {
  const identityText = document.getElementById("identity-reveal");
  identityText.textContent = state.answer?.name ?? "Unknown";
}

function setFeedback(message, type) {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback${type ? ` feedback--${type}` : ""}`;
}

function updateStatsCard() {
  document.getElementById("stat-rounds").textContent = state.stats.rounds;
  document.getElementById("stat-wins").textContent = state.stats.wins;
  document.getElementById("stat-current-streak").textContent = state.stats.currentStreak;
  document.getElementById("stat-best-streak").textContent = state.stats.bestStreak;
}

function disableAllInteractions() {
  guessInput.disabled = true;
  guessForm.querySelector("button[type='submit']").disabled = true;
  nextRoundBtn.disabled = true;
  document.querySelectorAll(".reveal-button").forEach((button) => {
    button.disabled = true;
  });
}

