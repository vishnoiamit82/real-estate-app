// utils/extractNumericRange.js

function extractNumericRange(text, isPercentage = false) {
    if (!text || typeof text !== 'string') return null;
  
    const sanitized = text
      .replace(/[$,%]/g, '')
      .replace(/per week|pw|weekly|yield|rent/gi, '')
      .toLowerCase();
  
    // Match numeric values like "500000", "480", "5.5", etc.
    const numberMatches = sanitized.match(/\d+(\.\d+)?/g);
    if (!numberMatches || numberMatches.length === 0) return null;
  
    const values = numberMatches.map(Number).sort((a, b) => a - b);
  
    if (values.length === 1) {
      return { min: values[0], max: values[0] };
    } else {
      return { min: values[0], max: values[values.length - 1] };
    }
  }
  
  module.exports = extractNumericRange;
  