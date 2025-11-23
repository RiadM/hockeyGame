// TableRenderer - Handles stats table population and column revealing
// Creates table rows, manages visibility of team/playoff columns

export class TableRenderer {
    constructor(elements) {
        this.statsBody = elements.statsBody;

        if (!this.statsBody) {
            throw new Error('Stats table body element missing');
        }

        // Store reference to parent table for scoped queries
        this.table = this.statsBody.closest('.stats-table') || this.statsBody.parentElement;
    }

    // Populate table with player season stats
    populateTable(player) {
        if (!player || !player.seasons) return;

        const allSeasons = player.seasons.sort((a, b) => a.season.localeCompare(b.season));
        const fragment = document.createDocumentFragment();

        allSeasons.forEach(season => {
            fragment.appendChild(this.createStatsRow(season));
        });

        this.statsBody.innerHTML = '';
        this.statsBody.appendChild(fragment);
    }

    // Create single stats table row
    createStatsRow(season) {
        const row = document.createElement('tr');
        const plusMinus = season.plus_minus !== null && season.plus_minus !== undefined
            ? season.plus_minus : '--';

        // League-based row styling
        if (season.league === 'NHL') {
            row.classList.add('nhl-row');
        } else {
            row.classList.add('junior-row');
        }

        const cells = [
            { value: season.season, className: '' },
            { value: season.league, className: 'league-col' },
            { value: season.team, className: 'team-col hidden' },
            { value: season.gp, className: '' },
            { value: season.g, className: '' },
            { value: season.a, className: '' },
            { value: season.pts, className: '' },
            { value: season.pim, className: '' },
            { value: plusMinus, className: '' },
            { value: season.playoff_gp || '--', className: 'playoff-col hidden' },
            { value: season.playoff_g || '--', className: 'playoff-col hidden' },
            { value: season.playoff_a || '--', className: 'playoff-col hidden' },
            { value: season.playoff_pts || '--', className: 'playoff-col hidden' },
            { value: season.playoff_pim || '--', className: 'playoff-col hidden' }
        ];

        cells.forEach(({ value, className }) => {
            const cell = document.createElement('td');
            cell.textContent = value;
            if (className) cell.className = className;
            row.appendChild(cell);
        });

        return row;
    }

    // Reveal playoff columns
    revealPlayoffs() {
        if (!this.table) return;

        const playoffHeaders = this.table.querySelectorAll('.playoffs');
        playoffHeaders.forEach(header => {
            header.classList.remove('hidden');
            header.classList.add('reveal-animation');
        });

        const playoffCols = this.table.querySelectorAll('.playoff-col');
        playoffCols.forEach(col => {
            col.classList.remove('hidden');
            col.classList.add('reveal-animation');
        });
    }

    // Reveal team column
    revealTeam() {
        if (!this.table) return;

        const teamHeaders = this.table.querySelectorAll('.team-col');
        teamHeaders.forEach(header => {
            header.classList.remove('hidden');
            header.classList.add('reveal-animation');
        });
    }

    // Reveal all hidden columns
    revealAllColumns() {
        this.revealPlayoffs();
        this.revealTeam();
    }

    // Hide all columns (for new round)
    hideAllColumns() {
        if (!this.table) return;

        this.table.querySelectorAll('.team-col, .playoffs, .playoff-col').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('reveal-animation');
        });
    }

    // Clear table
    clearTable() {
        this.statsBody.innerHTML = '';
    }
}
