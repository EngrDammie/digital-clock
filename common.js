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
      case "am_pm": return "1"; // 1 = AM/PM mode, 0 = 24-hour mode
      case "font_color": return "#00ffff"; // Default to our Hi-tech Cyan!
      default: return "";
    }
  }
};