/* =========================================================
   FOR SAI — SCRIPT
   Modules: particles · progress/mission · reveals ·
   chapter interactions/easter eggs · ambient audio
   ========================================================= */
(() => {
  'use strict';

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = reduceMotionQuery.matches;
  reduceMotionQuery.addEventListener?.('change', (e) => { reduceMotion = e.matches; });

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------------------------------------------------------
     1. AMBIENT PARTICLE CANVAS
     Pauses when tab hidden or reduced motion is on.
  --------------------------------------------------------- */
  const canvas = $('#particles');
  const ctx2d = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let cw = 0, ch = 0;
  let rafId = null;
  let currentColor = '224,71,63';

  const chapterParticleColor = {
    '01': '224,71,63', '02': '224,71,63', '03': '79,209,255', '04': '79,209,255',
    '05': '255,111,102', '06': '217,164,65', '07': '167,139,240', '08': '242,167,195',
    '09': '243,233,218', '10': '224,71,63', '11': '217,164,65'
  };

  function resizeCanvas(){
    if (!canvas) return;
    cw = canvas.width = window.innerWidth;
    ch = canvas.height = window.innerHeight;
  }

  function makeParticles(count){
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * cw,
      y: Math.random() * ch,
      r: Math.random() * 1.6 + 0.4,
      vy: -(Math.random() * 0.18 + 0.05),
      vx: (Math.random() - 0.5) * 0.05,
      a: Math.random() * 0.4 + 0.1
    }));
  }

  function drawParticles(){
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, cw, ch);
    particles.forEach(p => {
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2d.fillStyle = `rgba(${currentColor},${p.a})`;
      ctx2d.shadowColor = `rgba(${currentColor},0.55)`;
      ctx2d.shadowBlur = 4;
      ctx2d.fill();
      p.y += p.vy;
      p.x += p.vx;
      if (p.y < -10){ p.y = ch + 10; p.x = Math.random() * cw; }
    });
    rafId = requestAnimationFrame(drawParticles);
  }

  function startParticleLoop(){
    if (rafId || document.hidden) return;
    rafId = requestAnimationFrame(drawParticles);
  }
  function stopParticleLoop(){
    if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  }

  if (canvas && ctx2d){
    resizeCanvas();
    makeParticles(reduceMotion ? 14 : 42);
    if (reduceMotion){
      drawParticles(); // draw a single static frame, no loop
    } else {
      startParticleLoop();
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        makeParticles(reduceMotion ? 14 : 42);
      }, 150);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopParticleLoop();
      else if (!reduceMotion) startParticleLoop();
    });
  }

  /* ---------------------------------------------------------
     2. MISSION INDICATOR + SCROLL PROGRESS
  --------------------------------------------------------- */
  const missionNumEl   = $('#missionNum');
  const missionTitleEl = $('#missionTitleEl');
  const missionProgress = $('#missionProgress');
  const mpFill = $('#mpFill');
  const mpPct  = $('#mpPct');
  const chapters = $$('.chapter[data-chapter]');
  const finalChapter = $('#cFinal');

  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (missionNumEl)   missionNumEl.textContent = el.dataset.mission || '';
      if (missionTitleEl) missionTitleEl.textContent = el.dataset.title || '';
      currentColor = chapterParticleColor[el.dataset.chapter] || currentColor;
      setActiveSoundChapter(el.dataset.chapter);
      if (missionProgress) missionProgress.classList.toggle('is-hidden', el === finalChapter);
    });
  }, { threshold: 0.55 });
  chapters.forEach(c => chapterObserver.observe(c));

  let progressTicking = false;
  function updateProgress(){
    progressTicking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    if (mpFill) mpFill.style.width = pct + '%';
    if (mpPct)  mpPct.textContent = Math.round(pct) + '%';
  }
  window.addEventListener('scroll', () => {
    if (!progressTicking){
      progressTicking = true;
      requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  updateProgress();

  /* ---------------------------------------------------------
     3. GENERIC SCROLL-TRIGGERED LINE-STACK REVEALS
     (skips stacks that are gated behind an interaction)
  --------------------------------------------------------- */
  function revealStack(stack){
    if (!stack || stack.classList.contains('is-visible')) return;
    stack.classList.add('is-visible');
    $$('p', stack).forEach((p, i) => {
      p.style.transitionDelay = reduceMotion ? '0ms' : `${i * 180}ms`;
    });
  }

  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const stack = entry.target;
      if (stack.dataset.revealAfter) return; // gated behind interaction, handled separately
      revealStack(stack);
      staggerObserver.unobserve(stack);
    });
  }, { threshold: 0.32 });
  $$('.line-stack').forEach(s => staggerObserver.observe(s));

  const emphasisObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.revealAfter) return;
      el.classList.add('is-visible');
      emphasisObserver.unobserve(el);
    });
  }, { threshold: 0.4 });
  $$('.emphasis').forEach(e => emphasisObserver.observe(e));

  /* ---------------------------------------------------------
     4. CH 01 — ENTRY SEQUENCE + SPIDEY EASTER EGG
  --------------------------------------------------------- */
  $$('#c1 [data-delay]').forEach(el => {
    const delay = reduceMotion ? 0 : parseInt(el.dataset.delay, 10) || 0;
    setTimeout(() => el.classList.add('is-shown'), delay);
  });

  const enterBtn = $('#enterBtn');
  enterBtn?.addEventListener('click', () => {
    $('#c2')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  let spideyTaps = 0;
  const spideyEgg = $('#spideyEgg');
  $('#spideySwing')?.addEventListener('click', () => {
    spideyTaps++;
    if (spideyTaps === 3){
      spideyEgg.textContent = 'Friendly neighborhood apology: successfully delivered.';
      spideyEgg.classList.add('is-set');
    }
  });

  /* ---------------------------------------------------------
     5. CH 02 — SORRY WEB NODES
  --------------------------------------------------------- */
  const webMsg = $('#webMsg');
  const webHint = $('#webHint');
  const webStack = $('#c2 .line-stack[data-reveal-after="webBoard"]');
  const webFinalEmphasis = $('#c2 .emphasis[data-reveal-after="webBoard"]');
  const webTapped = new Set();
  const WEB_UNLOCK_COUNT = 3;

  $$('.web-node').forEach(node => {
    node.addEventListener('click', () => {
      node.classList.add('popped');
      node.classList.remove('just-tapped');
      // restart the pulse animation even on repeated taps
      void node.offsetWidth;
      node.classList.add('just-tapped');

      webMsg.textContent = node.dataset.msg;
      webTapped.add(node);

      const remaining = Math.max(0, WEB_UNLOCK_COUNT - webTapped.size);
      if (webHint){
        webHint.textContent = remaining > 0 ? `${remaining} more to unlock` : 'Unlocked';
        if (remaining === 0) webHint.classList.add('done');
      }

      if (webTapped.size >= WEB_UNLOCK_COUNT){
        revealStack(webStack);
        if (webFinalEmphasis) webFinalEmphasis.classList.add('is-visible');
      }
    });
  });

  /* ---------------------------------------------------------
     6. CH 03 — IRON MAN HUD / EGO SWITCH
  --------------------------------------------------------- */
  const egoSwitch = $('#egoSwitch');
  const switchLabel = $('#switchLabel');
  const ironSpeech = $('#ironSpeech');
  const missionStatus = $('#missionStatus');

  egoSwitch?.addEventListener('click', () => {
    const isOn = egoSwitch.getAttribute('aria-pressed') === 'true';
    const nowOff = !isOn;
    egoSwitch.setAttribute('aria-pressed', String(nowOff));
    if (switchLabel) switchLabel.textContent = nowOff ? 'EGO: OFF ✓' : 'EGO: ON';
    if (ironSpeech) ironSpeech.textContent = nowOff ? 'Ego? Powered down.' : 'Ego? Powering down.';
    missionStatus?.classList.add('is-visible');
  });

  const c3 = $('#c3');
  if (c3){
    const c3Observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          setTimeout(() => missionStatus?.classList.add('is-visible'), reduceMotion ? 0 : 1600);
          c3Observer.unobserve(c3);
        }
      });
    }, { threshold: 0.5 });
    c3Observer.observe(c3);
  }

  /* ---------------------------------------------------------
     7. CH 04 — ARC REACTOR (easter egg: 3rd tap -> EGO: OFF)
  --------------------------------------------------------- */
  const arcHeart = $('#arcHeart');
  const arcOrbits = $('#arcOrbits');
  const arcStack = $('#c4 .line-stack[data-reveal-after="arcHeart"]');
  const arcEgg = $('#arcEgg');
  let arcTaps = 0;

  arcHeart?.addEventListener('click', () => {
    arcTaps++;
    arcHeart.classList.add('activated');
    arcOrbits?.classList.add('is-visible');
    revealStack(arcStack);
    if (arcTaps === 3 && arcEgg){
      arcEgg.textContent = 'EGO: OFF';
      arcEgg.classList.add('is-set');
    }
  });

  /* ---------------------------------------------------------
     8. CH 05 — UPSIDE DOWN (ambient glitch + hidden particle)
  --------------------------------------------------------- */
  const c5 = $('#c5');
  if (c5){
    const glitchObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          c5.classList.add('glitch-active');
          glitchObserver.unobserve(c5);
        }
      });
    }, { threshold: 0.5 });
    glitchObserver.observe(c5);
  }

  const tapParticle = $('#tapParticle');
  const upsideEgg = $('#upsideEgg');
  let upsideEggTimer = null;
  tapParticle?.addEventListener('click', () => {
    c5.classList.add('glitching');
    setTimeout(() => c5.classList.remove('glitching'), 500);
    upsideEgg.textContent = 'You found the Upside Down.';
    upsideEgg.classList.add('is-set');
    clearTimeout(upsideEggTimer);
    upsideEggTimer = setTimeout(() => {
      upsideEgg.textContent = 'Unfortunately… sorry is still necessary here.';
    }, 1500);
  });

  /* ---------------------------------------------------------
     9. CH 06 — 80s ROOM (fairy lights, S-A-I wall, TV egg)
  --------------------------------------------------------- */
  const fairyLights = $('#fairyLights');
  const alphabetWall = $('#alphabetWall');

  if (fairyLights){
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 10; i++){
      const bulb = document.createElement('span');
      bulb.className = 'bulb';
      frag.appendChild(bulb);
    }
    fairyLights.appendChild(frag);
  }

  if (alphabetWall){
    const frag = document.createDocumentFragment();
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = letter;
      span.dataset.letter = letter;
      frag.appendChild(span);
    });
    alphabetWall.appendChild(frag);
  }

  const c6 = $('#c6');
  let roomAnimated = false;
  if (c6){
    const roomObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !roomAnimated){
          roomAnimated = true;
          const bulbs = $$('.bulb', fairyLights);
          bulbs.forEach((b, i) => setTimeout(() => b.classList.add('lit'), reduceMotion ? 0 : i * 150));

          const spellDelay = reduceMotion ? 0 : bulbs.length * 150 + 400;
          ['S', 'A', 'I'].forEach((ch, idx) => {
            setTimeout(() => {
              const target = $(`.letter[data-letter="${ch}"]`, alphabetWall);
              target?.classList.add('active');
            }, spellDelay + idx * 500);
          });
          roomObserver.unobserve(c6);
        }
      });
    }, { threshold: 0.4 });
    roomObserver.observe(c6);
  }

  const tvEgg = $('#tvEgg');
  $('#tvTap')?.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('on');
    tvEgg.textContent = 'Friends don\u2019t lie.';
    tvEgg.classList.add('is-set');
  });

  /* ---------------------------------------------------------
     10. CH 09 — QUIET (glow-in for "I'm really sorry.")
  --------------------------------------------------------- */
  const reallySorry = $('#reallySorry');
  const c9 = $('#c9');
  if (c9 && reallySorry){
    const c9Observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          setTimeout(() => reallySorry.classList.add('glow-in'), reduceMotion ? 0 : 1400);
          c9Observer.unobserve(c9);
        }
      });
    }, { threshold: 0.5 });
    c9Observer.observe(c9);
  }

  /* ---------------------------------------------------------
     11. FINAL CHAPTER — sequenced reveal + heart easter egg
  --------------------------------------------------------- */
  if (finalChapter){
    const finaleObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          $$('.finale-line, .finale-main, .finale-sign', finalChapter).forEach(el => {
            const delay = reduceMotion ? 0 : parseInt(el.dataset.delay || '0', 10);
            setTimeout(() => el.classList.add('is-shown'), delay);
          });
          finaleObserver.unobserve(finalChapter);
        }
      });
    }, { threshold: 0.4 });
    finaleObserver.observe(finalChapter);
  }

  const finalEgg = $('#finalEgg');
  $('#finalHeart')?.addEventListener('click', () => {
    finalEgg.textContent = 'Okay… one last sorry.';
    finalEgg.classList.add('is-set');
  });

  /* ---------------------------------------------------------
     12. AMBIENT SOUND SYSTEM
     - Starts only after explicit user interaction (autoplay-safe)
     - Single AudioContext, single oscillator pair, reused
     - Cleaned up fully on toggle-off
  --------------------------------------------------------- */
  const soundBtn = $('#soundToggle');
  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  const chapterTone = {
    '01': { f1: 140, f2: 210, type: 'sine',     cutoff: 900  },
    '02': { f1: 150, f2: 220, type: 'sine',     cutoff: 900  },
    '03': { f1: 220, f2: 330, type: 'sine',     cutoff: 1800 },
    '04': { f1: 220, f2: 330, type: 'sine',     cutoff: 1800 },
    '05': { f1: 70,  f2: 95,  type: 'sine',     cutoff: 500  },
    '06': { f1: 160, f2: 200, type: 'triangle', cutoff: 1200 },
    '07': { f1: 180, f2: 260, type: 'sine',     cutoff: 1400 },
    '08': { f1: 190, f2: 250, type: 'sine',     cutoff: 1200 },
    '09': { f1: 110, f2: 150, type: 'sine',     cutoff: 700  },
    '10': { f1: 180, f2: 260, type: 'sine',     cutoff: 1300 },
    '11': { f1: 200, f2: 280, type: 'sine',     cutoff: 1500 }
  };

  let audioCtx = null, oscA = null, oscB = null, filterNode = null, gainNode = null;
  let soundOn = false;

  function buildAmbient(){
    try{
      audioCtx = audioCtx || new AudioCtor();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      oscA = audioCtx.createOscillator();
      oscB = audioCtx.createOscillator();
      filterNode = audioCtx.createBiquadFilter();
      gainNode = audioCtx.createGain();

      filterNode.type = 'lowpass';
      filterNode.frequency.value = 900;
      gainNode.gain.value = 0;

      oscA.connect(filterNode);
      oscB.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscA.start();
      oscB.start();
      gainNode.gain.linearRampToValueAtTime(0.035, audioCtx.currentTime + 1.2);
    } catch (err){
      soundOn = false;
      soundBtn?.setAttribute('aria-pressed', 'false');
    }
  }

  function setActiveSoundChapter(chapterNum){
    if (!soundOn || !audioCtx || !oscA || !oscB || !filterNode) return;
    const tone = chapterTone[chapterNum];
    if (!tone) return;
    try{
      const now = audioCtx.currentTime;
      oscA.type = tone.type; oscB.type = tone.type;
      oscA.frequency.linearRampToValueAtTime(tone.f1, now + 0.8);
      oscB.frequency.linearRampToValueAtTime(tone.f2, now + 0.8);
      filterNode.frequency.linearRampToValueAtTime(tone.cutoff, now + 0.8);
    } catch (err){ /* fail silently, sound is a non-essential enhancement */ }
  }

  function stopAmbient(){
    if (!audioCtx || !gainNode){ oscA = oscB = filterNode = gainNode = null; return; }
    try{
      const now = audioCtx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
    } catch (err){ /* ignore */ }
    const stopA = oscA, stopB = oscB;
    setTimeout(() => {
      try{ stopA?.stop(); stopB?.stop(); } catch (err){ /* already stopped */ }
    }, 700);
    oscA = null; oscB = null; filterNode = null; gainNode = null;
  }

  if (soundBtn){
    if (!AudioCtor){
      soundBtn.setAttribute('disabled', 'true');
      soundBtn.setAttribute('aria-label', 'Ambient sound is not supported in this browser');
    } else {
      soundBtn.addEventListener('click', () => {
        soundOn = !soundOn;
        soundBtn.setAttribute('aria-pressed', String(soundOn));
        soundBtn.setAttribute('aria-label', soundOn ? 'Turn ambient sound off' : 'Turn ambient sound on');

        if (soundOn){
          buildAmbient();
          const visible = chapters.find(c => {
            const r = c.getBoundingClientRect();
            return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
          });
          setActiveSoundChapter(visible ? visible.dataset.chapter : '01');
        } else {
          stopAmbient();
        }
      });
    }

    // stop sound cleanly if the tab is hidden for a long time / page unloads
    window.addEventListener('pagehide', () => { if (soundOn) stopAmbient(); });
  }

})();