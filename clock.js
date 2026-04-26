/* 
  clock.js
  This is the main brain of our application.
*/

// --- DATA ---
const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let alarmIsRinging = false;
let blinkColon = true;

// --- UTILITY FUNCTIONS ---
// Adds a "0" in front of single digit numbers (e.g., turns "9" into "09")
function padZero(num) {
  return num < 10 ? "0" + num : num;
}

// --- MAIN CLOCK LOOP ---
function updateClock() {
  const now = new Date(); // Get the exact current time from the computer

  // 1. Format the Time
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const isAmPmFormat = Config.get("am_pm") === "1";
  let amPmString = "";

  if (isAmPmFormat) {
    amPmString = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
  }

  // === SENIOR ENGINEER TRICK ===
  // If the hour is single-digit (e.g. "2"), we inject a fully invisible "8" in front of it.
  // This physically forces the width of "2:56" to perfectly match the background "88:88"!
  // === 1. FORMAT THE REAL TIME ===
  const displayHours = hours < 10 ? `<span style="opacity: 0">8</span>${hours}` : hours;
  blinkColon = !blinkColon;
  const colonHtml = `<span style="opacity: ${blinkColon ? 1 : 0}">:</span>`;
  const htmlTimeString = `${displayHours}${colonHtml}${padZero(minutes)}`;

  // === 2. FORMAT THE GHOST TIME (Perfect HTML Clone) ===
  const ghostHours = hours < 10 ? `<span style="opacity: 1">8</span>8` : '88';
  const ghostColonHtml = `<span>:</span>`;
  const ghostHtmlTimeString = `${ghostHours}${ghostColonHtml}88`;

  // === 3. PUSH TO REAL LAYER ===
  document.getElementById('time').innerHTML = htmlTimeString;
  document.getElementById('sec').textContent = padZero(seconds);
  document.getElementById('am_pm').textContent = amPmString;

  // === 4. PUSH TO GHOST LAYER ===
  document.getElementById('ghost-time').innerHTML = ghostHtmlTimeString;
  document.getElementById('ghost-sec').textContent = '88';
  // The "8M" Trick: '8' covers the unlit 'A' and 'P'. 'M' ensures the exact same physical width!

  // Only show the '8M' ghost if we are actually in AM/PM mode!
  if (isAmPmFormat) {
    document.getElementById('ghost-am_pm').textContent = '8M';
  } else {
    document.getElementById('ghost-am_pm').textContent = '';
  }

  // === 5. HANDLE VISIBILITY TOGGLES ===
  const showSec = Config.get("show_seconds") === "1";
  const showDate = Config.get("show_date") === "1";

  const realSec = document.getElementById('sec');
  const ghostSec = document.getElementById('ghost-sec');
  const dateWrapper = document.querySelector('.date-wrapper');

  // Toggle Seconds
  if (showSec) {
    realSec.classList.remove('hidden');
    ghostSec.classList.remove('hidden');
  } else {
    realSec.classList.add('hidden');
    ghostSec.classList.add('hidden');
  }

  // Toggle Date
  if (showDate) {
    dateWrapper.classList.remove('hidden');
  } else {
    dateWrapper.classList.add('hidden');
  }

  // Update the Browser Tab Title
  const plainTimeString = `${hours}:${padZero(minutes)}`;
  document.title = `${plainTimeString} ${amPmString} - Hi-Tech Clock`;

  // 2. Format the Date
  const dayName = dayOfWeekNames[now.getDay()];
  const monthName = monthNames[now.getMonth()];
  const dateNum = now.getDate();
  const yearNum = now.getFullYear();

  // Create numeric versions (e.g., turns "9" into "09")
  const numericMonth = padZero(now.getMonth() + 1);
  const numericDate = padZero(dateNum);

  // Read the chosen format from memory
  const formatPref = Config.get("date_format");
  let finalDateString = "";

  switch (formatPref) {
    case "1": finalDateString = `${numericMonth}/${numericDate}/${yearNum}`; break; // US
    case "2": finalDateString = `${numericDate}/${numericMonth}/${yearNum}`; break; // Global
    case "3": finalDateString = `${yearNum}-${numericMonth}-${numericDate}`; break; // ISO
    case "0":
    default: finalDateString = `${dayName}, ${monthName} ${dateNum} ${yearNum}`; break; // Full Text
  }

  // Push the final configured string to the screen
  // (This replaces the old separate #day_of_week and #date spans with one clean string)
  document.querySelector('.date-wrapper').textContent = finalDateString;

  // Update the Browser Tab Title using the plain text version
  document.title = `${plainTimeString} ${amPmString} - Hi-Tech Clock`;

  // 3. Handle Colors
  applyTheme();

  // 4. Handle Alarms
  checkAlarm(now, hours, minutes, seconds);
  checkHourlyChime(now, minutes, seconds);
}

