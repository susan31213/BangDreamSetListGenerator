// fetch songs.csv and populate table (called on modal open)
let songs = [];
let selected = [];
let csvLoaded = false;

function loadCSV() {
    if (csvLoaded) return;
    // add a cache-busting query parameter so pages never serve a stale file
    const csvUrl = '../songs.csv?v=' + Date.now();
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            songs = results.data;
            populateBandFilter();
            populateCategoryFilter();
            renderTable();
            csvLoaded = true;
        }
    });
}

function openSelector() {
    const modal = document.getElementById('songModal');
    modal.style.display = 'block';
    loadCSV();
}

function closeSelector() {
    const modal = document.getElementById('songModal');
    modal.style.display = 'none';
}

function populateBandFilter() {
    const bands = [...new Set(songs.map(s => s.band))].sort();
    const sel = document.getElementById('bandFilter');
    bands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        sel.appendChild(opt);
    });
    sel.addEventListener('change', renderTable);
}

function populateCategoryFilter() {
    const cats = [...new Set(songs.map(s => s.category))].sort();
    const sel = document.getElementById('categoryFilter');
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
    });
    sel.addEventListener('change', renderTable);
}

function renderTable() {
    const tbody = document.querySelector('#songTable tbody');
    tbody.innerHTML = '';
    const bandFilter = document.getElementById('bandFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    songs.forEach((s,i) => {
        if (bandFilter && s.band !== bandFilter) return;
        if (categoryFilter && s.category !== categoryFilter) return;
        const tr = document.createElement('tr');
        const button = document.createElement('button');
        const already = selected.find(s => s.id === i);
        button.textContent = already ? '−' : '+';
        // apply green/red styling classes
        if (already) {
            button.classList.add('minus-btn');
        } else {
            button.classList.add('plus-btn');
        }
        button.addEventListener('click', () => {
            toggleSelection(i);
            ensureSelectionUI();
            // re-render table so all buttons update state
            renderTable();
        });
        const td0 = document.createElement('td'); td0.appendChild(button);
        tr.appendChild(td0);

        // create card cell
        const tdCard = document.createElement('td');
        tdCard.colSpan = 3;
        const card = document.createElement('div');
        card.className = 'card';
        // left color bar indicating band
        const colorBar = document.createElement('div');
        colorBar.style.width = '8px';
        colorBar.style.height = '48px';
        colorBar.style.borderRadius = '4px';
        colorBar.style.flex = '0 0 8px';
        colorBar.style.background = bandColor(s.band);
        card.appendChild(colorBar);
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = `<div style="font-weight:700">${escapeHtml(s.title)}</div><div style="font-size:12px;color:#666">${escapeHtml(s.artist)}</div>`;
        card.appendChild(meta);
        // youtube button inside card
        const yt2 = document.createElement('button');
        yt2.textContent = 'YouTube';
        yt2.className = 'yt-btn';
        yt2.style.marginLeft = 'auto';
        yt2.addEventListener('click', () => {
            const query = `${s.title} ${s.artist}`;
            const q = encodeURIComponent(query);
            window.open('https://www.youtube.com/results?search_query=' + q, '_blank');
        });
        card.appendChild(yt2);
        tdCard.appendChild(card);
        tr.appendChild(tdCard);
        tbody.appendChild(tr);
    });
}

// generate a color from band string
function bandColor(name) {
    const colors = {
        "poppinparty": '#FF3377',
        "afterglow": '#EE3344',
        "pastel-palettes": '#33DDAA',
        "roselia": '#3344AA',
        "hello-happy-world": '#FFDD00',
        "morfonica": '#33AAFF',
        "raise-a-suilen": '#22CCCC',
        "mygo": '#3388BB',
        "ave-mujica": '#881144',
    };
    if (colors[name]) return colors[name];
    else return '#888';
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toggleSelection(idx) {
    const song = songs[idx];
    const id = idx;
    const existing = selected.find(s => s.id === id);
    if (existing) {
        selected = selected.filter(s => s.id !== id);
    } else {
        selected.push({id, title: song.title, artist: song.artist, band: song.band});
    }
    renderSelected();
}

function ensureSelectionUI() {
    let container = document.getElementById('selectionContainer');
    if (!container) {
        const placeholder = document.getElementById('selectionPlaceholder');
        container = document.createElement('div');
        container.id = 'selectionContainer';
        // live title input
        const count = document.createElement('div');
        count.id = 'selectionCount';
        count.style.marginBottom = '8px';
        container.appendChild(count);
        const ul = document.createElement('ul');
        ul.id = 'selectedList';
        container.appendChild(ul);
        placeholder.replaceWith(container);
            const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) copyBtn.style.display = 'inline-block';
    }
}

function renderSelected() {
    ensureSelectionUI();
    const ul = document.getElementById('selectedList');
    ul.innerHTML = '';
    selected.forEach((s, idx) => {
        const li = document.createElement('li');
        // remove button
        const textSpan = document.createElement('span');
        textSpan.className = 'song-text';
        textSpan.textContent = `${idx + 1}. ${s.title} (${s.artist})`;
        li.appendChild(textSpan);

        const yt = document.createElement('button');
        yt.textContent = 'YouTube';
        yt.className = 'yt-btn';
        yt.style.marginLeft = '8px';
        yt.addEventListener('click', () => {
            // include both title and artist in the search query
            const query = `${s.title} ${s.artist}`;
            const q = encodeURIComponent(query);
            window.open('https://www.youtube.com/results?search_query=' + q, '_blank');
        });
        li.appendChild(yt);

        const rem = document.createElement('button');
        rem.textContent = '×';
        rem.className = 'remove-btn';
        rem.style.marginLeft = '4px';
        rem.addEventListener('click', () => {
            selected = selected.filter(item => item.id !== s.id);
            renderSelected();
        });
        li.appendChild(rem);
        ul.appendChild(li);
    });
    // update count display if needed
    const countEl = document.getElementById('selectionCount');
    if (countEl) {
        countEl.textContent = `${selected.length} 曲`;    }
}

function copyToClipboard() {
    // build text from live title and selected songs
    let lines = [];
    const titleInput = document.getElementById('liveTitle');
    if (titleInput && titleInput.value.trim()) {
        lines.push(titleInput.value.trim());
        lines.push('');
    }
    selected.forEach((s, idx) => {
        lines.push(`${idx+1}. ${s.title} (${s.artist})`);
    });
    const text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback();
        });
    } else {
        // fallback using textarea
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopyFeedback();
    }
}

function showCopyFeedback() {
    const btn = document.getElementById('copyBtn');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
}

const copyBtnEl = document.getElementById('copyBtn');
if (copyBtnEl) copyBtnEl.addEventListener('click', copyToClipboard);

// hook up open/close buttons
document.getElementById('openSelectorBtn').addEventListener('click', openSelector);
const closeSpan = document.querySelector('#songModal .close');
if (closeSpan) closeSpan.addEventListener('click', closeSelector);

// hide modal when clicking outside content
window.addEventListener('click', function(event) {
    const modal = document.getElementById('songModal');
    if (event.target === modal) {
        closeSelector();
    }
});