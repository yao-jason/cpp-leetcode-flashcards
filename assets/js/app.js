// ── Progress persistence (localStorage) ────────────────────────────────────

const STORAGE_KEY = 'flashcard-progress';

/** @returns {Set<string>} Set of read topic names */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/** @param {Set<string>} readSet */
function saveProgress(readSet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...readSet]));
}

const readSet = loadProgress();

// ── Main application ────────────────────────────────────────────────────────

fetch('data.json')
  .then(res => res.json())
  .then(data => {
    const patternTabs  = document.getElementById('pattern-tabs');
    const grid         = document.getElementById('card-grid');
    const searchInput  = document.getElementById('pattern-search');
    const progressFill = document.getElementById('progress-bar-fill');
    const progressCount= document.getElementById('progress-count');
    const progressTotal= document.getElementById('progress-total');
    const continueBtn  = document.getElementById('continue-btn');
    const markAllBtn   = document.getElementById('mark-all-btn');
    const sidebarToggle= document.getElementById('sidebar-toggle');
    const sidebar      = document.getElementById('sidebar');
    const overlay      = document.getElementById('sidebar-overlay');

    const allTopics = Object.keys(data);
    progressTotal.textContent = allTopics.length;

    const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };

    // ── 0. Sidebar toggle ────────────────────────────────────────────────────

    function setSidebarCollapsed(collapsed) {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
      try { localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0'); } catch {}
    }

    // Restore collapsed state
    // On mobile (≤768px): default closed; on desktop: restore from localStorage
    try {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const stored   = localStorage.getItem('sidebar-collapsed');
      const shouldCollapse = isMobile
        ? (stored !== '0')        // mobile: collapsed unless user explicitly opened it
        : (stored === '1');       // desktop: collapsed only if user collapsed it
      if (shouldCollapse) {
        document.body.classList.add('sidebar-collapsed');
        sidebarToggle.setAttribute('aria-expanded', 'false');
      }
    } catch {}

    sidebarToggle.addEventListener('click', () => {
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      setSidebarCollapsed(!isCollapsed);
    });

    // Click overlay to close sidebar (mobile / small screens)
    overlay.addEventListener('click', () => setSidebarCollapsed(true));

    // ── Universal action bar (always visible at bottom) ──────────────────────
    const floatingNav = document.createElement('div');
    floatingNav.id = 'floating-nav';
    floatingNav.setAttribute('aria-label', 'Card navigation');
    floatingNav.innerHTML = `
      <button id="floating-prev" class="floating-nav-btn" aria-label="Previous card" title="Previous card [\u2190]">&#8592;</button>
      <button id="floating-mark-read" class="floating-mark-btn" aria-pressed="false" title="Toggle read status [Space]">&#9675; Mark as Read</button>
      <button id="floating-next" class="floating-nav-btn" aria-label="Next card" title="Next card [\u2192]">&#8594;</button>
    `;
    document.body.appendChild(floatingNav);

    floatingNav.querySelector('#floating-prev').addEventListener('click', () => navigateCard(-1));
    floatingNav.querySelector('#floating-next').addEventListener('click', () => navigateCard(1));
    floatingNav.querySelector('#floating-mark-read').addEventListener('click', () => {
      if (!currentTopic) return;
      const nowRead = !readSet.has(currentTopic);
      setRead(currentTopic, nowRead);
      syncFloatingMarkRead(nowRead);
    });

    function syncFloatingMarkRead(isRead) {
      const btn = floatingNav.querySelector('#floating-mark-read');
      if (!btn) return;
      btn.classList.toggle('read', isRead);
      btn.setAttribute('aria-pressed', String(isRead));
      btn.innerHTML = isRead ? '&#10003; Read' : '&#9675; Mark as Read';
    }

    // Sync disabled state of prev/next and mark-read text in floating bar
    function updateFloatingNav() {
      if (!currentTopic) return;
      const topics = allButtons.map(b => b.topic);
      const idx = topics.indexOf(currentTopic);
      const prevBtn = floatingNav.querySelector('#floating-prev');
      const nextBtn = floatingNav.querySelector('#floating-next');
      if (prevBtn) prevBtn.disabled = idx <= 0;
      if (nextBtn) nextBtn.disabled = idx >= topics.length - 1;
      syncFloatingMarkRead(readSet.has(currentTopic));
    }

    // ── 1. Group patterns by category ────────────────────────────────────────
    const categoryMap = {};
    Object.keys(data).forEach(topic => {
      const cat = data[topic].category || 'Other';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(topic);
    });

    // Canonical display order for categories
    const CATEGORY_ORDER = [
      'Array', 'Stack', 'Heap', 'Linked List', 'Tree',
      'Backtracking', 'Graph', 'Greedy', 'DP',
      'Math', 'String', 'Advanced DS', 'Design'
    ];
    const CATEGORY_ICONS = {
      'Array':       '📦',
      'Stack':       '📚',
      'Heap':        '⛰️',
      'Linked List': '🔗',
      'Tree':        '🌳',
      'Backtracking':'🔄',
      'Graph':       '🕸️',
      'Greedy':      '⚡',
      'DP':          '🧮',
      'Math':        '🔢',
      'String':      '📝',
      'Advanced DS': '🏗️',
      'Design':      '🎨',
      'Other':       '📌'
    };

    // Build ordered list of categories that actually have patterns
    const orderedCategories = [
      ...CATEGORY_ORDER.filter(c => categoryMap[c]),
      ...Object.keys(categoryMap).filter(c => !CATEGORY_ORDER.includes(c))
    ];

    // ── 2. Build sidebar with category groups ────────────────────────────────
    let activeBtn = null;
    const allButtons = []; // [{btn, topic}]

    // Map: topic → its read-dot span (for quick updates)
    const topicReadDot = {};
    // Map: category → { el: catProgressEl, topics: [...] }
    const catProgressMap = {};

    orderedCategories.forEach(cat => {
      const patterns = categoryMap[cat];
      if (!patterns || patterns.length === 0) return;

      const group = document.createElement('div');
      group.className = 'category-group';
      group.dataset.category = cat;

      // Category header (clickable toggle)
      const catProgressSpan = document.createElement('span');
      catProgressSpan.className = 'cat-progress';
      catProgressMap[cat] = { el: catProgressSpan, topics: patterns };

      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <span class="cat-icon">${CATEGORY_ICONS[cat] || '📌'}</span>
        <span class="cat-name">${cat}</span>
        <span class="cat-toggle">▾</span>
      `;
      // Insert progress span before the toggle
      header.insertBefore(catProgressSpan, header.querySelector('.cat-toggle'));

      header.addEventListener('click', () => {
        const isCollapsed = group.classList.toggle('collapsed');
        header.querySelector('.cat-toggle').textContent = isCollapsed ? '▸' : '▾';
      });

      // Buttons container
      const btnWrap = document.createElement('div');
      btnWrap.className = 'category-buttons';

      patterns.forEach(topic => {
        const btn = document.createElement('button');
        btn.dataset.topic    = topic;
        btn.dataset.category = cat;

        // Label
        const labelSpan = document.createElement('span');
        labelSpan.className = 'btn-label';
        labelSpan.textContent = topic;

        // Read dot (checkmark)
        const readDot = document.createElement('span');
        readDot.className = 'btn-read-dot';
        readDot.innerHTML = '✓';
        readDot.style.display = readSet.has(topic) ? 'inline' : 'none';
        topicReadDot[topic] = readDot;

        btn.appendChild(labelSpan);
        btn.appendChild(readDot);

        if (readSet.has(topic)) btn.classList.add('is-read');

        btn.addEventListener('click', () => {
          if (activeBtn) activeBtn.classList.remove('active');
          btn.classList.add('active');
          activeBtn = btn;
          renderFlashcard(topic, data[topic]);
        });

        btnWrap.appendChild(btn);
        allButtons.push({ btn, topic });
      });

      group.appendChild(header);
      group.appendChild(btnWrap);
      patternTabs.appendChild(group);
    });

    // ── 3. Progress helpers ──────────────────────────────────────────────────

    /** Update all progress UI elements */
    function updateProgress() {
      const count = readSet.size;
      const total = allTopics.length;
      const pct   = total > 0 ? (count / total) * 100 : 0;

      progressCount.textContent = count;
      progressFill.style.width  = pct + '%';

      // Color the bar based on completion
      if (pct >= 100) progressFill.className = 'progress-bar-fill complete';
      else if (pct >= 50) progressFill.className = 'progress-bar-fill halfway';
      else progressFill.className = 'progress-bar-fill';

      // Per-category progress
      Object.entries(catProgressMap).forEach(([cat, { el, topics }]) => {
        const readCount = topics.filter(t => readSet.has(t)).length;
        el.textContent = `${readCount}/${topics.length}`;
        el.className = 'cat-progress' + (readCount === topics.length ? ' complete' : '');
      });

      // Continue button visibility (use visibility to avoid layout shift)
      const hasUnread = allTopics.some(t => !readSet.has(t));
      continueBtn.style.visibility = hasUnread ? 'visible' : 'hidden';

      // Mark-all button label: if everything is read → offer reset; else → offer mark all
      const allRead = readSet.size === allTopics.length;
      markAllBtn.textContent = allRead ? '↺ Reset All' : 'Mark All Read';
      markAllBtn.classList.toggle('is-reset', allRead);
    }

    /** Mark a topic as read/unread, persist, and refresh UI */
    function setRead(topic, isRead) {
      if (isRead) readSet.add(topic);
      else readSet.delete(topic);
      saveProgress(readSet);

      // Update sidebar button
      const readDot = topicReadDot[topic];
      if (readDot) readDot.style.display = isRead ? 'inline' : 'none';
      const sidebarBtn = allButtons.find(b => b.topic === topic)?.btn;
      if (sidebarBtn) sidebarBtn.classList.toggle('is-read', isRead);

      updateProgress();
    }

    /** Find the first unread topic in sidebar order */
    function findNextUnread(currentTopic) {
      const topics = allButtons.map(b => b.topic);
      const currentIdx = topics.indexOf(currentTopic);
      // Search after current, then wrap around
      for (let i = currentIdx + 1; i < topics.length; i++) {
        if (!readSet.has(topics[i])) return topics[i];
      }
      for (let i = 0; i < currentIdx; i++) {
        if (!readSet.has(topics[i])) return topics[i];
      }
      return null;
    }

    // ── 4. Continue button ───────────────────────────────────────────────────

    let currentTopic = null;

    // ── Mark-all button ────────────────────────────────────────────────────
    markAllBtn.addEventListener('click', () => {
      const allRead = readSet.size === allTopics.length;
      if (allRead) {
        // Reset everything
        readSet.clear();
      } else {
        // Mark everything as read
        allTopics.forEach(t => readSet.add(t));
      }
      saveProgress(readSet);

      // Refresh all sidebar button states
      allButtons.forEach(({ btn, topic }) => {
        const isNowRead = readSet.has(topic);
        btn.classList.toggle('is-read', isNowRead);
        const dot = topicReadDot[topic];
        if (dot) dot.style.display = isNowRead ? 'inline' : 'none';
      });

      // Refresh the active flashcard's floating mark-read button (if visible)
      if (currentTopic) syncFloatingMarkRead(readSet.has(currentTopic));

      updateProgress();
    });

    // ── Continue button ──────────────────────────────────────────────────────
    continueBtn.addEventListener('click', () => {
      const nextTopic = findNextUnread(currentTopic);
      if (!nextTopic) return;

      const { btn } = allButtons.find(b => b.topic === nextTopic);
      if (activeBtn) activeBtn.classList.remove('active');
      btn.classList.add('active');
      activeBtn = btn;

      // Scroll sidebar button into view
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Expand collapsed category if needed
      const groupEl = btn.closest('.category-group');
      if (groupEl && groupEl.classList.contains('collapsed')) {
        groupEl.classList.remove('collapsed');
        groupEl.querySelector('.cat-toggle').textContent = '▾';
      }

      currentTopic = nextTopic;
      renderFlashcard(nextTopic, data[nextTopic]);
    });

    // ── 5. Search / filter ───────────────────────────────────────────────────
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();

      document.querySelectorAll('.category-group').forEach(group => {
        let anyVisible = false;
        group.querySelectorAll('button').forEach(btn => {
          const match = !q || btn.dataset.topic.toLowerCase().includes(q);
          btn.style.display = match ? '' : 'none';
          if (match) anyVisible = true;
        });
        group.style.display = anyVisible ? '' : 'none';

        // Auto-expand matching groups while searching
        if (q && anyVisible) {
          group.classList.remove('collapsed');
          group.querySelector('.cat-toggle').textContent = '▾';
        }
      });
    });

    // ── 6. Helper utilities ──────────────────────────────────────────────────

    /**
     * Returns an HTML badge for the difficulty level.
     * @param {string} difficulty - "Easy" | "Medium" | "Hard"
     */
    function difficultyBadge(difficulty) {
      if (!difficulty) return '';
      const cls = difficulty.toLowerCase();
      return `<span class="difficulty-badge ${cls}">${difficulty}</span>`;
    }

    /**
     * Converts a problem label like "LC 1. Two Sum" to a LeetCode URL.
     * @param {string} problem
     * @returns {string|null}
     */
    function toLeetCodeUrl(problem) {
      const match = problem.match(/^LC \d+\. (.+)$/);
      if (!match) return null;
      const slug = match[1]
        .toLowerCase()
        .replace(/[()]/g, '')       // Remove parentheses
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      return `https://leetcode.com/problems/${slug}/`;
    }

    // ── 7. Render flashcard ──────────────────────────────────────────────────

    /**
     * Renders a single flashcard for the selected pattern.
     * @param {string} title       - Pattern name
     * @param {Object} topicData   - Card data from data.json
     */
    function renderFlashcard(title, topicData) {
      currentTopic = title;
      clear(grid);

      const card = document.createElement('div');
      card.className = 'flashcard';

      // ── Footer: Gotchas + Problems (rendered BELOW the code block) ──────────
      const footerParts = [];

      if (topicData.gotchas) {
        footerParts.push(`
          <div class="footer-row">
            <span class="footer-label gotcha">⚠️ Gotchas</span>
            <span class="footer-gotcha-text">${topicData.gotchas}</span>
          </div>`);
      }

      if (topicData.problems && topicData.problems.length > 0) {
        const links = topicData.problems.map(p => {
          const url = toLeetCodeUrl(p);
          return url
            ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${p}</a>`
            : `<span>${p}</span>`;
        }).join('');
        footerParts.push(`
          <div class="footer-row">
            <span class="footer-label practice">🏋️ Practice</span>
            <div class="problem-links">${links}</div>
          </div>`);
      }

      const footerHtml = footerParts.length > 0
        ? `<div class="card-footer">${footerParts.join('')}</div>`
        : '';

      const alreadyRead = readSet.has(title);

      // 1. Build HTML skeleton
      card.innerHTML = `
        <div class="card-header">
          <h1>${title} ${difficultyBadge(topicData.difficulty)}</h1>
        </div>
        <div class="meta-panel">
          <div class="meta-row">
            <span class="meta-label">🎯 Triggers</span>
            <span class="meta-content">${topicData.trigger}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">⏱️ Complexity</span>
            <span class="meta-content">${topicData.complexity}</span>
          </div>
        </div>
        <pre><code class="language-cpp"></code></pre>
        ${footerHtml}
      `;

      // 2. Inject C++ code via textContent to prevent HTML tag interpretation
      card.querySelector('code').textContent = topicData.code;

      grid.appendChild(card);

      // 3. Trigger Highlight.js for syntax highlighting
      hljs.highlightElement(card.querySelector('code'));

      // 4. Sync floating action bar state
      updateFloatingNav();
    }

    // ── 8. Load first pattern by default ────────────────────────────────────
    updateProgress();

    if (allButtons.length > 0) {
      const { btn, topic } = allButtons[0];
      btn.classList.add('active');
      activeBtn = btn;
      renderFlashcard(topic, data[topic]);
      updateFloatingNav();
    }

    // ── 9. Keyboard shortcuts ─────────────────────────────────────────────────

    /** Navigate to the previous (-1) or next (+1) card in sidebar order */
    function navigateCard(dir) {
      if (!currentTopic) return;
      const topics  = allButtons.map(b => b.topic);
      const idx     = topics.indexOf(currentTopic);
      if (idx === -1) return;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= topics.length) return;

      const { btn, topic } = allButtons[nextIdx];
      if (activeBtn) activeBtn.classList.remove('active');
      btn.classList.add('active');
      activeBtn = btn;

      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Expand collapsed category if needed
      const groupEl = btn.closest('.category-group');
      if (groupEl && groupEl.classList.contains('collapsed')) {
        groupEl.classList.remove('collapsed');
        groupEl.querySelector('.cat-toggle').textContent = '▾';
      }

      currentTopic = topic;
      renderFlashcard(topic, data[topic]);
      updateFloatingNav();
    }

    document.addEventListener('keydown', e => {
      // Ignore shortcuts when focus is inside any text input
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Ignore when modifier keys are held (except Shift)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar': {
          // Space → Toggle Mark as Read for current card
          e.preventDefault();
          const markReadBtn = document.getElementById('floating-mark-read');
          if (markReadBtn) markReadBtn.click();
          break;
        }
        case 'c':
        case 'C': {
          // C → Continue (jump to next unread card)
          e.preventDefault();
          continueBtn.click();
          break;
        }
        case 'ArrowLeft': {
          // ← → previous card
          e.preventDefault();
          navigateCard(-1);
          break;
        }
        case 'ArrowRight': {
          // → → next card
          e.preventDefault();
          navigateCard(1);
          break;
        }
      }
    });
  });