// --- ALARM SYSTEM ---
function checkAlarm(now, currentHour, currentMin, currentSec) {
  const alarmOn = Config.get("alarm_on") === "1";
  const alarmEl = document.getElementById('alarm');

  if (!alarmOn) {
    alarmEl.textContent = "";
    return;
  }

  const aHour = parseInt(Config.get("alarm_hour"), 10);
  const aMin = parseInt(Config.get("alarm_min"), 10);

  // Trigger the alarm exactly when the minute starts!
  if (!alarmIsRinging && now.getHours() === aHour && currentMin === aMin && currentSec === 0) {
    alarmIsRinging = true;
    playAlarmSound();
    showNotification();
  }

  // Update the alarm text on screen
  if (alarmIsRinging && currentSec % 2 === 0) {
    alarmEl.textContent = ">>> ALARM! <<<"; // Flashes every other second
  } else if (alarmIsRinging) {
    alarmEl.textContent = "";
  } else {
    // Show what time the alarm is set for
    let displayHour = aHour;
    let displayAmPm = "";
    if (Config.get("am_pm") === "1") {
      displayAmPm = aHour >= 12 ? "PM" : "AM";
      displayHour = aHour % 12 || 12;
    }
    alarmEl.textContent = `Alarm Set: ${displayHour}:${padZero(aMin)} ${displayAmPm}`;
  }
}

// --- UNBREAKABLE AUDIO SYNTHESIZER ---
let alarmBeepInterval;
let audioCtx;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(880, ctx.currentTime);

  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

// SHARED DOUBLE-BEEP: Used by both Alarm and Hourly Chime
function playDoubleBeep() {
  beep();
  setTimeout(beep, 150);
}

function playAlarmSound() {
  playDoubleBeep();
  alarmBeepInterval = setInterval(playDoubleBeep, 1000);
}

function dismissAlarm() {
  Config.set("alarm_on", "0");
  alarmIsRinging = false;
  document.getElementById('alarm').textContent = "";
  if (alarmBeepInterval) clearInterval(alarmBeepInterval);
}

// NEW: Hourly Chime Engine
// NEW: Smart Hourly Chime & AI Voice Engine
// A list of exciting AI voice announcements. 
// You can easily add as many as you want here! Just use [TIME] where the hour should go.
const voicePhrases = [
  "Attention commander, it is exactly [TIME].",
  "System update: The current time is [TIME].",
  "Time flies! It has just turned [TIME].",
  "Mainframe synchronized. The local time is [TIME].",
  "Heads up! The clock has struck [TIME].",
  "Just a quick time check: it is [TIME] on the dot.",
  "Chronos system online. It is currently [TIME].",
  "A new hour begins. It is exactly [TIME].",
  "Information alert: The time has reached [TIME].",
  "Greetings! Your digital clock reports it is [TIME].",
  "Tick tock! The time is now [TIME].",
  "Reporting in. The local time is exactly [TIME].",
  "Another hour conquered. It is [TIME].",
  "Dashboard update: The time is currently [TIME].",
  "Alert! The hour has changed to [TIME].",
  "Good news! You have successfully made it to [TIME].",
  "Mark the hour! It is exactly [TIME].",
  "Notice: The local time is [TIME]. Stay awesome.",
  "Time sequence initiated. It is now [TIME].",
  "Be advised, the time is exactly [TIME]."
];

