fetch('data.json')
  .then(res => res.json())
  .then(data => {
    const patternTabs = document.getElementById('pattern-tabs');
    const grid        = document.getElementById('card-grid');
    const searchInput = document.getElementById('pattern-search');

    const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };

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

    orderedCategories.forEach(cat => {
      const patterns = categoryMap[cat];
      if (!patterns || patterns.length === 0) return;

      const group = document.createElement('div');
      group.className = 'category-group';
      group.dataset.category = cat;

      // Category header (clickable toggle)
      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <span class="cat-icon">${CATEGORY_ICONS[cat] || '📌'}</span>
        <span class="cat-name">${cat}</span>
        <span class="cat-count">${patterns.length}</span>
        <span class="cat-toggle">▾</span>
      `;
      header.addEventListener('click', () => {
        const isCollapsed = group.classList.toggle('collapsed');
        header.querySelector('.cat-toggle').textContent = isCollapsed ? '▸' : '▾';
      });

      // Buttons container
      const btnWrap = document.createElement('div');
      btnWrap.className = 'category-buttons';

      patterns.forEach(topic => {
        const btn = document.createElement('button');
        btn.textContent = topic;
        btn.dataset.topic    = topic;
        btn.dataset.category = cat;

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

    // ── 3. Search / filter ───────────────────────────────────────────────────
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

    // ── 4. Helper utilities ──────────────────────────────────────────────────

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

    // ── 5. Render flashcard ──────────────────────────────────────────────────

    /**
     * Renders a single flashcard for the selected pattern.
     * @param {string} title       - Pattern name
     * @param {Object} topicData   - Card data from data.json
     */
    function renderFlashcard(title, topicData) {
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

      // 1. Build HTML skeleton (using innerHTML for structure only)
      //    Meta panel is intentionally lean: only Triggers + Complexity
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
    }

    // ── 6. Load first pattern by default ────────────────────────────────────
    if (allButtons.length > 0) {
      const { btn, topic } = allButtons[0];
      btn.classList.add('active');
      activeBtn = btn;
      renderFlashcard(topic, data[topic]);
    }
  });
