/* WAVES — One-page album app. Edit content in tracks.json and presentation in styles.css. */
"use strict";

const TRACK_DATA_URL = "tracks.json";
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
const ICON_LYRICS = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>';
const ICON_BEHIND = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 8l2-5h16l-2 5M7 4l3 4M13 4l3 4"/></svg>';
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");

const els = {
  list: document.getElementById("tracklist"),
  artwork: document.getElementById("artworkView"),
  details: document.getElementById("detailView"),
  detailBody: document.getElementById("detailBody"),
  lyricsTab: document.getElementById("lyricsTab"),
  behindTab: document.getElementById("behindTab"),
  backToCover: document.getElementById("backToCover"),
  previous: document.getElementById("previousTrack"),
  next: document.getElementById("nextTrack"),
  playerStatus: document.getElementById("playerStatus"),
  cover: document.getElementById("waveCover"),
};

const audio = new Audio();
audio.preload = "none";
let catalog = null;
let selectedIndex = null;
let playingIndex = null;
let activeView = "cover"; // 'cover' | 'lyrics' | 'behind'
let pendingPlay = 0;

function showError(message) {
  els.playerStatus.textContent = message;
}

function updateURL() {
  if (!catalog || window.location.protocol === "file:") return;
  const u = new URL(window.location.href);
  if (selectedIndex === null || activeView === "cover") {
    u.searchParams.delete("track");
    u.searchParams.delete("view");
  } else {
    u.searchParams.set("track", String(catalog.tracks[selectedIndex].id));
    u.searchParams.set("view", activeView);
  }
  history.replaceState(null, "", u);
}

function trackRow(track, index) {
  const selected = index === selectedIndex && activeView !== "cover";
  const playing = index === playingIndex && !audio.paused;
  return `<li class="track ${selected ? "is-selected" : ""}" data-index="${index}">
    <span class="track-number">${pad(track.id)}</span>
    <span class="track-name">${escapeHTML(track.title)}</span>
    <span class="track-duration">${escapeHTML(track.duration)}</span>
    <button type="button" class="play-btn ${playing ? "is-playing" : ""}" data-action="play" data-index="${index}"
      title="${playing ? "Pause" : "Play"} ${escapeHTML(track.title)}" aria-label="${playing ? "Pause" : "Play"} ${escapeHTML(track.title)}"
      aria-pressed="${playing}">${playing ? ICON_PAUSE : ICON_PLAY}</button>
    <button type="button" class="detail-action lyrics-action ${selected && activeView === "lyrics" ? "is-current" : ""}"
      data-action="lyrics" data-index="${index}" aria-label="Show lyrics for ${escapeHTML(track.title)}">${ICON_LYRICS} <span>Lyrics</span></button>
    <button type="button" class="detail-action behind-action ${selected && activeView === "behind" ? "is-current" : ""}"
      data-action="behind" data-index="${index}" aria-label="Show behind the scenes for ${escapeHTML(track.title)}">${ICON_BEHIND} <span>Behind the Scenes</span></button>
  </li>`;
}

function renderTracklist() {
  els.list.innerHTML = catalog.tracks.map(trackRow).join("");
}

function selectTrack(index, view, options = {}) {
  if (!catalog || index < 0 || index >= catalog.tracks.length) return;
  selectedIndex = index;
  activeView = view;
  els.artwork.hidden = view !== "cover";
  els.details.hidden = view === "cover";
  if (view !== "cover") {
    els.lyricsTab.setAttribute("aria-selected", String(view === "lyrics"));
    els.behindTab.setAttribute("aria-selected", String(view === "behind"));
    renderDetails();
  }
  renderTracklist();
  updateURL();
  // On small screens, open the selected information where it is visible.
  if (options.scroll && innerWidth <= 820) {
    (view === "cover" ? els.artwork : els.details).scrollIntoView({block: "start", behavior: "smooth"});
  }
}

function renderLyrics(track) {
  const sections = Array.isArray(track.lyrics) ? track.lyrics : [];
  if (!sections.length) return '<p class="empty-message">Lyrics coming soon.</p>';
  return `${track.demo ? '<p class="demo-note">Warning: Explicit Lyrics</p>' : ''}` + sections.map(section => `<section class="lyrics-group">
    <h3 class="lyrics-label">${escapeHTML(section.label)}</h3>
    <p class="lyrics-lines">${escapeHTML((section.lines || []).join("\n"))}</p>
  </section>`).join("");
}

function renderAIRow(label, obj) {
  const value = obj?.percent;
  const valid = typeof value === "number" && Number.isFinite(value);
  const safeValue = valid ? Math.max(0, Math.min(100, value)) : 0;
  const model = obj?.model || (valid ? "Model not specified" : "Not documented yet");
  return `<div class="ai-item">
      <div class="ai-row"><span class="ai-label">${escapeHTML(label)}</span>
        <div class="ai-track" role="meter" aria-label="AI use in ${escapeHTML(label)}" aria-valuemin="0" aria-valuemax="100"
          ${valid ? `aria-valuenow="${safeValue}"` : 'aria-valuetext="Not documented"'}>
          <div class="ai-fill" style="width:${safeValue}%"></div>
        </div><span class="ai-number">${valid ? `${safeValue}%` : "—"}</span></div>
  
    </div>`;
}