// NEW: Smart Hourly Chime & AI Voice Engine
function playHourlyChime(currentHour24) {
  // QUIET HOURS: Do not chime/speak from 1 AM through 6 AM. 
  if (currentHour24 >= 1 && currentHour24 <= 6) return;

  const minderStyle = Config.get("hour_minder");

  // Determine standard 12-hour format
  let displayHour = currentHour24 % 12 || 12;
  let amPm = currentHour24 >= 12 ? "PM" : "AM";
  let timeString = `${displayHour} ${amPm}`;

  if (minderStyle === "1") {
    // === STYLE 1: DIGITAL BEEPS ===
    let beepsRemaining = displayHour;
    playDoubleBeep();
    beepsRemaining--;

    if (beepsRemaining > 0) {
      const chimeInterval = setInterval(() => {
        playDoubleBeep();
        beepsRemaining--;
        if (beepsRemaining <= 0) clearInterval(chimeInterval);
      }, 1000);
    }
  }
  else if (minderStyle === "2") {
    // === STYLE 2: AI VOICE ANNOUNCEMENT ===
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      // Roll the digital dice to pick a random phrase!
      const randomIndex = Math.floor(Math.random() * voicePhrases.length);
      const selectedPhrase = voicePhrases[randomIndex];

      // Swap the [TIME] placeholder with the actual time
      const announcement = selectedPhrase.replace("[TIME]", timeString);

      const speech = new SpeechSynthesisUtterance(announcement);
      speech.rate = 0.9; // Keeps it clear and distinguished
      speech.pitch = 1;

      window.speechSynthesis.speak(speech);
    } else {
      playDoubleBeep();
    }
  }
}


function showNotification() {
  // Modern standard Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    const notif = new Notification("Alarm!", {
      body: Config.get("alarm_desc") || "Time's up!"
    });
    notif.onclick = dismissAlarm;
  }
}


function checkHourlyChime(now, currentMin, currentSec) {
  const minderStyle = Config.get("hour_minder");

  // If the setting is "0" (Off), stop right here.
  if (minderStyle === "0") return;

  // Safety check: If the alarm is already ringing, don't play the chime
  if (alarmIsRinging) return;

  // Trigger exactly at Minute 0, Second 0
  if (currentMin === 0 && currentSec === 0) {
    playHourlyChime(now.getHours());
  }
}

// --- THEME SYSTEM ---
function applyTheme() {
  const fontColor = Config.get("font_color");
  const intensity = parseInt(Config.get("glow_intensity"), 10);
  const fontFamily = Config.get("clock_font");

  // 1. Set the Colors & Fonts
  document.documentElement.style.setProperty('--font-color', fontColor);
  document.documentElement.style.setProperty('--clock-font', fontFamily);

  // 2. Calculate the dynamic glow
  if (intensity === 0) {
    document.documentElement.style.setProperty('--glow-effect', 'none');
  } else {
    const glowColor1 = fontColor + "80";
    const glowColor2 = fontColor + "4D";
    const glowString = `0 0 ${intensity}px ${glowColor1}, 0 0 ${intensity * 2}px ${glowColor2}`;
    document.documentElement.style.setProperty('--glow-effect', glowString);
  }

  // 3. THE FINAL BOSS LOGIC: Smart Ghost Layer Toggle
  const ghostLayer = document.querySelector('.ghost-layer');
  if (fontFamily === "digital-7 mono") {
    ghostLayer.style.display = "flex"; // Turn ON for physical hardware font
  } else {
    ghostLayer.style.display = "none"; // Turn OFF for standard web fonts
  }
}

