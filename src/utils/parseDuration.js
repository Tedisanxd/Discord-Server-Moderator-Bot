/**
 * Parse a duration string like "1h30m", "2d", "1w" into milliseconds.
 * Returns null if invalid.
 */
function parseDuration(str) {
  if (!str) return null;
  const regex = /(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|weeks?)/gi;
  let total = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase()[0];
    switch (unit) {
      case 's': total += num * 1000; break;
      case 'm': total += num * 60 * 1000; break;
      case 'h': total += num * 3600 * 1000; break;
      case 'd': total += num * 86400 * 1000; break;
      case 'w': total += num * 604800 * 1000; break;
    }
  }
  return total > 0 ? total : null;
}

/**
 * Format milliseconds into a readable string like "1h 30m"
 */
function formatDuration(ms) {
  if (!ms) return 'permanent';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const w = Math.floor(d / 7);
  if (w > 0) return `${w}w ${d % 7}d`;
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

module.exports = { parseDuration, formatDuration };
