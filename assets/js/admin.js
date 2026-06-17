/**
 * Blizzard Brotherhood — Admin panel logic (Supabase version)
 * Direct database operations through Supabase
 */

(function() {
  // Пароль для входа в админку (измени на свой!)
  var ADMIN_PASSWORD = 'blizzard';
  
  // Инициализация Supabase
  var supabase = (window.App && window.App.supabase) || window.supabase.createClient(
    window.SUPABASE_CONFIG.URL,
    window.SUPABASE_CONFIG.ANON_KEY
  );

  var authScreen = document.getElementById('auth-screen');
  var adminPanel = document.getElementById('admin-panel');
  var authForm = document.getElementById('auth-form');
  var adminPassword = document.getElementById('admin-password');

  function isAuthenticated() {
    try {
      return sessionStorage.getItem('bb_admin') === '1';
    } catch (e) { return false; }
  }
  
  function setAuthenticated() {
    try { sessionStorage.setItem('bb_admin', '1'); } catch (e) {}
  }

  function showPanel() {
    if (authScreen) authScreen.classList.add('admin-hidden');
    if (adminPanel) adminPanel.classList.remove('admin-hidden');
  }
  
  function showAuth() {
    if (authScreen) authScreen.classList.remove('admin-hidden');
    if (adminPanel) adminPanel.classList.add('admin-hidden');
  }

  if (authForm) {
    authForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var pwd = adminPassword && adminPassword.value;
      if (pwd === ADMIN_PASSWORD) {
        setAuthenticated();
        showPanel();
        loadTitlesForSelect();
        loadChaptersForDelete();
      } else {
        alert('Wrong password');
      }
    });
  }

  if (isAuthenticated()) {
    showPanel();
    loadTitlesForSelect();
    loadChaptersForDelete();
  } else {
    showAuth();
  }

  // Загружаем список тайтлов для выпадающего списка
  function loadTitlesForSelect() {
    supabase
      .from('titles')
      .select('id, title, title_en')
      .order('title')
      .then(function(result) {
        var sel = document.getElementById('nc-title-id');
        if (!sel) return;
        sel.innerHTML = '';
        
        if (result.error) {
          console.error('Error loading titles:', result.error);
          return;
        }
        
        result.data.forEach(function(t) {
          var opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.title || t.title_en || t.id;
          sel.appendChild(opt);
        });
        
        if (typeof updateNextChapterNumber === 'function') updateNextChapterNumber();
      });
  }

  function loadChaptersForDelete() {
    var deleteSection = document.getElementById('delete-section');
    if (!deleteSection) return;
    
    supabase
      .from('titles')
      .select('id, title, title_en, chapters(id, number, title, language, date_published)')
      .order('title')
      .then(function(result) {
        if (result.error) {
          console.error('Error loading chapters for delete:', result.error);
          return;
        }
        
        var html = '<h2>Delete chapters</h2>';
        
        result.data.forEach(function(title) {
          var chapters = title.chapters || [];
          if (chapters.length === 0) return;
          
          // Сортируем главы по номеру
          chapters.sort(function(a, b) { return (a.number || 0) - (b.number || 0); });
          
          html += '<div class="delete-title-group">';
          html += '<h3>' + escapeHtml(title.title || title.title_en || title.id) + '</h3>';
          html += '<ul class="delete-chapters-list">';
          
          chapters.forEach(function(ch) {
            var langIcon = ch.language === 'ru' ? '🇷🇺' : '🇬🇧';
            html += '<li class="delete-chapter-item">';
            html += '<span class="delete-chapter-info">';
            html += '<strong>Глава ' + ch.number + '</strong> — ' + escapeHtml(ch.title || 'Без названия');
            html += ' <span class="delete-chapter-meta">' + langIcon + ' ' + (ch.date_published || '') + '</span>';
            html += '</span>';
            html += '<button class="btn btn-delete" data-chapter-id="' + ch.id + '" data-chapter-num="' + ch.number + '" data-title-name="' + escapeHtml(title.title || title.title_en) + '">🗑️ Удалить</button>';
            html += '</li>';
          });
          
          html += '</ul></div>';
        });
        
        if (html === '<h2>Delete chapters</h2>') {
          html += '<p class="text-muted">Нет глав для удаления.</p>';
        }
        
        deleteSection.innerHTML = html;
        
        deleteSection.querySelectorAll('.btn-delete').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var chapterId = this.getAttribute('data-chapter-id');
            var chapterNum = this.getAttribute('data-chapter-num');
            var titleName = this.getAttribute('data-title-name');
            deleteChapter(chapterId, chapterNum, titleName);
          });
        });
      });
  }
  
  function deleteChapter(chapterId, chapterNum, titleName) {
    var confirmMsg = 'Вы уверены, что хотите удалить главу ' + chapterNum + ' из "' + titleName + '"?\nЭто действие нельзя отменить!';
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    if (!confirm('Точно уверены? Глава будет удалена навсегда.')) {
      return;
    }
    
    supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .select('title_id')
      .then(function(result) {
        if (result.error) {
          showMessage('Ошибка удаления: ' + result.error.message, 'error');
          return;
        }
        
        if (result.data && result.data.length > 0) {
          var titleId = result.data[0].title_id;
          updateTitleStats(titleId);
        }
        
        showMessage('✅ Глава ' + chapterNum + ' удалена!', 'success');
        loadChaptersForDelete();
      });
  }

  function slugify(s) {
    if (!s) return 'title-' + Date.now();
    return s.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0400-\u04FF-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'title-' + Date.now();
  }

  function showMessage(msg, type) {
    var el = document.getElementById('admin-message');
    if (!el) return;
    el.textContent = msg;
    el.className = 'admin-message ' + (type === 'error' ? 'error' : 'success');
    el.style.display = 'block';
    
    setTimeout(function() {
      el.style.display = 'none';
    }, 5000);
  }
  
  // Простая функция экранирования HTML (для безопасности)
  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // ========== ДОБАВЛЕНИЕ НОВОГО ТАЙТЛА ==========
  var formNewTitle = document.getElementById('form-new-title');
  if (formNewTitle) {
    formNewTitle.addEventListener('submit', function(e) {
      e.preventDefault();
      
      var submitBtn = this.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Добавление...';
      
      var titleRu = document.getElementById('nt-title').value.trim();
      var titleEn = document.getElementById('nt-title-en').value.trim();
      var id = slugify(titleEn || titleRu);
      var genres = (document.getElementById('nt-genres').value || '')
        .split(',')
        .map(function(g) { return g.trim(); })
        .filter(Boolean);
      
      var newTitle = {
        id: id,
        title: titleRu,
        title_en: titleEn || titleRu,
        author: document.getElementById('nt-author').value.trim(),
        cover: document.getElementById('nt-cover').value.trim() || 'assets/images/covers/' + id + '.jpg',
        description: document.getElementById('nt-description').value.trim(),
        genre: genres.length ? genres : ['Fantasy'],
        status: document.getElementById('nt-status').value || 'ongoing',
        total_chapters: 0,
        translated_chapters: 0,
        date_added: new Date().toISOString().slice(0, 10),
        last_chapter_date: null
      };
      
      supabase
        .from('titles')
        .insert([newTitle])
        .select()
        .then(function(result) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add title';
          
          if (result.error) {
            if (result.error.code === '23505') {
              showMessage('Тайтл с таким ID уже существует. Используйте другое английское название.', 'error');
            } else {
              showMessage('Ошибка: ' + result.error.message, 'error');
            }
            return;
          }
          
          formNewTitle.reset();
          loadTitlesForSelect();
          showMessage('✅ Тайтл "' + titleRu + '" добавлен!', 'success');
        });
    });
  }

  // ========== ДОБАВЛЕНИЕ НОВОЙ ГЛАВЫ ==========
  var formNewChapter = document.getElementById('form-new-chapter');
  if (formNewChapter) {
    formNewChapter.addEventListener('submit', function(e) {
      e.preventDefault();
      
      var submitBtn = this.querySelector('button[type="submit"]');
      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Публикация...';
      
      var titleId = document.getElementById('nc-title-id').value;
      var num = parseInt(document.getElementById('nc-number').value, 10) || 1;
      var lang = document.getElementById('nc-language').value || 'ru';
      var chapterTitle = document.getElementById('nc-chapter-title').value.trim();
      var content = document.getElementById('nc-content').value.trim();
      
      if (!titleId) {
        showMessage('Выберите тайтл', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      
      if (!content) {
        showMessage('Введите текст главы', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      
      var newChapter = {
        title_id: titleId,
        number: num,
        title: chapterTitle,
        language: lang,
        type: lang === 'ru' ? 'translation' : 'original',
        date_published: new Date().toISOString(),
        content: content
      };
      
      // Сначала проверяем, существует ли уже глава с таким номером
      supabase
        .from('chapters')
        .select('id')
        .eq('title_id', titleId)
        .eq('number', num)
        .then(function(checkResult) {
          if (checkResult.error) {
            showMessage('Ошибка проверки: ' + checkResult.error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
          }
          
          var operation;
          var isUpdate = checkResult.data && checkResult.data.length > 0;
          
          if (isUpdate) {
            // Глава существует — ОБНОВЛЯЕМ
            var chapterId = checkResult.data[0].id;
            operation = supabase
              .from('chapters')
              .update(newChapter)
              .eq('id', chapterId);
          } else {
            // Новой главы нет — ДОБАВЛЯЕМ
            operation = supabase
              .from('chapters')
              .insert([newChapter]);
          }
          
          operation.then(function(result) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            if (result.error) {
              if (result.error.code === '23505') {
                showMessage('❌ Глава с номером ' + num + ' уже существует для этого тайтла!', 'error');
              } else {
                showMessage('Ошибка сохранения: ' + result.error.message, 'error');
              }
              return;
            }
            
            // Обновляем статистику тайтла
            updateTitleStats(titleId);
            
            // Очищаем форму
            document.getElementById('nc-content').value = '';
            document.getElementById('nc-number').value = num + 1;
            document.getElementById('nc-chapter-title').value = '';
            
            var action = isUpdate ? 'обновлена' : 'добавлена';
            showMessage('✅ Глава ' + num + ' ' + action + '!', 'success');
            
            loadChaptersForDelete();
          });
        });
    });
  }
  
  function updateTitleStats(titleId) {
    supabase
      .from('chapters')
      .select('number, language, date_published')
      .eq('title_id', titleId)
      .then(function(chaptersResult) {
        if (chaptersResult.error) return;
        
        var chapters = chaptersResult.data;
        var totalChapters = chapters.length;
        var translatedChapters = chapters.filter(function(c) { 
          return c.language === 'ru'; 
        }).length;
        
        var lastDate = null;
        chapters.forEach(function(c) {
          var dateStr = c.date_published || '';
          if (!lastDate || dateStr > lastDate) {
            lastDate = dateStr;
          }
        });
        // Для отображения только даты:
        var displayDate = lastDate ? lastDate.slice(0, 10) : null;
        
        supabase
          .from('titles')
          .update({
            total_chapters: totalChapters,
            translated_chapters: translatedChapters,
            last_chapter_date: lastDate
          })
          .eq('id', titleId)
          .then(function() {
            console.log('Title stats updated');
          });
      });
  }

  function updateNextChapterNumber() {
    var sel = document.getElementById('nc-title-id');
    var numEl = document.getElementById('nc-number');
    if (!sel || !numEl) return;
    
    var titleId = sel.value;
    if (!titleId) {
      numEl.value = 1;
      return;
    }
    
    supabase
      .from('chapters')
      .select('number')
      .eq('title_id', titleId)
      .order('number', { ascending: false })
      .limit(1)
      .then(function(result) {
        var next = 1;
        if (result.data && result.data.length > 0) {
          next = (result.data[0].number || 0) + 1;
        }
        numEl.value = next;
      });
  }
  
  window.updateNextChapterNumber = updateNextChapterNumber;
  
  var ncTitleSel = document.getElementById('nc-title-id');
  if (ncTitleSel) {
    ncTitleSel.addEventListener('change', updateNextChapterNumber);
  }
})();