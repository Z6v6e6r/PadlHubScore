const state = {
  tournaments: [],
  activeTournamentId: localStorage.getItem('padlhub.activeTournamentId') || '',
  teams: [],
  courts: [],
  referees: [],
  matches: [],
  overview: null,
  stream: null,
  refreshTimer: null
};

const els = {
  tournamentSelect: document.getElementById('tournamentSelect'),
  refreshTournamentBtn: document.getElementById('refreshTournamentBtn'),
  liveState: document.getElementById('liveState'),
  overviewGrid: document.getElementById('overviewGrid'),
  teamsTable: document.getElementById('teamsTable'),
  courtsTable: document.getElementById('courtsTable'),
  refereesTable: document.getElementById('refereesTable'),
  matchesTable: document.getElementById('matchesTable'),
  eventsBox: document.getElementById('eventsBox'),
  refereeSecrets: document.getElementById('refereeSecrets'),
  toast: document.getElementById('toast'),
  forms: {
    tournament: document.getElementById('createTournamentForm'),
    team: document.getElementById('createTeamForm'),
    court: document.getElementById('createCourtForm'),
    referee: document.getElementById('createRefereeForm'),
    match: document.getElementById('createMatchForm')
  },
  matchSelects: {
    team1: document.getElementById('matchTeam1'),
    team2: document.getElementById('matchTeam2'),
    court: document.getElementById('matchCourt'),
    referee: document.getElementById('matchReferee')
  }
};

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  els.toast.style.background = isError ? '#7f1d1d' : '#0f1724';

  setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.message || detail;
    } catch {
      // ignore body parse errors
    }
    throw new Error(detail);
  }

  return res.json();
}

function toIsoFromLocal(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('ru-RU');
}

function currentGameLabel(scoreState) {
  if (!scoreState || !scoreState.currentGame) {
    return '—';
  }

  const p1 = scoreState.currentGame.team1Points || 0;
  const p2 = scoreState.currentGame.team2Points || 0;

  const map = ['0', '15', '30', '40'];

  if (p1 >= 3 && p2 >= 3) {
    const diff = p1 - p2;
    if (diff === 0) {
      return '40 : 40';
    }
    const step = Math.min(2, Math.abs(diff));
    if (diff > 0) {
      return `БОЛЬШЕ ${step} : МЕНЬШЕ ${step}`;
    }
    return `МЕНЬШЕ ${step} : БОЛЬШЕ ${step}`;
  }

  return `${map[Math.min(3, p1)]} : ${map[Math.min(3, p2)]}`;
}

function setsLabel(scoreState) {
  if (!scoreState?.sets?.length) {
    return '—';
  }

  return scoreState.sets
    .map((set) => `${set.team1Games ?? 0}:${set.team2Games ?? 0}`)
    .join(' | ');
}

function optionListHtml(items, labelFn, includeEmpty = true) {
  const rows = [];
  if (includeEmpty) {
    rows.push('<option value="">—</option>');
  }
  for (const item of items) {
    rows.push(`<option value="${escapeHtml(item._id)}">${escapeHtml(labelFn(item))}</option>`);
  }
  return rows.join('');
}

function renderTournamentSelect() {
  els.tournamentSelect.innerHTML = optionListHtml(
    state.tournaments,
    (t) => `${t.name} (${new Date(t.createdAt).toLocaleDateString('ru-RU')})`,
    false
  );

  if (!state.tournaments.length) {
    state.activeTournamentId = '';
    localStorage.removeItem('padlhub.activeTournamentId');
    els.tournamentSelect.innerHTML = '<option value="">Турниров пока нет</option>';
    return;
  }

  if (!state.activeTournamentId || !state.tournaments.some((t) => t._id === state.activeTournamentId)) {
    state.activeTournamentId = state.tournaments[0]._id;
  }

  els.tournamentSelect.value = state.activeTournamentId;
  localStorage.setItem('padlhub.activeTournamentId', state.activeTournamentId);
}