function renderBehind(track) {
  const story = track.story || {};
  const ai = track.ai || {};
  const elements = Array.isArray(track.elements) ? track.elements : [];
  const master = catalog.mastering || {};
  const production = catalog.production || {};
  return `
    ${track.demo ? '<p class="demo-note">EXAMPLE VALUES — replace before publishing</p>' : ""}
    <section class="behind-block">
      <h3 class="mini-heading">THE IDEA</h3>
      <p class="idea-copy">${escapeHTML(story.lead || "Add the idea behind this song in tracks.json.")}</p>
      ${story.context ? `<p class="idea-explainer">${escapeHTML(story.context)}</p>` : ""}
    </section>
    <section class="behind-block">
      <h3 class="mini-heading">AI CONTRIBUTION</h3>
      <div class="ai-grid">
        ${renderAIRow("Lyrics", ai.lyrics)}
        ${renderAIRow("Melody & Composition", ai.melody)}
        ${renderAIRow("Interpretation / Vocals", ai.vocals)}
      </div>
    </section>
    <section class="behind-block">
      <h3 class="mini-heading">INSTRUMENTS &amp; METHODS</h3>
      ${elements.length ? `<table class="method-table"><colgroup><col><col><col></colgroup>
         <thead><tr><th>Element</th><th>Method</th><th>Model / Tool / Rack</th></tr></thead>
         <tbody>${elements.map(e => `<tr><td>${escapeHTML(e.name)}</td><td>${escapeHTML(e.method || "To document")}</td>
         <td>${escapeHTML(Array.isArray(e.tools) ? e.tools.join(" · ") : (e.tools || "To document"))}</td></tr>`).join("")}</tbody>
         </table>` : '<p class="empty-message">Add your instruments and techniques in tracks.json.</p>'}
    </section>
	<section class="behind-block">
  <h3 class="mini-heading">PRODUCTION ENVIRONMENT</h3>
  <p class="mastering-copy">
    ${escapeHTML(production.daw || "")}
  </p>
  <p class="mastering-steps">
    ${escapeHTML(production.description || "")}
  </p>
</section>
    <section class="behind-block">
      <h3 class="mini-heading">MASTERING</h3>
      <p class="mastering-copy">${escapeHTML(master.description || "Describe the album-wide mastering process here.")}</p>
      ${Array.isArray(master.steps) ? `<p class="mastering-steps">${escapeHTML(master.steps.join(" · "))}</p>` : ""}
    </section>`;
}

function renderDetails() {
  const track = catalog.tracks[selectedIndex];
  els.detailBody.innerHTML = `<div class="song-heading"><span class="song-number">${pad(track.id)}</span>
    <h2 class="song-title">${escapeHTML(track.title)}</h2></div>
    ${activeView === "lyrics" ? renderLyrics(track) : renderBehind(track)}`;
  els.detailBody.scrollTop = 0;
  const prev = catalog.tracks[selectedIndex - 1];
  const next = catalog.tracks[selectedIndex + 1];
  els.previous.disabled = !prev;
  els.next.disabled = !next;
  els.previous.innerHTML = prev ? `← <span style="color:var(--purple)">${pad(prev.id)}</span> ${escapeHTML(prev.title)}` : "";
  els.next.innerHTML = next ? `${escapeHTML(next.title)} <span style="color:var(--purple)">${pad(next.id)}</span> →` : "";
}

async function playTrack(index) {
  if (!catalog || index < 0 || index >= catalog.tracks.length) return;
  showError("");
  // The play button opens lyrics on the left as in the approved mockup.
  selectTrack(index, "lyrics", {scroll:true});
  const track = catalog.tracks[index];
  const request = ++pendingPlay;

  if (playingIndex === index && !audio.paused) {
    audio.pause();
    renderTracklist();
    return;
  }
  if (playingIndex !== index) {
    audio.pause();
    playingIndex = index;
    audio.src = track.audio; // Relative path; browser URL-encodes spaces in filenames.
    audio.load();
  }

  try {
    // Must be called directly in the click handler's flow for autoplay policies.
    await audio.play();
    if (request === pendingPlay) renderTracklist();
  } catch (err) {
    if (request !== pendingPlay) return;
    showError(`Could not play “${track.title}”. Check that ${track.audio} exists beside index.html.`);
    renderTracklist();
    console.warn("Audio playback failed", err);
  }
}