// --- BOOT UP SEQUENCE ---
function init() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Anytime the user clicks anywhere, arm the audio engine!
  document.addEventListener('click', () => {
    getAudioContext(); // <-- FIXED: We now call our new, unbreakable engine function!
    if (alarmIsRinging) dismissAlarm(); // Stops the alarm if it's ringing
  });

  updateClock();

  const msUntilNextSecond = 1000 - new Date().getMilliseconds();
  setTimeout(() => {
    updateClock();
    setInterval(updateClock, 1000);
  }, msUntilNextSecond);
}

// Start the app!
init();


// --- PHASE 2: DASHBOARD WIRING ---

function setupSettingsPanel() {
  const modal = document.getElementById('settings-modal');
  const btn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('close-btn');

  // Input Elements
  const colorInput = document.getElementById('theme-color');
  const formatSelect = document.getElementById('time-format');
  const alarmToggle = document.getElementById('alarm-toggle');
  const alarmTimeInput = document.getElementById('alarm-time');
  const dateSelect = document.getElementById('date-format');
  const secToggle = document.getElementById('show-seconds');
  const dateToggle = document.getElementById('show-date');
  const glowSlider = document.getElementById('glow-intensity');
  const fontSelect = document.getElementById('clock-font');
  const minderToggle = document.getElementById('hour-minder');

  // 1. Open / Close Logic
  btn.addEventListener('click', () => {
    loadSettingsIntoUI(); // Load memory into the buttons
    modal.classList.add('active'); // Show modal
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active'); // Hide modal
  });

  // 2. Load settings from memory into the dashboard
  function loadSettingsIntoUI() {
    colorInput.value = Config.get("font_color");
    formatSelect.value = Config.get("am_pm");
    alarmToggle.checked = Config.get("alarm_on") === "1";
    dateSelect.value = Config.get("date_format");
    secToggle.checked = Config.get("show_seconds") === "1";
    dateToggle.checked = Config.get("show_date") === "1";
    glowSlider.value = Config.get("glow_intensity");
    fontSelect.value = Config.get("clock_font");
    minderToggle.checked = Config.get("hour_minder") === "1";

    // Convert saved hour & min to HH:mm format for the input box
    const h = padZero(parseInt(Config.get("alarm_hour"), 10));
    const m = padZero(parseInt(Config.get("alarm_min"), 10));
    alarmTimeInput.value = `${h}:${m}`;
  }

  // 3. Listen for User Changes and Save Instantly

  // Color Picker
  colorInput.addEventListener('input', (e) => {
    Config.set("font_color", e.target.value);
    applyTheme(); // Instantly update screen
  });

  // Time Format (12h vs 24h)
  formatSelect.addEventListener('change', (e) => {
    Config.set("am_pm", e.target.value);
    updateClock(); // Instantly update screen
  });

  // Alarm Toggle ON/OFF
  alarmToggle.addEventListener('change', (e) => {
    Config.set("alarm_on", e.target.checked ? "1" : "0");
    updateClock();
  });

  // Alarm Time Picker
  alarmTimeInput.addEventListener('change', (e) => {
    // The input provides time as "HH:mm"
    const [hours, minutes] = e.target.value.split(':');
    Config.set("alarm_hour", parseInt(hours, 10).toString());
    Config.set("alarm_min", parseInt(minutes, 10).toString());
    updateClock();
  });

  // Date Format Change
  dateSelect.addEventListener('change', (e) => {
    Config.set("date_format", e.target.value);
    updateClock(); // Instantly update screen
  });

  // Fullscreen Button Logic
  const fsBtn = document.getElementById('fullscreen-btn');
  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log("Fullscreen blocked by browser:", err);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // Visibility Toggles
  secToggle.addEventListener('change', (e) => {
    Config.set("show_seconds", e.target.checked ? "1" : "0");
    updateClock();
  });

  dateToggle.addEventListener('change', (e) => {
    Config.set("show_date", e.target.checked ? "1" : "0");
    updateClock();
  });

  // Glow Slider
  glowSlider.addEventListener('input', (e) => {
    Config.set("glow_intensity", e.target.value);
    applyTheme(); // Instantly calculate and paint the new shadow!
  });

  // Font Switcher
  fontSelect.addEventListener('change', (e) => {
    Config.set("clock_font", e.target.value);
    applyTheme(); // Instantly changes font and safely hides/shows the ghost layer!
  });

  // Test Alarm Button
  const testBtn = document.getElementById('test-alarm-btn');
  testBtn.addEventListener('click', () => {
    // Force the engine to initialize and play a single double-beep!
    getAudioContext();
    beep();
    setTimeout(beep, 150);
  });

  // // Hourly Chime Toggle
  // minderToggle.addEventListener('change', (e) => {
  //   Config.set("hour_minder", e.target.checked ? "1" : "0");
  // });

  // Hourly Chime Style
  const minderSelect = document.getElementById('hour-minder');
  minderSelect.value = Config.get("hour_minder"); // Load from memory

  minderSelect.addEventListener('change', (e) => {
    Config.set("hour_minder", e.target.value);

    // TEST THE VOICE IMMEDIATELY WHEN SELECTED!
    if (e.target.value === "2" && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const testSpeech = new SpeechSynthesisUtterance("Voice chime activated.");
      testSpeech.rate = 0.9;
      window.speechSynthesis.speak(testSpeech);
    }
  });

}

