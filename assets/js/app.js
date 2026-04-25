fetch('data.json')
  .then(res => res.json())
  .then(data => {
    const patternTabs = document.getElementById('pattern-tabs');
    const grid = document.getElementById('card-grid');

    const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };

    // 初始化側邊欄選單
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

    function renderFlashcard(title, topicData) {
      clear(grid);
      
      const card = document.createElement('div');
      card.className = 'flashcard';

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
        <pre><code class="language-cpp">${topicData.code}</code></pre>
      `;

      grid.appendChild(card);
      
      // 執行語法高亮
      const codeBlock = card.querySelector('code');
      hljs.highlightElement(codeBlock);
    }

    // 預設渲染第一個主題
    const firstTopic = Object.keys(data)[0];
    if (firstTopic) renderFlashcard(firstTopic, data[firstTopic]);
  });