els.list.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const index = Number(button.dataset.index);
  if (button.dataset.action === "play") { void playTrack(index); return; }
  selectTrack(index, button.dataset.action, {scroll: true});
});
els.lyricsTab.addEventListener("click", () => selectedIndex !== null && selectTrack(selectedIndex,"lyrics"));
els.behindTab.addEventListener("click", () => selectedIndex !== null && selectTrack(selectedIndex,"behind"));
els.backToCover.addEventListener("click", () => {
  activeView = "cover";
  els.artwork.hidden = false;
  els.details.hidden = true;
  selectedIndex = null;
  renderTracklist();
  updateURL();
  if (innerWidth <= 820) els.artwork.scrollIntoView({behavior:"smooth",block:"start"});
});
els.previous.addEventListener("click", () => selectedIndex !== null && selectTrack(selectedIndex-1,activeView));
els.next.addEventListener("click", () => selectedIndex !== null && selectTrack(selectedIndex+1,activeView));
audio.addEventListener("play", renderTracklist);
audio.addEventListener("pause", renderTracklist);
audio.addEventListener("ended", () => {playingIndex = null; renderTracklist();});
audio.addEventListener("error", () => {
  if (playingIndex !== null && catalog) {
    const track = catalog.tracks[playingIndex];
    showError(`Audio unavailable: ${track.audio}. Place the original MP3 in the same folder.`);
  }
});

// Canvas overlay: original 1,800-particle ribbon + glowing wave filaments.
function setupWaveCanvas() {
  const c = document.getElementById("waveCanvas");
  const x = c.getContext("2d", {alpha: true});
  if (!x) return;
  const cover = els.cover;
  const img = document.getElementById("albumImage");
  const R = Math.random, S = Math.sin;
  let W=0,H=0,t=0,dust=[];
  function resize() {
    W=cover.clientWidth;H=cover.clientHeight;
    if (!(W>0 && H>0)) return;
    const d=Math.min(window.devicePixelRatio || 1,2);
    c.width=Math.round(W*d);c.height=Math.round(H*d);
    x.setTransform(d,0,0,d,0,0);
    dust=Array.from({length:1800},()=>({
      p:R(),o:(R()-.5)*60,z:.3+R()*1.4,a:.05+R()*.5,s:.00005+R()*.00025,q:R()*6
    }));
  }
  function wave(X,i) {
    const q=X/W;
    const center=Math.pow(Math.abs(q-.5)*2,.7);
    const amp=H*(.025+center*(.04+i*.008));
    return H*.5+S(X/W*7+t*.4+i)*amp+S(X/W*3-t*.2+i)*H*.02;
  }
  function filament(i) {
    x.beginPath();
    for (let X=0;X<W;X+=3) {
      const Y=wave(X,i);
      if (X) x.lineTo(X,Y); else x.moveTo(X,Y);
    }
    x.shadowColor="#b9a7ff";x.shadowBlur=15;
    x.strokeStyle="rgba(235,225,255,.35)";x.lineWidth=1;x.stroke();x.shadowBlur=0;
  }
  function glow(X,Y,r) {
    const g=x.createRadialGradient(X,Y,0,X,Y,r);
    g.addColorStop(0,"rgba(255,255,255,.9)");
    g.addColorStop(.15,"rgba(200,180,255,.4)");
    g.addColorStop(1,"transparent");
    x.fillStyle=g;x.beginPath();x.arc(X,Y,r,0,Math.PI*2);x.fill();
  }
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function draw(){
    if (W>0 && H>0 && !els.artwork.hidden && !document.hidden) {
      t+=.012;
      x.clearRect(0,0,W,H);
      x.globalCompositeOperation="lighter";
      for(let i=0;i<5;i++)filament(i);
      for(const p of dust){
        p.p+=p.s;if(p.p>1)p.p=0;
        const X=p.p*W,Y=wave(X,p.q|0)+p.o*S(p.p*Math.PI);
        x.fillStyle=`rgba(190,170,255,${p.a})`;
        x.beginPath();x.arc(X,Y,p.z,0,Math.PI*2);x.fill();
      }
      glow(W/2,H/2,Math.min(W,H)*.12);
      x.globalCompositeOperation="source-over";
    }
    if(!reducedMotion) requestAnimationFrame(draw);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(cover);
  img.addEventListener("error", () => img.classList.add("is-missing"));
  if (img.complete && img.naturalWidth === 0) img.classList.add("is-missing");
  resize(); draw();
}

async function boot() {
  setupWaveCanvas();
  try {
    const response = await fetch(TRACK_DATA_URL, {cache:"no-cache"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalog=await response.json();
    if (!Array.isArray(catalog.tracks) || catalog.tracks.length !== 12) throw new Error("tracks.json must contain 12 tracks");
    renderTracklist();
    const query=new URLSearchParams(location.search);
    const id=Number(query.get("track"));
    const view=query.get("view");
    const index=catalog.tracks.findIndex(t=>t.id===id);
    if (index>=0 && ["lyrics","behind"].includes(view)) selectTrack(index,view);
  } catch (err) {
    console.error("Loading tracks.json failed",err);
    const fileHelp = location.protocol === "file:" ? " Opening index.html with file:// blocks JSON loading. Run start-local.bat or serve the folder over HTTP." : " Check tracks.json is published next to index.html.";
    els.list.innerHTML=`<li class="empty-message">Could not load song data.${escapeHTML(fileHelp)}</li>`;
  }
}
boot();