// --- INTERACTIVE FOOTER LOGIC ---
function setupFooter() {
  const footer = document.getElementById('interactive-footer');
  let idleTimer;

  // Auto-update the copyright year
  document.getElementById('current-year').textContent = new Date().getFullYear();

  function wakeUpInterface() {
    // Show the footer
    footer.classList.add('active');

    // Clear the old countdown timer
    clearTimeout(idleTimer);

    // Start a new 3-second countdown to hide it again
    idleTimer = setTimeout(() => {
      footer.classList.remove('active');
    }, 3000);
  }

  // Listen for ANY user interaction to wake up the footer
  window.addEventListener('mousemove', wakeUpInterface); // Mouse movement
  window.addEventListener('mousedown', wakeUpInterface); // Mouse clicks
  window.addEventListener('keydown', wakeUpInterface);   // Keyboard typing
  window.addEventListener('touchstart', wakeUpInterface);// Mobile screen tapping

  // Trigger it once when the page first loads
  wakeUpInterface();
}

// Start the footer logic
setupFooter();

// Start the Dashboard wiring!
setupSettingsPanel();


// --- NEWS TICKER & EXPONENTIAL BACKOFF ENGINE ---
const proverbs = [
  "Time is money.",
  "A stitch in time saves nine.",
  "Better late than never.",
  "Time waits for no man.",
  "The two most powerful warriors are patience and time.",
  "Punctuality is the soul of business."
];

let tickerRetryCount = 0;
let tickerTimeout;

