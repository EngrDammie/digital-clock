# ⏱️ Hyper-Realistic Digital Clock

A highly configurable, fully responsive digital clock built entirely with Vanilla Web Technologies (HTML, CSS, JavaScript). 

This project goes beyond a simple web clock by simulating physical hardware. It uses advanced CSS Grid layering to create an "unlit ghost layer" of 7-segment displays behind the glowing neon text, delivering an ultra-realistic LCD/LED aesthetic.

## ✨ Features

*   **Ultra-Realistic HUD:** Features an unlit "ghost" background layer synced perfectly with the active time using tabular numerical spacing.
*   **Advanced Responsiveness:** Uses pure CSS math (`min(vw, vh)`) to aggressively scale the clock to the maximum safe size on any device or orientation.
*   **Built-in Alarm System:** Complete with a floating Heads-Up Display (HUD) alert and desktop browser notifications.
*   **Web Audio Synthesizer:** Generates a classic 8-bit digital watch "BEEP" dynamically using the browser's Web Audio API—no external audio files required!
*   **Settings Dashboard:** A sleek, slide-out modal menu that saves your preferences instantly to `localStorage`.
*   **Customizable:** Toggle 12/24-hour time, set alarms, and dynamically shift the neon theme colors.

## 🚀 How to Run

Because this project uses vanilla HTML/CSS/JS with no build tools or frameworks, running it is incredibly simple:

1. Clone this repository: `git clone https://github.com/YOUR-USERNAME/hyper-realistic-digital-clock.git`
2. Open the folder.
3. Double-click `index.html` to open it in your browser.
4. Enjoy!

## 🛠️ Built With

*   **HTML5** (Semantic structure and layout)
*   **CSS3** (Flexbox, Grid, Custom Properties/Variables, Viewport Math)
*   **JavaScript (ES6+)** (Web Audio API, Notification API, LocalStorage)

## 💡 Engineering Highlights

*   **The Ignition Pattern:** Navigates modern browser Autoplay Policies by "arming" the audio context upon the first user interaction.
*   **Tuning Dials:** Uses precise CSS offsets to counteract invisible padding inherent in custom 7-segment fonts.
*   **Performance:** Uses native `Date()` functions combined with calculating exact millisecond offsets to ensure the screen ticks *exactly* when the system clock ticks.