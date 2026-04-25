fetch('data.json')
  .then(res => res.json())
  .then(data => {
    const patternTabs = document.getElementById('pattern-tabs');
    const grid = document.getElementById('card-grid');

    const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };

    // Initialize sidebar buttons for each algorithmic pattern
    Object.keys(data).forEach((topic, idx) => {
      const btn = document.createElement('button');
      btn.textContent = topic;
      if (idx === 0) btn.classList.add('active');
      btn.onclick = () => {
        document.querySelectorAll('#pattern-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderFlashcard(topic, data[topic]);
      };
      patternTabs.appendChild(btn);
    });

    /**
     * Renders a flashcard for a specific topic
     * @param {string} title - The name of the pattern
     * @param {Object} topicData - The metadata and code from data.json
     */
    function renderFlashcard(title, topicData) {
      clear(grid);
      
      const card = document.createElement('div');
      card.className = 'flashcard';

      // 1. Construct the basic HTML skeleton
      card.innerHTML = `
        <div class="card-header">
          <h1>${title}</h1>
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
      `;

      // 2. Inject C++ code via textContent to prevent HTML tag interpretation (e.g., <int>)
      card.querySelector('code').textContent = topicData.code;

      grid.appendChild(card);
      
      // 3. Trigger Highlight.js for syntax highlighting
      hljs.highlightElement(card.querySelector('code'));
    }

    // Load the first pattern by default
    const firstTopic = Object.keys(data)[0];
    if (firstTopic) renderFlashcard(firstTopic, data[firstTopic]);
  });