// A robust list of premium local and international news feeds
const newsSources = [
  { id: "CHANNELS TV", url: "https://www.channelstv.com/feed/" },
  { id: "VANGUARD", url: "https://www.vanguardngr.com/feed/" },
  { id: "PUNCH", url: "https://punchng.com/feed/" },
  { id: "PREMIUM TIMES", url: "https://www.premiumtimesng.com/feed/" },
  //{ id: "THE NATION", url: "https://thenationonlineng.net/feed/" },
  { id: "BBC WORLD", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
  { id: "FOX NEWS LATEST", url: "http://feeds.foxnews.com/foxnews/latest" },
  { id: "FOX NEWS WORLD", url: "http://feeds.foxnews.com/foxnews/world" },
  { id: "FOX NEWS POLITICS", url: "http://feeds.foxnews.com/foxnews/politics" },
  { id: "AL JAZEERA", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "NYT GLOBAL", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  //{ id: "CNBC", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?profile=120000000&id=10000664" },
  { id: "WALL STREET JOURNAL", url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml" },
  { id: "TECHCRUNCH", url: "https://techcrunch.com/feed/" },
  { id: "THE VERGE", url: "https://www.theverge.com/rss/index.xml" },
  { id: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss" },
  // { id: "ESPN SPORTS", url: "https://www.espn.com/espn/rss/news" },
  // { id: "IGN GAMING", url: "https://feeds.feedburner.com/ign/news" }
];

async function fetchNews() {
  const tickerEnabled = Config.get("show_ticker") === "1";
  const container = document.getElementById('ticker-container');

  if (!tickerEnabled) {
    container.classList.add('hidden');
    clearTimeout(tickerTimeout);
    return;
  }
  container.classList.remove('hidden');

  try {
    // 1. Create a network request for every single news source
    const promises = newsSources.map(source => {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;
      return fetch(apiUrl)
        .then(res => res.json())
        .then(data => ({ sourceId: source.id, data: data }));
    });

    // 2. FIRE THEM ALL! Wait for everyone to finish (success or fail)
    const results = await Promise.allSettled(promises);

    let activeFeeds = [];

    // 3. Filter the successes and LOG them exactly as you requested
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.data.status === "ok") {
        console.log(`✅ SUCCESS: Fetched live news from [${result.value.sourceId}]`);
        activeFeeds.push(result.value);
      } else {
        console.warn(`❌ FAILED: A news source is currently offline or unreachable.`);
      }
    });

    // If literally every single network is down, throw an error to trigger Backoff
    if (activeFeeds.length === 0) {
      throw new Error("CRITICAL: All news feeds failed to load.");
    }

    // 4. Stitiching the News (With Clickable Links!)
    let combinedNews = [];
    for (let i = 0; i < 5; i++) {
      activeFeeds.forEach(feed => {
        if (feed.data.items && feed.data.items[i]) {
          const item = feed.data.items[i];
          // Notice we now grab item.link and wrap it in an HTML anchor tag
          combinedNews.push(`[${feed.sourceId}] ${item.title} <a href="${item.link}" target="_blank" class="ticker-link">[Read]</a>`);
        }
      });
    }

    // Join with HTML non-breaking spaces for a clean gap
    const finalHtml = combinedNews.join(" &nbsp;&nbsp;///&nbsp;&nbsp; ") + " &nbsp;&nbsp;///&nbsp;&nbsp; ";
    startMarquee(finalHtml);

    tickerRetryCount = 0;
    tickerTimeout = setTimeout(fetchNews, 30 * 60 * 1000);

  } catch (error) {
    console.log("News fetch failed, triggering fallback...", error);

    // FALLBACK: Show Proverbs
    const proverbHtml = "[NETWORK OFFLINE] &nbsp;&nbsp;///&nbsp;&nbsp; " + proverbs.join(" &nbsp;&nbsp;///&nbsp;&nbsp; ") + " &nbsp;&nbsp;///&nbsp;&nbsp; ";
    startMarquee(proverbHtml);

    tickerRetryCount++;
    const delay = Math.min((Math.pow(2, tickerRetryCount) * 1000), 300000);
    console.log(`Retrying network in ${delay / 1000} seconds...`);
    tickerTimeout = setTimeout(fetchNews, delay);
  }
}

function startMarquee(htmlContent) {
  const tickerText = document.getElementById('ticker-text');

  // Use innerHTML so the browser renders the clickable links!
  tickerText.innerHTML = htmlContent;

  // SENIOR TRICK: We use .innerText to calculate the speed based ONLY on visible letters. 
  // If we used the HTML string, it would count all the hidden <a href="..."> code and scroll way too slow!
  const visibleLength = tickerText.innerText.length;
  const duration = visibleLength * 0.15;

  tickerText.style.animation = `scrollTicker ${duration}s linear infinite`;
}

// Wire the Dashboard Toggle
const tickerToggle = document.getElementById('show-ticker');
tickerToggle.checked = Config.get("show_ticker") === "1";
tickerToggle.addEventListener('change', (e) => {
  Config.set("show_ticker", e.target.checked ? "1" : "0");
  fetchNews();
});

// Add the dynamic keyframes
const style = document.createElement('style');
style.innerHTML = `
  @keyframes scrollTicker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
  }
`;
document.head.appendChild(style);

// Start the engine
fetchNews();