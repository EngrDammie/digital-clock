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

// --- AUDIO SYNTHESIZER (No external files needed!) ---
let alarmBeepInterval;
let audioCtx; // We declare the engine globally so we can turn it on early

// This function "arms" the engine safely during a user click
function initAudioEngine() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  // If the browser paused the engine, wake it up!
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playAlarmSound() {
  // Safety check: if the engine never started, don't try to play
  if (!audioCtx) return;

  function beep() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square'; // Classic digital watch sound
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);

    // Loud at first, fading out super fast
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  }

  function playDoubleBeep() {
    beep();
    setTimeout(beep, 150);
  }

  playDoubleBeep();
  alarmBeepInterval = setInterval(playDoubleBeep, 1000);
}

function dismissAlarm() {
  Config.set("alarm_on", "0");
  alarmIsRinging = false;
  document.getElementById('alarm').textContent = "";

  if (alarmBeepInterval) {
    clearInterval(alarmBeepInterval);
  }
}

function showNotification() {
  // Modern standard Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    const notif = new Notification("Alarm!", {
      body: Config.get("alarm_desc") || "Time's up!",
      icon: "icon_32.png"
    });
    notif.onclick = dismissAlarm;
  }
}

function dismissAlarm() {
  Config.set("alarm_on", "0");
  alarmIsRinging = false;
  document.getElementById('alarm').textContent = "";

  // Turn off the repeating synthesizer beep!
  if (alarmBeepInterval) {
    clearInterval(alarmBeepInterval);
  }
}

// --- THEME SYSTEM ---
function applyTheme() {
  const fontColor = Config.get("font_color"); // e.g., "#00ffff"
  const intensity = parseInt(Config.get("glow_intensity"), 10);

  // 1. Set the solid text color
  document.documentElement.style.setProperty('--font-color', fontColor);

  // 2. Calculate the dynamic glow!
  if (intensity === 0) {
    document.documentElement.style.setProperty('--glow-effect', 'none');
  } else {
    // We add Hex Alpha channels to make the shadow semi-transparent (80 = 50% opacity, 4D = 30% opacity)
    const glowColor1 = fontColor + "80"; 
    const glowColor2 = fontColor + "4D"; 
    
    // Create the layered neon effect using math
    const glowString = `0 0 ${intensity}px ${glowColor1}, 0 0 ${intensity * 2}px ${glowColor2}`;
    document.documentElement.style.setProperty('--glow-effect', glowString);
  }
}

// --- BOOT UP SEQUENCE ---
function init() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Anytime the user clicks anywhere, arm the audio engine!
  document.addEventListener('click', () => {
    initAudioEngine(); // Starts the engine safely
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