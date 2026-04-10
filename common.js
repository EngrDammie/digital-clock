/* 
  common.js
  This file handles the "Memory" (Local Storage).
  We organize it into a neat 'Config' object to keep things tidy.
*/

const Config = {
  // Get a setting from memory
  get(name) {
    if (localStorage.getItem(name) !== null) {
      return localStorage.getItem(name);
    }
    return this.getDefault(name);
  },

  // Save a setting to memory
  set(name, value) {
    localStorage.setItem(name, value);
  },

  // If there is no memory yet, use these defaults
  getDefault(name) {
    switch (name) {
      case "alarm_on": return "0";
      case "alarm_hour": return "0";
      case "alarm_min": return "0";      
      case "am_pm": return "1"; 
      case "font_color": return "#00ffff"; 
      case "date_format": return "0"; // NEW: 0 = Full Text, 1 = US Date, 2 = Global Date, 3 = ISO
      case "show_seconds": return "1"; // 1 = Show, 0 = Hide
      case "show_date": return "1";    // 1 = Show, 0 = Hide
      case "hour_minder": return "0";  // 0 = Off, 1 = On
      case "glow_intensity": return "10"; // 0 = Off, 10 = Normal, 20 = Max
      case "clock_font": return "digital-7 mono"; // Default font
      default: return "";
    }
  }
};