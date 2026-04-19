/**
 * Blizzard Brotherhood — Reader logic (Supabase version)
 * Chapter display, progress bar, settings (localStorage), prev/next navigation.
 */
var Reader = (function() {
  var STORAGE_KEY = 'bb_reader_settings';
  var PROGRESS_KEY = 'bb_reading_progress';
  var current = { titleSlug: null, chapterNum: null, title: null, chapter: null, allChapters: [] };

  function getSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        return { size: o.size || 'normal', spacing: o.spacing || 'normal', theme: o.theme || 'dark' };
      }
    } catch (e) {}
    return { size: 'normal', spacing: 'normal', theme: 'dark' };
  }

  function saveSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function saveProgress(titleId, chapterNum) {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      var o = raw ? JSON.parse(raw) : {};
      o[titleId] = chapterNum;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  function applySettings(article, s) {
    if (!article) return;
    
    // Размер шрифта и межстрочный интервал — только для контента
    article.classList.remove('size-small', 'size-normal', 'size-large', 'spacing-compact', 'spacing-normal', 'spacing-wide');
    article.classList.add('size-' + (s.size || 'normal'), 'spacing-' + (s.spacing || 'normal'));
    
    // Тема — применяем к body для фона всей страницы
    document.body.classList.remove('reader-theme-dark', 'reader-theme-light', 'reader-theme-sepia');
    document.body.classList.add('reader-theme-' + (s.theme || 'dark'));
    
    // Также применяем к контенту (для цвета текста)
    article.classList.remove('theme-dark', 'theme-light', 'theme-sepia');
    article.classList.add('theme-' + (s.theme || 'dark'));
  }

  function formatContent(text) {
    if (!text) return '';
    return text.split(/\n\n+/).map(function(p) {
      p = p.trim();
      if (!p) return '';
      return '<p>' + Reader.escapeHtml(p.replace(/\n/g, '<br>')) + '</p>';
    }).join('');
  }

  function updateProgressBar() {
    var fill = document.getElementById('read-progress-fill');
    var content = document.getElementById('reader-content');
    if (!fill || !content) return;
    
    function update() {
      var el = content;
      var scrollTop = window.scrollY;
      var contentTop = el.offsetTop;
      var contentHeight = el.offsetHeight;
      var windowHeight = window.innerHeight;
      
      if (contentHeight <= 0) return;
      
      var scrolled = Math.max(0, scrollTop - contentTop);
      var maxScroll = Math.max(1, contentHeight - windowHeight);
      
      var pct = Math.min(100, Math.max(0, (scrolled / maxScroll) * 100));
      fill.style.width = pct.toFixed(1) + '%';
    }
    
    update();
    window.addEventListener('scroll', function() { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
  }

  function bindSettingsPanel() {
    var overlay = document.getElementById('settings-overlay');
    var panel = overlay && overlay.querySelector('.settings-panel');
    var btn = document.getElementById('reader-settings-btn');
    var s = getSettings();

    function open() { overlay.classList.add('visible'); overlay.setAttribute('aria-hidden', 'false'); }
    function close() { overlay.classList.remove('visible'); overlay.setAttribute('aria-hidden', 'true'); }

    if (btn) btn.addEventListener('click', open);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });

    if (panel) {
      panel.querySelectorAll('[data-size]').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-size') === s.size);
        b.addEventListener('click', function() {
          s.size = this.getAttribute('data-size');
          saveSettings(s);
          panel.querySelectorAll('[data-size]').forEach(function(x) { x.classList.toggle('active', x.getAttribute('data-size') === s.size); });
          applySettings(document.getElementById('reader-content'), s);
        });
      });
      panel.querySelectorAll('[data-spacing]').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-spacing') === s.spacing);
        b.addEventListener('click', function() {
          s.spacing = this.getAttribute('data-spacing');
          saveSettings(s);
          panel.querySelectorAll('[data-spacing]').forEach(function(x) { x.classList.toggle('active', x.getAttribute('data-spacing') === s.spacing); });
          applySettings(document.getElementById('reader-content'), s);
        });
      });
      panel.querySelectorAll('[data-theme]').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-theme') === s.theme);
        b.addEventListener('click', function() {
          s.theme = this.getAttribute('data-theme');
          saveSettings(s);
          panel.querySelectorAll('[data-theme]').forEach(function(x) { x.classList.toggle('active', x.getAttribute('data-theme') === s.theme); });
          applySettings(document.getElementById('reader-content'), s);
        });
      });
    }
  }

  function init(opts) {
    var titleSlug = opts && opts.titleSlug;
    var chapterNum = opts && opts.chapterNum;
    if (!titleSlug || !chapterNum) return;

    current.titleSlug = titleSlug;
    current.chapterNum = chapterNum;

    var backLink = document.getElementById('back-link');
    if (backLink) backLink.href = 'title.html?id=' + encodeURIComponent(titleSlug);

    var listLink = document.getElementById('chapter-list');
    if (listLink) listLink.href = 'title.html?id=' + encodeURIComponent(titleSlug);

    App.loadLibrary().then(function(data) {
      var result = App.getChapter(data, titleSlug, chapterNum);
      current.title = result.title;
      current.chapter = result.chapter;
      current.allChapters = App.getAllChaptersSorted(result.title || {});

      var titleEl = document.getElementById('reader-title');
      if (titleEl) titleEl.textContent = (current.title ? (current.title.title || current.title.titleEn) : '') + ' — Ch.' + chapterNum;

      var contentEl = document.getElementById('reader-content');
      if (!contentEl) return;

      if (!current.chapter) {
        contentEl.innerHTML = '<p class="text-muted">Глава не найдена.</p>';
        document.getElementById('reader-nav').style.display = 'none';
        return;
      }

      document.title = (current.chapter.title || 'Chapter ' + chapterNum) + ' — Blizzard Brotherhood';
      contentEl.innerHTML = formatContent(current.chapter.content);
      var settings = getSettings();
      applySettings(contentEl, settings);
      saveProgress(titleSlug, chapterNum);
      updateProgressBar();

      var prevBtn = document.getElementById('prev-chapter');
      var nextBtn = document.getElementById('next-chapter');
      var idx = current.allChapters.findIndex(function(c) {
        var n = c.number != null ? c.number : c.id;
        return String(n) === String(chapterNum);
      });
      var prevNum = idx > 0 ? (current.allChapters[idx - 1].number != null ? current.allChapters[idx - 1].number : current.allChapters[idx - 1].id) : null;
      var nextNum = idx >= 0 && idx < current.allChapters.length - 1 ? (current.allChapters[idx + 1].number != null ? current.allChapters[idx + 1].number : current.allChapters[idx + 1].id) : null;
      
      if (prevBtn) {
        if (prevNum != null) { prevBtn.href = App.getChapterUrl(titleSlug, prevNum); prevBtn.style.visibility = 'visible'; }
        else { prevBtn.href = '#'; prevBtn.style.visibility = 'hidden'; }
      }
      if (nextBtn) {
        if (nextNum != null) { nextBtn.href = App.getChapterUrl(titleSlug, nextNum); nextBtn.style.visibility = 'visible'; }
        else { nextBtn.href = '#'; nextBtn.style.visibility = 'hidden'; }
      }
    }).catch(function(error) {
      console.error('Reader error:', error);
      var contentEl = document.getElementById('reader-content');
      if (contentEl) contentEl.innerHTML = '<p class="text-muted">Не удалось загрузить главу.</p>';
      document.getElementById('reader-nav').style.display = 'none';
    });

    bindSettingsPanel();
  }

  return {
    init: init,
    escapeHtml: function(s) {
      if (s == null) return '';
      var div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }
  };
})();