function renderOverview() {
  const overview = state.overview;
  if (!overview) {
    els.overviewGrid.innerHTML = '<div class="muted">Выберите турнир.</div>';
    return;
  }

  const metrics = [
    ['Пары', overview.teams],
    ['Матчи', overview.matches],
    ['Активные', overview.activeMatches],
    ['Завершены', overview.finishedMatches],
    ['Ожидают', overview.waitingMatches],
    ['Корты', overview.courts],
    ['Свободные корты', overview.freeCourts],
    ['Судьи онлайн', overview.refereesOnline]
  ];

  els.overviewGrid.innerHTML = metrics
    .map(
      ([label, value]) =>
        `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div></div>`
    )
    .join('');
}

function renderTeams() {
  if (!state.teams.length) {
    els.teamsTable.innerHTML = '<tr><td colspan="4" class="muted">Нет пар</td></tr>';
  } else {
    els.teamsTable.innerHTML = state.teams
      .map(
        (team) => `<tr>
          <td>${escapeHtml(team.displayName || `${team.player1Name}/${team.player2Name}`)}</td>
          <td>${escapeHtml(team.player1Name)} / ${escapeHtml(team.player2Name)}</td>
          <td>${escapeHtml(team.seed || '—')}</td>
          <td>${escapeHtml(team.status)}</td>
        </tr>`
      )
      .join('');
  }

  const teamOptions = optionListHtml(
    state.teams,
    (team) => team.displayName || `${team.player1Name}/${team.player2Name}`
  );

  els.matchSelects.team1.innerHTML = teamOptions;
  els.matchSelects.team2.innerHTML = teamOptions;
}

function renderCourts() {
  if (!state.courts.length) {
    els.courtsTable.innerHTML = '<tr><td colspan="4" class="muted">Нет кортов</td></tr>';
  } else {
    els.courtsTable.innerHTML = state.courts
      .map(
        (court) => `<tr>
          <td>${escapeHtml(court.number)}</td>
          <td>${escapeHtml(court.name)}</td>
          <td>${escapeHtml(court.stationName || '—')}</td>
          <td>${escapeHtml(court.status)}</td>
        </tr>`
      )
      .join('');
  }

  els.matchSelects.court.innerHTML = optionListHtml(
    state.courts,
    (court) => `${court.number}. ${court.name}`
  );
}

function renderReferees() {
  if (!state.referees.length) {
    els.refereesTable.innerHTML = '<tr><td colspan="4" class="muted">Нет судей</td></tr>';
  } else {
    els.refereesTable.innerHTML = state.referees
      .map(
        (ref) => `<tr>
          <td>${escapeHtml(ref.name)}</td>
          <td>${escapeHtml(ref.login || '—')}</td>
          <td>${escapeHtml(ref.status)}</td>
          <td>${escapeHtml(formatDate(ref.lastSeenAt))}</td>
        </tr>`
      )
      .join('');
  }

  els.matchSelects.referee.innerHTML = optionListHtml(state.referees, (ref) => ref.name);
}

function renderMatches() {
  if (!state.matches.length) {
    els.matchesTable.innerHTML = '<tr><td colspan="7" class="muted">Нет матчей</td></tr>';
    return;
  }

  els.matchesTable.innerHTML = state.matches
    .map(
      (match) => `<tr>
        <td>${escapeHtml(match.matchNumber)}</td>
        <td>${escapeHtml(match.round)}</td>
        <td>${escapeHtml(match.status)}</td>
        <td>${escapeHtml(setsLabel(match.scoreState))}</td>
        <td>${escapeHtml(currentGameLabel(match.scoreState))}</td>
        <td>${escapeHtml(match.currentServingSide || '—')}</td>
        <td><button class="btn ghost small" data-match-events="${escapeHtml(match._id)}">События</button></td>
      </tr>`
    )
    .join('');
}

function renderAll() {
  renderTournamentSelect();
  renderOverview();
  renderTeams();
  renderCourts();
  renderReferees();
  renderMatches();
}

