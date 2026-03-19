import { getTodayStory, getDailyStory } from '../api.js';
import { renderHeader } from '../components/header.js';
import { renderReelPlayer, initReelPlayer } from '../components/reel-player.js';
import { renderImageCarousel, renderVideoCarousel, initCarousel } from '../components/carousel.js';
import { startBgMusic, stopBgMusic, renderBgMusicToggle, initBgMusicToggle } from '../components/bg-music.js';
import { renderQuizCard, attachQuizHandlers } from '../components/quiz-card.js';
import { playStars } from '../components/sounds.js';
import { openChat } from '../components/chat.js';
import { setDailyStepComplete } from '../state.js';
import { escapeHtml, sanitizeUrl } from '../utils.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from '../components/paywall.js';

export default function dailyView(app, params) {
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading</div>';
  var cleanupFn = null;
  var voAudio = null;
  var currentStep = 0;
  var totalSteps = 0;
  var _fitDailyReel = null;
  let aborted = false;

  // Parse ?step= from hash
  var hashParts = window.location.hash.split('?');
  var startStep = 0;
  if (hashParts[1]) {
    var qs = hashParts[1];
    var m = qs.match(/step=(\d+)/);
    if (m) startStep = parseInt(m[1], 10);
  }

  // Determine which date to load
  var playDate = params && params.date ? params.date : null;
  var fetchPromise = playDate ? getDailyStory(playDate) : getTodayStory();

  fetchPromise.then(function(entry) {
    if (aborted) return;
    if (!entry || !entry.content) {
      app.innerHTML = renderHeader('Daily Story', '/daily', [
        { label: 'Home', hash: '/' },
        { label: 'Daily Story', hash: '/daily' },
        { label: 'Play' }
      ]) + '<div class="error-msg">No story available today. Check back tomorrow!</div>';
      return;
    }

    var c = typeof entry.content === 'string' ? JSON.parse(entry.content) : entry.content;
    var storyTitle = escapeHtml(c.today_title || 'Today\'s Story');
    var dayNum = escapeHtml(c.day_number || '');

    // Determine which steps exist
    var steps = [];
    if (c.card1) steps.push('watch');
    if (c.card2) steps.push('explore');
    if (c.card3 && c.card3.questions && c.card3.questions.length > 0) steps.push('questions');
    totalSteps = steps.length;

    // Store the date for progress tracking
    var storyDate = entry.date || new Date().toISOString().split('T')[0];

    var html = renderHeader('Daily Story', '/daily', [
      { label: 'Home', hash: '/' },
      { label: 'Daily Story', hash: '/daily' },
      { label: storyTitle }
    ]);

    // Progress bar + title
    html += '<div class="ds">';
    html += '<div class="ds__progress"><div class="ds__progress-fill" id="ds-progress"></div></div>';
    html += '<div class="ds__header">';
    if (dayNum) html += '<div class="ds__day">Day ' + dayNum + '</div>';
    html += '<h1 class="ds__title">' + storyTitle + '</h1>';

    // Step indicator pills
    html += '<div class="ds__steps">';
    var stepLabels = { watch: 'Watch', explore: 'Explore', questions: 'Questions' };
    var stepIcons = {
      watch: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21"/></svg>',
      explore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
      questions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    steps.forEach(function(s, i) {
      html += '<button class="ds__step-pill' + (i === 0 ? ' ds__step-pill--active' : '') + '" data-step="' + i + '">'
        + stepIcons[s]
        + '<span>' + stepLabels[s] + '</span>'
        + '</button>';
    });
    html += '</div></div>';

    // Step container
    html += '<div class="ds__viewport" id="ds-viewport">';

    // === STEP 1: WATCH ===
    if (c.card1) {
      var card1 = c.card1;
      var ct = card1.content_type || 'reel';
      var bc = card1.bottom_content || card1.content || {};
      var reading = bc.reading_text || '';

      html += '<div class="ds__panel ds__panel--active" data-step="0">';
      html += '<div class="lesson-wrap">';

      // Build a module-like object to reuse shared renderers
      var mod = {
        content_type: ct,
        media_url: Array.isArray(card1.media_url) ? card1.media_url : [card1.media_url],
        bottom_content: { reading_text: reading, carousel_captions: (bc.captions || bc.carousel_captions || []) }
      };

      if (ct === 'reel' && card1.media_url) {
        html += renderReelPlayer(mod);
      } else if (ct === 'image_carousel' && Array.isArray(card1.media_url)) {
        html += renderImageCarousel(mod);
      } else if (ct === 'video_carousel' && Array.isArray(card1.media_url)) {
        html += renderVideoCarousel(mod);
      }

      html += '</div></div>'; // close lesson-wrap + panel
    }

    // === STEP 2: EXPLORE ===
    if (c.card2) {
      var card2 = c.card2;
      var stepIdx = steps.indexOf('explore');

      html += '<div class="ds__panel" data-step="' + stepIdx + '">';
      html += '<div class="lesson-wrap">';

      if (card2.thumbnail_title) {
        html += '<h2 class="ds__explore-title">' + escapeHtml(card2.thumbnail_title) + '</h2>';
      }

      // Voiceover
      if (card2.inner_voice) {
        html += '<div class="ds__voiceover" id="daily-voiceover">'
          + '<button class="ds__voiceover-btn" id="voiceover-btn">'
          + '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>'
          + '</button>'
          + '<div class="ds__voiceover-info">'
          + '<div class="ds__voiceover-label">Listen to Voiceover</div>'
          + '<div class="ds__voiceover-sub">Tap to play</div>'
          + '</div></div>';
      }

      // Content blocks — reuse scrollable-view classes from era lessons
      if (card2.content_blocks && card2.content_blocks.length > 0) {
        var blocks = card2.content_blocks.slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
        html += '<div class="scrollable-view">';
        blocks.forEach(function(block) {
          if (block.type === 'text' && block.content) {
            // text blocks contain intentional HTML from the CMS
            html += '<div class="scrollable-view__block scrollable-view__block--text">' + block.content + '</div>';
          } else if (block.type === 'image' && block.url) {
            html += '<div class="scrollable-view__block scrollable-view__block--image"><img src="' + sanitizeUrl(block.url) + '" alt="" loading="lazy"></div>';
          }
        });
        html += '</div>';
      }

      html += '</div>';
      html += '</div>';
    }

    // === STEP 3: QUESTIONS (one-at-a-time, reusing era quiz components) ===
    if (c.card3 && c.card3.questions && c.card3.questions.length > 0) {
      var stepIdx = steps.indexOf('questions');
      html += '<div class="ds__panel" data-step="' + stepIdx + '">';
      html += '<div class="quiz-wrap"><div class="quiz fade-in" id="ds-quiz-container"></div></div>';
      html += '</div>';
    }

    html += '</div></div>'; // close viewport + ds

    // Fixed footer for Explore → Questions navigation (outside panels to avoid transform containment)
    var exploreIdx = steps.indexOf('explore');
    var questionsIdx = steps.indexOf('questions');
    if (exploreIdx >= 0 && questionsIdx >= 0) {
      html += '<div class="ds__panel-footer" id="ds-explore-footer" data-show-step="' + exploreIdx + '">'
        + '<button class="ds__next-btn" data-next="' + questionsIdx + '">Continue to Questions <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></button>'
        + '</div>';
    }

    app.innerHTML = html;

    // === Fit reel player to remaining viewport on daily page ===
    var dsReelPlayer = app.querySelector('.ds .reel-player');
    if (dsReelPlayer) {
      _fitDailyReel = function() {
        dsReelPlayer.style.maxHeight = '';
        requestAnimationFrame(function() {
          var top = dsReelPlayer.getBoundingClientRect().top;
          dsReelPlayer.style.maxHeight = (window.innerHeight - top) + 'px';
        });
      };
      _fitDailyReel();
      window.addEventListener('resize', _fitDailyReel);
    }

    // === INIT ===

    // Step navigation
    function goToStep(idx) {
      if (aborted || idx < 0 || idx >= totalSteps) return;

      // Mark the step we're leaving as complete
      if (currentStep < steps.length) {
        setDailyStepComplete(storyDate, steps[currentStep]);
      }

      // Stop media when leaving a step
      if (steps[currentStep] === 'watch') {
        stopBgMusic();
        if (cleanupFn) { cleanupFn(); cleanupFn = null; }
      }
      if (steps[currentStep] === 'explore' && voAudio) {
        voAudio.pause();
      }

      currentStep = idx;

      // Update panels
      app.querySelectorAll('.ds__panel').forEach(function(p) {
        var pStep = parseInt(p.dataset.step, 10);
        p.classList.remove('ds__panel--active', 'ds__panel--exit');
        if (pStep === idx) {
          p.classList.add('ds__panel--active');
        }
      });

      // Update pills
      app.querySelectorAll('.ds__step-pill').forEach(function(pill, i) {
        pill.classList.toggle('ds__step-pill--active', i === idx);
        pill.classList.toggle('ds__step-pill--done', i < idx);
      });

      // Update progress bar
      var pct = ((idx + 1) / totalSteps) * 100;
      var progressEl = document.getElementById('ds-progress');
      if (progressEl) progressEl.style.width = pct + '%';

      // Show/hide fixed footer based on active step
      app.querySelectorAll('.ds__panel-footer[data-show-step]').forEach(function(f) {
        f.style.display = parseInt(f.dataset.showStep, 10) === idx ? '' : 'none';
      });

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Next buttons
    app.querySelectorAll('.ds__next-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var next = parseInt(btn.dataset.next, 10);
        goToStep(next);
      });
    });

    // Step pills
    app.querySelectorAll('.ds__step-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        var step = parseInt(pill.dataset.step, 10);
        goToStep(step);
      });
    });

    // Init progress + jump to requested step
    if (startStep > 0 && startStep < totalSteps) {
      goToStep(startStep);
    } else {
      var progressEl = document.getElementById('ds-progress');
      if (progressEl) progressEl.style.width = ((1) / totalSteps * 100) + '%';
      // Hide fixed footer on initial load if not on its step
      app.querySelectorAll('.ds__panel-footer[data-show-step]').forEach(function(f) {
        if (parseInt(f.dataset.showStep, 10) !== currentStep) f.style.display = 'none';
      });
    }

    // Inject "Continue" button into reading panel (right side), like era quiz buttons
    if (steps.length > 1) {
      var nextStepIdx = 1;
      var nextLabel = steps[1] === 'explore' ? 'Continue to Explore' : 'Continue to Questions';
      var reading = app.querySelector('.reel-player__reading');
      if (reading) {
        var btn = document.createElement('button');
        btn.className = 'ds__next-btn';
        btn.dataset.next = nextStepIdx;
        btn.innerHTML = nextLabel + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>';
        btn.style.width = '100%';
        btn.style.marginTop = '16px';
        btn.addEventListener('click', function() { goToStep(nextStepIdx); });
        reading.appendChild(btn);
      }
    }

    // Init card 1 media
    if (c.card1) {
      var ct = c.card1.content_type || 'reel';
      if (ct === 'reel' && c.card1.media_url) {
        var url = typeof c.card1.media_url === 'string' ? c.card1.media_url : c.card1.media_url[0];
        cleanupFn = initReelPlayer(url);
      } else if (ct === 'image_carousel' || ct === 'video_carousel') {
        var carouselMod = { content_type: ct, media_url: c.card1.media_url, bottom_content: c.card1.bottom_content || c.card1.content || {} };
        cleanupFn = initCarousel(carouselMod);
      }

      if (c.card1.background_music_url) {
        var mediaWrap = app.querySelector('.reel-player__video-wrap') || app.querySelector('.carousel__track-wrap');
        if (mediaWrap) {
          mediaWrap.insertAdjacentHTML('beforeend', renderBgMusicToggle());
        }
        // Only start music if Watch step is active
        if (currentStep === 0 && steps[0] === 'watch') {
          startBgMusic(c.card1.background_music_url);
        }
        initBgMusicToggle();
      }
    }

    // Init voiceover
    if (c.card2 && c.card2.inner_voice) {
      var voBtn = document.getElementById('voiceover-btn');
      if (voBtn) {
        voBtn.addEventListener('click', function() {
          if (!voAudio) {
            voAudio = new Audio(c.card2.inner_voice);
            voAudio.addEventListener('ended', function() {
              voBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
              var sub = document.querySelector('.ds__voiceover-sub');
              if (sub) sub.textContent = 'Tap to replay';
            });
          }
          if (voAudio.paused) {
            voAudio.play().catch(function() {});
            voBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>';
            var sub = document.querySelector('.ds__voiceover-sub');
            if (sub) sub.textContent = 'Playing...';
          } else {
            voAudio.pause();
            voBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>';
            var sub = document.querySelector('.ds__voiceover-sub');
            if (sub) sub.textContent = 'Paused';
          }
        });
      }
    }

    // Init one-at-a-time quiz (reuses era quiz components)
    if (c.card3 && c.card3.questions && c.card3.questions.length > 0) {
      var dsQuestions = c.card3.questions;
      var dsQuizCurrent = 0;
      var dsQuizScore = 0;
      var dsIncorrectAnswers = [];
      var dsQuizContainer = document.getElementById('ds-quiz-container');

      function getRewardVideo(pct) {
        if (pct >= 70) return 'assets/videos/quiz_reward/quiz-reward3.mp4';
        if (pct >= 34) return 'assets/videos/quiz_reward/quiz-reward2.mp4';
        return 'assets/videos/quiz_reward/quiz-reward1.mp4';
      }

      function getResultMessage(pct) {
        if (pct >= 70) return { title: 'Brilliant Effort!', subtitle: "You're getting better every time" };
        return { title: "You've Got This!", subtitle: 'Revisit the story & try again' };
      }

      function getStars(score, total) {
        if (total === 0) return 0;
        var p = score / total;
        if (p >= 1) return 3;
        if (p >= 0.66) return 2;
        if (p >= 0.33) return 1;
        return 0;
      }

      function showDailyQuestion() {
        if (aborted) return;
        dsQuizContainer.innerHTML = renderQuizCard(dsQuestions[dsQuizCurrent], dsQuizCurrent, dsQuestions.length);
        dsQuizContainer.className = 'quiz fade-in';

        attachQuizHandlers(dsQuizContainer, dsQuestions[dsQuizCurrent], function(isCorrect, selectedAnswer) {
          if (aborted) return;
          if (isCorrect) {
            dsQuizScore++;
          } else {
            var correctAns = dsQuestions[dsQuizCurrent].answers.find(function(a) { return a.is_correct; });
            dsIncorrectAnswers.push({
              question: dsQuestions[dsQuizCurrent].question_text,
              userAnswer: selectedAnswer,
              correctAnswer: correctAns ? correctAns.text : ''
            });
          }
          dsQuizCurrent++;

          if (dsQuizCurrent < dsQuestions.length) {
            showDailyQuestion();
          } else {
            showDailyScore();
          }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function showDailyScore() {
        if (aborted) return;
        var total = dsQuestions.length;
        var percentage = Math.round((dsQuizScore / total) * 100);
        var stars = getStars(dsQuizScore, total);
        var videoSrc = getRewardVideo(percentage);
        var msg = getResultMessage(percentage);

        // Mark questions step complete
        setDailyStepComplete(storyDate, 'questions', stars || true);

        // Replace the quiz panel content with the score screen
        var panel = dsQuizContainer.closest('.ds__panel');
        panel.innerHTML = '<div class="quiz-score fade-in">'
          + '<div class="quiz-score__video-wrap">'
          + '<video class="quiz-score__video" autoplay playsinline>'
          + '<source src="' + escapeHtml(videoSrc) + '" type="video/mp4">'
          + '</video></div>'
          + '<div class="quiz-score__title">' + escapeHtml(msg.title) + '</div>'
          + '<div class="quiz-score__subtitle">' + escapeHtml(msg.subtitle) + '</div>'
          + '<div class="quiz-score__stats">'
          + '<div class="quiz-score__stats-left">'
          + '<div class="quiz-score__percentage">' + percentage + '%</div>'
          + '<div class="quiz-score__final">Final Score</div>'
          + '</div>'
          + '<div class="quiz-score__stats-right">'
          + '<div class="quiz-score__correct">Correct: ' + dsQuizScore + '/' + total + '</div>'
          + '</div></div>'
          + '<div class="quiz-score__progress-bar"><div class="quiz-score__progress-fill" style="width:' + percentage + '%"></div></div>'
          + '<div class="quiz-score__actions" id="ds-score-actions">'
          + '<button class="cta-btn" data-action="finish">Finish Story</button>'
          + '<button class="quiz-score__chat" data-action="chat">Chat to Learn More</button>'
          + '</div></div>';

        var actionsEl = document.getElementById('ds-score-actions');
        if (actionsEl) {
          actionsEl.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            if (btn.dataset.action === 'finish') {
              window.location.hash = '/daily';
            } else if (btn.dataset.action === 'chat') {
              if (!isPremium()) { showPaywall(); return; }
              // Build summary from explore content or watch reading text
              var summaryText = '';
              if (c.card2 && c.card2.reading_text) {
                var tmp = document.createElement('div');
                tmp.innerHTML = c.card2.reading_text;
                summaryText = (tmp.textContent || tmp.innerText || '').substring(0, 1000);
              } else if (c.card1 && c.card1.bottom_content && c.card1.bottom_content.reading_text) {
                var tmp = document.createElement('div');
                tmp.innerHTML = c.card1.bottom_content.reading_text;
                summaryText = (tmp.textContent || tmp.innerText || '').substring(0, 1000);
              }

              openChat({
                eraName: c.today_title || 'Daily Story',
                moduleTitle: storyTitle,
                moduleSummary: summaryText,
                incorrectQuestions: dsIncorrectAnswers
              });
            }
          });
        }

        setTimeout(function() { playStars(stars); }, 100);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Show first question when the questions step becomes active
      showDailyQuestion();
    }

  }).catch(function(err) {
    if (aborted) return;
    app.innerHTML = renderHeader('Daily Story', '/daily') + '<div class="error-msg">Failed to load daily story.</div>';
  });

  return function() {
    aborted = true;
    stopBgMusic();
    if (voAudio) { voAudio.pause(); voAudio = null; }
    if (cleanupFn) cleanupFn();
    if (_fitDailyReel) window.removeEventListener('resize', _fitDailyReel);
  };
}
