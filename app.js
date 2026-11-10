/* =========================================================
       1. WINE DATA & REFERENCE LISTS
       ========================================================= */
    let WINE_DATABASE = [];

    /* Countries list for options */
    const ALL_COUNTRIES = [
      "Італія", "Франція", "Іспанія", "Німеччина",
      "Австралія", "Нова Зеландія", "США", "Аргентина",
      "Чилі", "Грузія", "Ізраїль", "Португалія"
    ];

    const COUNTRY_FLAGS = {
      "Італія": "🇮🇹", "Франція": "🇫🇷", "Іспанія": "🇪🇸", "Німеччина": "🇩🇪",
      "Австралія": "🇦🇺", "Нова Зеландія": "🇳🇿", "США": "🇺🇸", "Аргентина": "🇦🇷",
      "Чилі": "🇨🇱", "Грузія": "🇬🇪", "Ізраїль": "🇮🇱", "Португалія": "🇵🇹"
    };

    /* Classification options */
    const ALL_CLASSIFICATIONS = [
      "Сухе", "Напівсухе", "Брют / Брют Натюр",
      "Напівсолодке", "Солодке", "Кріплене",
      "Помаранчеве, сухе", "Помаранчеве, напівсухе", "Безалкогольне"
    ];

    /* Display labels for menu categories (category value -> label) */
    const CATEGORY_LABELS = {
      "CORAVIN SELECTION": "Coravin Selection",
      "Біле": "Біле вино",
      "Червоне": "Червоне вино"
    };

    const STORAGE_KEY = 'sommelierTrainer.stats.v1';

    /* Unbiased Fisher–Yates shuffle (in place) */
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    /* =========================================================
       2. WEB AUDIO API SYNTHESIZER (No external audio files)
       ========================================================= */
    class SoundEffects {
      constructor() {
        this.ctx = null;
        this.muted = false;
      }
      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
        }
      }
      playCorrect() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.05);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      }
      playWrong() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.3);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }
      playClick() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      }
    }
    const sound = new SoundEffects();

    function createWineImage(wine, className) {
      return `<img src="${wine.image}" alt="${wine.name}" class="${className}" loading="lazy">`;
    }

    /* =========================================================
       3. STATE MANAGEMENT & PERSISTENCE
       ========================================================= */
    const state = {
      quizPool: [],
      quizFilter: 'ALL',
      currentIndex: 0,
      answerChecked: false,
      userAnswers: {
        country: null,
        classification: null,
        grapes: null
      },
      stats: {
        answeredTotal: 0,
        correctTotal: 0,
        streak: 0,
        mistakesSet: new Set() // Set of wine IDs
      },
      mistakesModeActive: false
    };

    function saveStats() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          answeredTotal: state.stats.answeredTotal,
          correctTotal: state.stats.correctTotal,
          streak: state.stats.streak,
          mistakes: [...state.stats.mistakesSet]
        }));
      } catch (error) {
        // Storage unavailable (private mode, blocked cookies) — progress just won't persist
      }
    }

    function loadStats() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) return;
        const knownIds = new Set(WINE_DATABASE.map(w => w.id));
        state.stats.answeredTotal = Number(saved.answeredTotal) || 0;
        state.stats.correctTotal = Number(saved.correctTotal) || 0;
        state.stats.streak = Number(saved.streak) || 0;
        state.stats.mistakesSet = new Set((saved.mistakes || []).filter(id => knownIds.has(id)));
      } catch (error) {
        // Corrupted or unavailable storage — start fresh
      }
    }

    /* =========================================================
       4. CATEGORY FILTERS (built from data)
       ========================================================= */
    function renderCategoryFilters() {
      const counts = new Map();
      WINE_DATABASE.forEach(w => counts.set(w.category, (counts.get(w.category) || 0) + 1));

      const quizSelect = document.getElementById('quizCategoryFilter');
      const flashSelect = document.getElementById('flashcardCategoryFilter');

      quizSelect.innerHTML = `<option value="ALL">Усі вина (${WINE_DATABASE.length})</option>`;
      flashSelect.innerHTML = `<option value="ALL">Всі категорії</option>`;

      counts.forEach((count, category) => {
        const label = CATEGORY_LABELS[category] || category;
        quizSelect.add(new Option(`${label} (${count})`, category));
        flashSelect.add(new Option(label, category));
      });

      document.getElementById('flashcardCountBadge').textContent = WINE_DATABASE.length;
    }

    /* =========================================================
       5. QUIZ LOGIC
       ========================================================= */
    function initQuiz() {
      applyFilterToPool();
      state.currentIndex = 0;
      loadQuizQuestion();
    }

    function applyFilterToPool() {
      if (state.mistakesModeActive) {
        state.quizPool = WINE_DATABASE.filter(w => state.stats.mistakesSet.has(w.id));
        if (state.quizPool.length === 0) {
          state.mistakesModeActive = false;
          document.getElementById('mistakeModeIndicator').classList.add('hidden');
          state.quizPool = [...WINE_DATABASE];
        }
      } else if (state.quizFilter === 'ALL') {
        state.quizPool = [...WINE_DATABASE];
      } else {
        state.quizPool = WINE_DATABASE.filter(w => w.category === state.quizFilter);
      }
      shuffle(state.quizPool);
    }

    function onQuizFilterChange() {
      state.quizFilter = document.getElementById('quizCategoryFilter').value;
      state.mistakesModeActive = false;
      document.getElementById('mistakeModeIndicator').classList.add('hidden');
      applyFilterToPool();
      state.currentIndex = 0;
      loadQuizQuestion();
    }

    function loadQuizQuestion() {
      const currentWine = state.quizPool[state.currentIndex];
      if (!currentWine) {
        state.currentIndex = 0;
        return;
      }

      // Reset answers
      state.answerChecked = false;
      state.userAnswers = { country: null, classification: null, grapes: null };

      // Update counters
      document.getElementById('quizCurrentIndex').textContent = state.currentIndex + 1;
      document.getElementById('quizTotalCount').textContent = state.quizPool.length;

      const progressPercent = ((state.currentIndex + 1) / state.quizPool.length) * 100;
      document.getElementById('quizProgressBar').style.width = `${progressPercent}%`;

      // Update Wine Display
      document.getElementById('quizWineCategory').textContent = currentWine.category;
      document.getElementById('quizWineVolume').textContent = currentWine.volume;
      document.getElementById('quizWineName').textContent = currentWine.name;
      document.getElementById('quizWineImage').src = currentWine.image;
      document.getElementById('quizWineImage').alt = currentWine.name;

      // Hide results & reset buttons
      document.getElementById('quizResultPanel').classList.add('hidden');
      document.getElementById('btnCheckAnswer').classList.remove('hidden');
      document.getElementById('btnNextWine').classList.add('hidden');
      validateCanCheck();

      // Clear badges
      resetBadge('badgeCountryStatus');
      resetBadge('badgeClassStatus');
      resetBadge('badgeGrapesStatus');

      renderCountryOptions(currentWine);
      renderClassificationOptions(currentWine);
      renderGrapesOptions(currentWine);
    }

    function resetBadge(id) {
      const el = document.getElementById(id);
      el.className = "text-xs font-medium hidden";
      el.innerHTML = "";
    }

    function getCountryFlag(country) {
      return COUNTRY_FLAGS[country] || "🍷";
    }

    /* Shared option button rendering & selection */
    const OPTION_BASE_CLASS = "p-2 text-xs font-medium rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-700/80 hover:border-amber-500/40 text-slate-300 transition active:scale-95 disabled:cursor-default disabled:active:scale-100";

    function renderOptions(containerId, groupClass, answerKey, options, extraClass, renderLabel) {
      const container = document.getElementById(containerId);
      container.innerHTML = "";
      options.forEach(value => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.value = value;
        btn.className = `${groupClass} ${OPTION_BASE_CLASS} ${extraClass}`;
        btn.innerHTML = renderLabel(value);
        btn.onclick = () => selectOption(groupClass, answerKey, value, btn);
        container.appendChild(btn);
      });
    }

    function selectOption(groupClass, answerKey, value, btn) {
      if (state.answerChecked) return;
      sound.playClick();
      state.userAnswers[answerKey] = value;
      document.querySelectorAll(`.${groupClass}`).forEach(b => {
        b.classList.remove('bg-amber-500', 'text-slate-950', 'border-amber-400', 'font-bold');
        b.classList.add('bg-slate-800/80', 'text-slate-300');
      });
      btn.classList.remove('bg-slate-800/80', 'text-slate-300');
      btn.classList.add('bg-amber-500', 'text-slate-950', 'border-amber-400', 'font-bold');
      validateCanCheck();
    }

    /* STEP 1: Country Options (correct + 3 random distractors) */
    function renderCountryOptions(currentWine) {
      const distractors = shuffle(ALL_COUNTRIES.filter(c => c !== currentWine.country)).slice(0, 3);
      const options = shuffle([currentWine.country, ...distractors]);
      renderOptions('countryOptionsGrid', 'option-country', 'country', options, 'text-center',
        c => `${getCountryFlag(c)} ${c}`);
    }

    /* STEP 2: Classification Options (full list) */
    function renderClassificationOptions(currentWine) {
      const options = [...new Set([...ALL_CLASSIFICATIONS, currentWine.classification])];
      renderOptions('classOptionsGrid', 'option-class', 'classification', options, 'text-center',
        cls => cls);
    }

    /* STEP 3: Grape Varieties Options (1 correct + 3 distractors) */
    function renderGrapesOptions(currentWine) {
      const options = shuffle([currentWine.grapes, ...currentWine.distractors]);
      renderOptions('grapesOptionsGrid', 'option-grape', 'grapes', options, 'p-2.5 text-left flex items-center justify-between',
        g => `<span>🍇 ${g}</span>`);
    }

    const CHECK_BTN_BASE = "px-6 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg flex items-center gap-2";
    const CHECK_BTN_ENABLED = "bg-gradient-to-r from-wine-600 to-amber-600 hover:from-wine-500 hover:to-amber-500 text-white cursor-pointer transform hover:-translate-y-0.5";
    const CHECK_BTN_DISABLED = "bg-slate-800 text-slate-500 cursor-not-allowed";

    function validateCanCheck() {
      const btn = document.getElementById('btnCheckAnswer');
      const { country, classification, grapes } = state.userAnswers;
      const canCheck = !state.answerChecked && Boolean(country && classification && grapes);
      const hidden = btn.classList.contains('hidden');
      btn.disabled = !canCheck;
      btn.className = `${CHECK_BTN_BASE} ${canCheck ? CHECK_BTN_ENABLED : CHECK_BTN_DISABLED}`;
      btn.classList.toggle('hidden', hidden);
    }

    function markOptions(groupClass, correctValue, chosenValue) {
      document.querySelectorAll(`.${groupClass}`).forEach(b => {
        b.disabled = true;
        if (b.dataset.value === correctValue) {
          b.classList.add('!bg-emerald-600', '!text-white', '!border-emerald-400');
        } else if (b.dataset.value === chosenValue) {
          b.classList.add('!bg-rose-600', '!text-white', '!border-rose-400');
        }
      });
    }

    /* Check Answer & Show Detailed Breakdown */
    function checkQuizAnswer() {
      const currentWine = state.quizPool[state.currentIndex];
      const { country, classification, grapes } = state.userAnswers;
      if (!currentWine || state.answerChecked || !(country && classification && grapes)) return;
      state.answerChecked = true;

      const isCountryCorrect = country === currentWine.country;
      const isClassCorrect = classification === currentWine.classification;
      const isGrapesCorrect = grapes === currentWine.grapes;
      const isAllCorrect = isCountryCorrect && isClassCorrect && isGrapesCorrect;

      // Colorize & lock options
      markOptions('option-country', currentWine.country, country);
      markOptions('option-class', currentWine.classification, classification);
      markOptions('option-grape', currentWine.grapes, grapes);

      // Update Badges
      setBadgeStatus('badgeCountryStatus', isCountryCorrect);
      setBadgeStatus('badgeClassStatus', isClassCorrect);
      setBadgeStatus('badgeGrapesStatus', isGrapesCorrect);

      // Sound and Stats
      state.stats.answeredTotal++;
      if (isAllCorrect) {
        sound.playCorrect();
        state.stats.correctTotal++;
        state.stats.streak++;
        state.stats.mistakesSet.delete(currentWine.id);
      } else {
        sound.playWrong();
        state.stats.streak = 0;
        state.stats.mistakesSet.add(currentWine.id);
      }
      updateStatsUI();

      // Populate Result Panel
      const panel = document.getElementById('quizResultPanel');
      const headerBadge = document.getElementById('resultHeaderBadge');
      if (isAllCorrect) {
        headerBadge.innerHTML = `<span class="text-emerald-400">✨ Бездоганно! Всі 3 параметри визначено вірно.</span>`;
        panel.className = "mt-6 p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 text-sm space-y-3";
      } else {
        headerBadge.innerHTML = `<span class="text-rose-400">⚠️ Є неточності. Зверніть увагу на розбір нижче:</span>`;
        panel.className = "mt-6 p-4 sm:p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-sm space-y-3";
      }

      document.getElementById('resCorrectCountry').textContent = `${getCountryFlag(currentWine.country)} ${currentWine.country}`;
      document.getElementById('resCorrectClass').textContent = currentWine.classificationGeneral;
      document.getElementById('resCorrectGrapes').textContent = currentWine.grapes;
      document.getElementById('resSommelierNote').textContent = currentWine.tastingNotes;

      // Switch buttons
      document.getElementById('btnCheckAnswer').classList.add('hidden');
      document.getElementById('btnNextWine').classList.remove('hidden');
    }

    function setBadgeStatus(elementId, isCorrect) {
      const el = document.getElementById(elementId);
      if (isCorrect) {
        el.className = "text-xs font-semibold text-emerald-400 flex items-center gap-1";
        el.innerHTML = "<span>✓ Вірно</span>";
      } else {
        el.className = "text-xs font-semibold text-rose-400 flex items-center gap-1";
        el.innerHTML = "<span>✕ Помилка</span>";
      }
    }

    function nextQuizWine() {
      sound.playClick();
      state.currentIndex++;
      if (state.currentIndex >= state.quizPool.length) {
        state.currentIndex = 0;
        shuffle(state.quizPool);
      }
      loadQuizQuestion();
    }

    function updateStatsUI() {
      document.getElementById('streakCount').textContent = state.stats.streak;
      const acc = state.stats.answeredTotal > 0
        ? Math.round((state.stats.correctTotal / state.stats.answeredTotal) * 100)
        : 100;
      document.getElementById('accuracyPercent').textContent = `${acc}%`;

      const mistakeCount = state.stats.mistakesSet.size;
      document.getElementById('mistakeCountBadge').textContent = mistakeCount;
      document.getElementById('mistakeActionCount').textContent = mistakeCount;

      renderMistakesList();
      saveStats();
    }

    /* =========================================================
       6. FLASHCARDS MODE
       ========================================================= */
    function renderFlashcards() {
      const container = document.getElementById('flashcardsGrid');
      const search = (document.getElementById('flashcardSearch').value || "").toLowerCase().trim();
      const filter = document.getElementById('flashcardCategoryFilter').value;

      const filtered = WINE_DATABASE.filter(wine => {
        const matchesCategory = filter === 'ALL' || wine.category === filter;
        const matchesSearch = !search ||
          wine.name.toLowerCase().includes(search) ||
          wine.grapes.toLowerCase().includes(search) ||
          wine.country.toLowerCase().includes(search);
        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="col-span-full py-16 text-center text-slate-500">
            <span class="text-3xl block mb-2">🔍</span>
            <p>Вина за вашим запитом не знайдено</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(wine => `
        <div class="flip-card-container h-[420px] cursor-pointer group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d13]"
             data-card-flip tabindex="0" role="button" aria-pressed="false"
             aria-label="${wine.name} — перевернути картку">
          <div class="flip-card-inner">

            <!-- FRONT OF CARD -->
            <div class="flip-card-front bg-[#131722] border border-white/10 p-5 flex flex-col justify-between shadow-xl hover:border-amber-500/40 transition">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-white/5 text-amber-300 border border-white/5">
                  ${wine.category}
                </span>
                <span class="text-xs text-slate-400 font-mono">${wine.priceHint}</span>
              </div>

              <div class="h-52 flex items-center justify-center my-2 transform group-hover:scale-105 transition-transform">
                ${createWineImage(wine, "h-full w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]")}
              </div>

              <div class="text-center">
                <h4 class="font-serif font-bold text-base text-white line-clamp-1">${wine.name}</h4>
                <p class="text-[11px] text-amber-400 mt-1 flex items-center justify-center gap-1">
                  <span>Торкніться або натисніть Enter, щоб розкрити паспорт</span>
                  <span>↺</span>
                </p>
              </div>
            </div>

            <!-- BACK OF CARD -->
            <div class="flip-card-back bg-gradient-to-br from-[#1b2030] to-[#0f121a] border border-amber-500/30 p-6 flex flex-col justify-between shadow-2xl">
              <div>
                <div class="flex justify-between items-start mb-3">
                  <h4 class="font-serif font-bold text-amber-300 text-sm leading-tight">${wine.name}</h4>
                  <span class="text-xs text-slate-400">↺</span>
                </div>

                <div class="space-y-2 text-xs border-y border-white/10 py-3 text-slate-300">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Країна / регіон:</span>
                    <span class="font-semibold text-white">${getCountryFlag(wine.country)} ${wine.country}${wine.region ? ` · ${wine.region}` : ""}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Сортовий склад:</span>
                    <span class="font-semibold text-white text-right max-w-[180px]">${wine.grapes}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Класифікація:</span>
                    <span class="font-semibold text-amber-300">${wine.classificationGeneral}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Об'єм / Міцність:</span>
                    <span class="font-mono text-slate-300">${wine.volume}</span>
                  </div>
                </div>

                <div class="mt-3">
                  <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">Дегустаційні ноти:</span>
                  <p class="text-xs text-slate-300 leading-relaxed italic bg-white/5 p-2.5 rounded-lg border border-white/5">
                    "${wine.tastingNotes}"
                  </p>
                </div>
              </div>

              <div class="text-[10px] text-slate-400 text-center pt-2">
                Повторний клік перевертає картку назад
              </div>
            </div>

          </div>
        </div>
      `).join('');
    }

    function toggleCardFlip(element) {
      sound.playClick();
      const flipped = element.classList.toggle('is-flipped');
      element.setAttribute('aria-pressed', String(flipped));
    }

    /* =========================================================
       7. MISTAKES REVIEW MODE
       ========================================================= */
    function renderMistakesList() {
      const container = document.getElementById('mistakesListContainer');
      const startBtn = document.getElementById('btnStartMistakesQuiz');
      const mistakeWines = WINE_DATABASE.filter(w => state.stats.mistakesSet.has(w.id));

      if (mistakeWines.length === 0) {
        container.innerHTML = `
          <div class="col-span-full py-12 text-center text-slate-500 bg-[#131722]/50 border border-white/5 rounded-2xl">
            <span class="text-4xl block mb-2">🎉</span>
            <p class="font-medium text-slate-300">Список помилок порожній!</p>
            <p class="text-xs text-slate-500 mt-1">Ви бездоганно відповіли на всі вина у квізі або ще не почали тест.</p>
          </div>
        `;
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return;
      }

      startBtn.disabled = false;
      startBtn.classList.remove('opacity-50', 'cursor-not-allowed');

      container.innerHTML = mistakeWines.map(wine => `
        <div class="bg-[#131722] border border-rose-500/30 rounded-2xl p-5 flex items-center space-x-4">
          <div class="w-16 h-28 flex-shrink-0">
            ${createWineImage(wine, "h-full w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]")}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[10px] text-rose-400 font-mono uppercase">${wine.category}</span>
            <h4 class="font-serif font-bold text-sm text-white truncate">${wine.name}</h4>
            <p class="text-xs text-slate-400 mt-1">📍 ${wine.country} • 🏷️ ${wine.classification}</p>
            <p class="text-xs text-amber-300 font-semibold mt-0.5">🍇 ${wine.grapes}</p>
          </div>
        </div>
      `).join('');
    }

    function startMistakesQuiz() {
      if (state.stats.mistakesSet.size === 0) return;
      state.mistakesModeActive = true;
      document.getElementById('mistakeModeIndicator').classList.remove('hidden');
      switchMode('quiz');
      initQuiz();
    }

    function clearMistakes() {
      state.stats.mistakesSet.clear();
      updateStatsUI();
    }

    /* =========================================================
       8. SOMMELIER CHEAT SHEET TABLE
       ========================================================= */
    function renderCheatSheet() {
      const tbody = document.getElementById('cheatSheetTableBody');
      tbody.innerHTML = WINE_DATABASE.map(wine => `
        <tr class="hover:bg-white/5 transition">
          <td class="py-3 px-3 align-top font-semibold text-white flex items-start gap-2">
            <span class="w-2 h-2 rounded-full ${wine.category === 'CORAVIN SELECTION' ? 'bg-amber-400' : 'bg-wine-500'}"></span>
            <span>${wine.name}</span>
          </td>
          <td class="py-3 px-3 align-top text-slate-400 font-mono">${wine.category}</td>
          <td class="py-3 px-3 align-top">${getCountryFlag(wine.country)} ${wine.country}${wine.region ? ` (${wine.region})` : ""}</td>
          <td class="py-3 px-3 align-top font-medium text-amber-300">${wine.classificationGeneral}</td>
          <td class="py-3 px-3 align-top text-slate-200">${wine.grapes}</td>
          <td class="py-3 px-3 align-top text-slate-400 italic whitespace-normal break-words leading-relaxed">
            ${wine.tastingNotes}
          </td>
        </tr>
      `).join('');
    }

    /* =========================================================
       9. MODE SWITCHING & INITIALIZATION
       ========================================================= */
    const TABS = [
      { id: 'tabQuiz', section: 'quizSection', mode: 'quiz' },
      { id: 'tabFlashcards', section: 'flashcardsSection', mode: 'flashcards' },
      { id: 'tabMistakes', section: 'mistakesSection', mode: 'mistakes' },
      { id: 'tabCatalog', section: 'catalogSection', mode: 'catalog' }
    ];

    function switchMode(newMode) {
      sound.playClick();

      TABS.forEach(t => {
        const isActive = t.mode === newMode;
        document.getElementById(t.section).classList.toggle('hidden', !isActive);
        document.getElementById(t.id).className = isActive
          ? "px-3.5 py-1.5 rounded-lg flex items-center space-x-2 whitespace-nowrap transition bg-wine-600/40 text-amber-300 border border-wine-500/50 shadow-sm"
          : "px-3.5 py-1.5 rounded-lg flex items-center space-x-2 whitespace-nowrap transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent";
      });

      if (newMode === 'flashcards') {
        renderFlashcards();
      } else if (newMode === 'mistakes') {
        renderMistakesList();
      } else if (newMode === 'catalog') {
        renderCheatSheet();
      }
    }

    const ACTIONS = {
      skipQuizWine: nextQuizWine,
      checkQuizAnswer,
      nextQuizWine,
      startMistakesQuiz,
      clearMistakes,
      print: () => window.print()
    };

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const modeButton = target.closest('[data-mode]');
      if (modeButton) switchMode(modeButton.dataset.mode);
      const actionButton = target.closest('[data-action]');
      if (actionButton) ACTIONS[actionButton.dataset.action]?.();
      const card = target.closest('[data-card-flip]');
      if (card) toggleCardFlip(card);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target instanceof Element ? event.target.closest('[data-card-flip]') : null;
      if (!card) return;
      event.preventDefault();
      toggleCardFlip(card);
    });

    document.addEventListener('change', event => {
      const action = event.target.dataset.changeAction;
      if (action === 'onQuizFilterChange') onQuizFilterChange();
      if (action === 'renderFlashcards') renderFlashcards();
    });

    document.addEventListener('input', event => {
      if (event.target.dataset.inputAction === 'renderFlashcards') renderFlashcards();
    });

    // Sound toggle listener
    document.getElementById('soundToggleBtn').addEventListener('click', () => {
      sound.muted = !sound.muted;
      document.getElementById('soundIcon').textContent = sound.muted ? '🔇' : '🔊';
    });

    async function initializeApp() {
      const status = document.getElementById('appStatus');
      try {
        const response = await fetch('./wines.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const wines = await response.json();
        if (!Array.isArray(wines) || wines.length === 0) {
          throw new Error('Wine data is empty or invalid');
        }

        WINE_DATABASE = wines;
        loadStats();
        renderCategoryFilters();
        initQuiz();
        updateStatsUI();
        renderFlashcards();
        renderCheatSheet();
      } catch (error) {
        console.error('Unable to load wines.json:', error);
        status.textContent = 'Не вдалося завантажити wines.json. Запустіть сторінку через локальний вебсервер (наприклад, Live Server) і оновіть її.';
        status.classList.remove('hidden');
      }
    }

    window.addEventListener('DOMContentLoaded', initializeApp, { once: true });