async function loadTournaments() {
  state.tournaments = await api('/api/admin/tournaments');
  renderTournamentSelect();
}

async function loadTournamentData({ silent = false } = {}) {
  if (!state.activeTournamentId) {
    state.overview = null;
    state.teams = [];
    state.courts = [];
    state.referees = [];
    state.matches = [];
    renderAll();
    return;
  }

  try {
    const [overview, teams, courts, referees, matches] = await Promise.all([
      api(`/api/admin/tournaments/${state.activeTournamentId}/overview`),
      api(`/api/admin/tournaments/${state.activeTournamentId}/teams`),
      api(`/api/admin/tournaments/${state.activeTournamentId}/courts`),
      api(`/api/admin/tournaments/${state.activeTournamentId}/referees`),
      api(`/api/admin/tournaments/${state.activeTournamentId}/matches`)
    ]);

    state.overview = overview;
    state.teams = teams;
    state.courts = courts;
    state.referees = referees;
    state.matches = matches;

    renderAll();
  } catch (error) {
    if (!silent) {
      showToast(error.message, true);
    }
  }
}

function setLiveState(connected) {
  els.liveState.classList.toggle('connected', connected);
  els.liveState.classList.toggle('disconnected', !connected);
  els.liveState.textContent = connected ? 'SSE: on' : 'SSE: off';
}

function scheduleLiveRefresh() {
  if (state.refreshTimer) {
    return;
  }

  state.refreshTimer = setTimeout(async () => {
    state.refreshTimer = null;
    await loadTournamentData({ silent: true });
  }, 280);
}

function connectTournamentStream() {
  if (state.stream) {
    state.stream.close();
    state.stream = null;
  }

  if (!state.activeTournamentId) {
    setLiveState(false);
    return;
  }

  const source = new EventSource(`/api/stream/tournament/${state.activeTournamentId}`);
  source.addEventListener('connected', () => setLiveState(true));
  source.addEventListener('MATCH_UPDATED', () => scheduleLiveRefresh());
  source.onerror = () => setLiveState(false);

  state.stream = source;
}

