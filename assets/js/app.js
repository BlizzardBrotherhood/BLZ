/**
 * Blizzard Brotherhood — Core app logic (Supabase version)
 * Loads data from Supabase instead of library.json
 */

var App = (function() {
  // Инициализация Supabase клиента
  var supabase = window.supabase.createClient(
    window.SUPABASE_CONFIG.URL,
    window.SUPABASE_CONFIG.ANON_KEY
  );

  var cache = null;
  var cacheTime = null;
  var CACHE_DURATION = 5 * 60 * 1000; // 5 минут кэш

  function loadLibrary() {
    // Если кэш свежий — возвращаем его
    if (cache && cacheTime && (Date.now() - cacheTime) < CACHE_DURATION) {
      return Promise.resolve(cache);
    }

    // Загружаем тайтлы вместе с главами
    return supabase
      .from('titles')
      .select(`
        *,
        chapters (*)
      `)
      .order('date_added', { ascending: false })
      .then(function(result) {
        if (result.error) throw result.error;
        
        // Преобразуем в формат, похожий на старый library.json
        var data = {
          site: {
            title: 'Blizzard Brotherhood',
            description: 'Light novel and web novel translations',
            translator: 'Blizzard Brotherhood',
            telegram: 'https://t.me/blizzardbrotherhood',
            lastUpdated: new Date().toISOString().slice(0, 10)
          },
          titles: result.data.map(function(t) {
            return {
              id: t.id,
              title: t.title,
              titleEn: t.title_en,
              author: t.author,
              cover: t.cover,
              description: t.description,
              genre: t.genre || [],
              status: t.status,
              totalChapters: t.total_chapters || (t.chapters ? t.chapters.length : 0),
              translatedChapters: t.translated_chapters || (t.chapters ? t.chapters.filter(function(c) { return c.language === 'ru'; }).length : 0),
              dateAdded: t.date_added,
              lastChapterDate: t.last_chapter_date,
              chapters: (t.chapters || []).map(function(c) {
                return {
                  id: c.id,
                  number: c.number,
                  title: c.title,
                  language: c.language,
                  type: c.type,
                  datePublished: c.date_published,
                  content: c.content
                };
              })
            };
          })
        };
        
        cache = data;
        cacheTime = Date.now();
        return data;
      });
  }

  function getTitleUrl(id) { 
    return 'title.html?id=' + encodeURIComponent(id); 
  }
  
  function getChapterUrl(titleId, chapterNum) { 
    return 'chapter.html?title=' + encodeURIComponent(titleId) + '&chapter=' + encodeURIComponent(chapterNum); 
  }

  function statusClass(s) {
    if (!s) return 'status-ongoing';
    s = (s + '').toLowerCase();
    if (s === 'completed') return 'status-completed';
    if (s === 'hiatus' || s === 'on hiatus') return 'status-hiatus';
    return 'status-ongoing';
  }

  function renderHome(container, data) {
    if (!container) return;
    var titles = (data && data.titles) ? data.titles : [];
    if (titles.length === 0) {
      container.innerHTML = '<p class="text-muted">Пока нет добавленных тайтлов.</p>';
      return;
    }
    var html = '';
    titles.forEach(function(t, i) {
      var translated = t.translatedChapters || 0;
      var total = t.totalChapters || 0;
      var pct = total > 0 ? Math.min(100, Math.round((translated / total) * 100)) : 0;
      var lastCh = t.chapters && t.chapters.length ? t.chapters.reduce(function(a, c) {
        var d = c.datePublished || '';
        return d > (a.datePublished || '') ? c : a;
      }, t.chapters[0]) : null;
      var lastDate = lastCh ? (lastCh.datePublished || t.lastChapterDate || '') : (t.lastChapterDate || '');
      var coverSrc = (t.cover || '').replace(/^\//, '');
      
      html += '<a href="' + getTitleUrl(t.id) + '" class="title-card fade-in" style="animation-delay:' + (i * 0.05) + 's">';
      html += '<img src="' + coverSrc + '" alt="" class="title-card-cover" onerror="this.style.background=\'var(--color-bg-elevated)\';this.src=\'\';this.alt=\'\'">';
      html += '<div class="title-card-body">';
      html += '<h3>' + escapeHtml(t.title || t.titleEn || '') + '</h3>';
      if (t.titleEn && t.title !== t.titleEn) html += '<p class="title-card-en">' + escapeHtml(t.titleEn) + '</p>';
      html += '<div class="progress-wrap"><div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
      html += '<p class="progress-text">' + translated + ' / ' + total + ' chapters translated</p></div>';
      if (t.genre && t.genre.length) {
        html += '<div class="genres">';
        t.genre.slice(0, 4).forEach(function(g) { html += '<span class="genre-tag">' + escapeHtml(g) + '</span>'; });
        html += '</div>';
      }
      html += '<span class="status-badge ' + statusClass(t.status) + '">' + (t.status === 'completed' ? 'Completed' : t.status === 'hiatus' || t.status === 'on hiatus' ? 'On Hiatus' : 'Ongoing') + '</span>';
      if (lastDate) html += '<p class="title-card-date">Last chapter: ' + escapeHtml(lastDate) + '</p>';
      html += '</div></a>';
    });
    container.innerHTML = html;
  }

  function getLastReadChapter(titleId) {
    try {
      var raw = localStorage.getItem('bb_reading_progress');
      var o = raw ? JSON.parse(raw) : {};
      return o[titleId] || null;
    } catch (e) { return null; }
  }

  function renderTitlePage(root, title) {
    var chapters = title.chapters || [];
    var byLang = { ru: [], en: [] };
    chapters.forEach(function(c) {
      var lang = (c.language || 'ru').toLowerCase();
      if (lang === 'en' || lang === 'gb') byLang.en.push(c);
      else byLang.ru.push(c);
    });
    byLang.ru.sort(compareChapter);
    byLang.en.sort(compareChapter);

    var coverSrc = (title.cover || '').replace(/^\//, '');
    var translated = title.translatedChapters || byLang.ru.length;
    var total = title.totalChapters || chapters.length;
    var pct = total > 0 ? Math.min(100, Math.round((translated / total) * 100)) : 0;
    var lastReadNum = getLastReadChapter(title.id);

    var html = '';
    html += '<div class="title-page-header">';
    html += '<img src="' + coverSrc + '" alt="" class="title-cover" onerror="this.style.background=\'var(--color-bg-elevated)\';this.src=\'\'">';
    html += '<div class="title-meta">';
    html += '<h1>' + escapeHtml(title.title || title.titleEn || '') + '</h1>';
    if (title.titleEn && title.title !== title.titleEn) html += '<p class="title-card-en">' + escapeHtml(title.titleEn) + '</p>';
    html += '<p class="author">' + escapeHtml(title.author || '') + '</p>';
    if (title.description) html += '<p class="description">' + escapeHtml(title.description) + '</p>';
    if (title.genre && title.genre.length) {
      html += '<div class="genres">';
      title.genre.forEach(function(g) { html += '<span class="genre-tag">' + escapeHtml(g) + '</span>'; });
      html += '</div>';
    }
    html += '<div class="progress-wrap"><div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<p class="progress-text">' + translated + ' of ' + total + ' chapters translated</p></div>';
    if (lastReadNum != null) {
      html += '<p class="progress-text"><a href="' + getChapterUrl(title.id, lastReadNum) + '">Continue from Chapter ' + lastReadNum + '</a></p>';
    }
    html += '<span class="status-badge ' + statusClass(title.status) + '">' + (title.status === 'completed' ? 'Completed' : title.status === 'hiatus' || title.status === 'on hiatus' ? 'On Hiatus' : 'Ongoing') + '</span>';
    html += '</div></div>';

    html += '<div class="lang-tabs" role="tablist">';
    html += '<button type="button" class="lang-tab active" role="tab" aria-selected="true" data-lang="ru">🇷🇺 Translation</button>';
    html += '<button type="button" class="lang-tab" role="tab" aria-selected="false" data-lang="en">🇬🇧 Original</button>';
    html += '</div>';

    html += '<div id="chapters-ru" class="chapters-pane" role="tabpanel">' + chapterListHtml(byLang.ru, title.id, 'ru') + '</div>';
    html += '<div id="chapters-en" class="chapters-pane" style="display:none" role="tabpanel">' + chapterListHtml(byLang.en, title.id, 'en') + '</div>';

    root.innerHTML = html;

    root.querySelectorAll('.lang-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var lang = this.getAttribute('data-lang');
        root.querySelectorAll('.lang-tab').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-lang') === lang);
          b.setAttribute('aria-selected', b.getAttribute('data-lang') === lang);
        });
        document.getElementById('chapters-ru').style.display = lang === 'ru' ? '' : 'none';
        document.getElementById('chapters-en').style.display = lang === 'en' ? '' : 'none';
      });
    });
  }

  function chapterListHtml(chapters, titleId, lang) {
    if (!chapters.length) return '<p class="text-muted">Нет глав.</p>';
    var list = '<ul class="chapters-list">';
    chapters.forEach(function(c) {
      var num = c.number != null ? c.number : c.id;
      var url = getChapterUrl(titleId, num);
      var icon = lang === 'ru' ? '🇷🇺' : '🇬🇧';
      var origLabel = (c.type === 'original' || c.language === 'en') ? ' <span class="chapter-original">Original</span>' : '';
      list += '<li><a href="' + url + '" class="chapter-row">';
      list += '<span class="chapter-num">' + escapeHtml(String(num)) + '</span>';
      list += '<span class="chapter-title">' + escapeHtml(c.title || 'Chapter ' + num) + origLabel + '</span>';
      list += '<span class="chapter-meta"><span class="chapter-lang-icon">' + icon + '</span>' + escapeHtml(c.datePublished || '') + '</span>';
      list += '</a></li>';
    });
    return list + '</ul>';
  }

  function compareChapter(a, b) {
    var na = a.number != null ? a.number : a.id;
    var nb = b.number != null ? b.number : b.id;
    return (Number(na) || 0) - (Number(nb) || 0);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // Обновленная функция получения конкретной главы
  function getChapter(data, titleId, chapterNum) {
    var title = (data && data.titles) ? data.titles.find(function(t) { return t.id === titleId; }) : null;
    if (!title || !title.chapters) return { title: title, chapter: null };
    var ch = title.chapters.find(function(c) {
      var n = c.number != null ? c.number : c.id;
      return String(n) === String(chapterNum);
    });
    return { title: title, chapter: ch };
  }

  function getAllChaptersSorted(title) {
    var ch = (title && title.chapters) ? title.chapters.slice() : [];
    ch.sort(compareChapter);
    return ch;
  }

  return {
    loadLibrary: loadLibrary,
    renderHome: renderHome,
    renderTitlePage: renderTitlePage,
    getTitleUrl: getTitleUrl,
    getChapterUrl: getChapterUrl,
    getChapter: getChapter,
    getAllChaptersSorted: getAllChaptersSorted,
    // Экспортируем supabase для использования в других модулях
    supabase: supabase
  };
})();