async function handleCreateTournament(event) {
  event.preventDefault();

  const form = new FormData(els.forms.tournament);
  const body = {
    name: String(form.get('name') || '').trim(),
    startsAt: toIsoFromLocal(String(form.get('startsAt') || '').trim())
  };

  const created = await api('/api/admin/tournaments', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  showToast(`Турнир создан: ${created.name}`);
  els.forms.tournament.reset();

  await loadTournaments();
  state.activeTournamentId = created._id;
  renderTournamentSelect();
  await loadTournamentData();
  connectTournamentStream();
}

function requireActiveTournament() {
  if (!state.activeTournamentId) {
    throw new Error('Сначала создайте или выберите турнир');
  }
}

async function handleCreateTeam(event) {
  event.preventDefault();
  requireActiveTournament();

  const form = new FormData(els.forms.team);
  const seedRaw = String(form.get('seed') || '').trim();

  const body = {
    player1Name: String(form.get('player1Name') || '').trim(),
    player2Name: String(form.get('player2Name') || '').trim(),
    displayName: String(form.get('displayName') || '').trim() || undefined,
    seed: seedRaw ? Number(seedRaw) : undefined
  };

  await api(`/api/admin/tournaments/${state.activeTournamentId}/teams`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  showToast('Пара добавлена');
  els.forms.team.reset();
  await loadTournamentData();
}

async function handleCreateCourt(event) {
  event.preventDefault();
  requireActiveTournament();

  const form = new FormData(els.forms.court);
  const body = {
    name: String(form.get('name') || '').trim(),
    number: Number(form.get('number')),
    stationName: String(form.get('stationName') || '').trim() || undefined
  };

  await api(`/api/admin/tournaments/${state.activeTournamentId}/courts`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  showToast('Корт добавлен');
  els.forms.court.reset();
  await loadTournamentData();
}

async function handleCreateReferee(event) {
  event.preventDefault();
  requireActiveTournament();

  const form = new FormData(els.forms.referee);
  const body = {
    name: String(form.get('name') || '').trim(),
    login: String(form.get('login') || '').trim() || undefined,
    pin: String(form.get('pin') || '').trim() || undefined
  };

  const created = await api(`/api/admin/tournaments/${state.activeTournamentId}/referees`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  els.forms.referee.reset();
  els.refereeSecrets.innerHTML = `
    <strong>Судья создан:</strong><br>
    Ссылка: <code>/r/${escapeHtml(created.accessToken)}</code><br>
    PIN: <code>${escapeHtml(created.pin)}</code>
  `;

  showToast('Судья добавлен');
  await loadTournamentData();
}

async function handleCreateMatch(event) {
  event.preventDefault();
  requireActiveTournament();

  const form = new FormData(els.forms.match);
  const body = {
    round: String(form.get('round') || '').trim(),
    matchNumber: Number(form.get('matchNumber')),
    team1Id: String(form.get('team1Id') || '').trim() || undefined,
    team2Id: String(form.get('team2Id') || '').trim() || undefined,
    courtId: String(form.get('courtId') || '').trim() || undefined,
    refereeId: String(form.get('refereeId') || '').trim() || undefined
  };

  await api(`/api/admin/tournaments/${state.activeTournamentId}/matches`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  showToast('Матч создан');
  els.forms.match.reset();
  await loadTournamentData();
}

async function loadMatchEvents(matchId) {
  const events = await api(`/api/admin/matches/${matchId}/events`);

  if (!events.length) {
    els.eventsBox.textContent = 'Событий пока нет.';
    return;
  }

  els.eventsBox.innerHTML = events
    .map(
      (event) => `<article class="event-item">
        <strong>${escapeHtml(event.action)}</strong> <span class="muted">${escapeHtml(
          formatDate(event.createdAt)
        )}</span><br>
        <span class="small">${escapeHtml(event.actorType)}: ${escapeHtml(event.actorId)}</span>
      </article>`
    )
    .join('');
}

function bindEvents() {
  els.forms.tournament.addEventListener('submit', (event) => {
    handleCreateTournament(event).catch((error) => showToast(error.message, true));
  });

  els.forms.team.addEventListener('submit', (event) => {
    handleCreateTeam(event).catch((error) => showToast(error.message, true));
  });

  els.forms.court.addEventListener('submit', (event) => {
    handleCreateCourt(event).catch((error) => showToast(error.message, true));
  });

  els.forms.referee.addEventListener('submit', (event) => {
    handleCreateReferee(event).catch((error) => showToast(error.message, true));
  });

  els.forms.match.addEventListener('submit', (event) => {
    handleCreateMatch(event).catch((error) => showToast(error.message, true));
  });

  els.refreshTournamentBtn.addEventListener('click', () => {
    loadTournamentData().catch((error) => showToast(error.message, true));
  });

  els.tournamentSelect.addEventListener('change', () => {
    state.activeTournamentId = els.tournamentSelect.value;
    if (state.activeTournamentId) {
      localStorage.setItem('padlhub.activeTournamentId', state.activeTournamentId);
    } else {
      localStorage.removeItem('padlhub.activeTournamentId');
    }

    loadTournamentData()
      .then(() => connectTournamentStream())
      .catch((error) => showToast(error.message, true));
  });

  els.matchesTable.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest('button[data-match-events]');
    if (!button) {
      return;
    }

    const matchId = button.getAttribute('data-match-events');
    if (!matchId) {
      return;
    }

    loadMatchEvents(matchId).catch((error) => showToast(error.message, true));
  });
}

async function init() {
  bindEvents();

  try {
    await loadTournaments();
    await loadTournamentData();
    connectTournamentStream();
  } catch (error) {
    showToast(error.message, true);
  }
}

init();
