/**
 * Format duration in milliseconds to human-readable format.
 * Examples:
 * - 850ms -> "0.8s"
 * - 12400ms -> "12.4s"
 * - 75000ms -> "1m 15s"
 */
export function formatDurationSeconds(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '0.0s';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = Math.floor(totalSeconds % 60);
  return `${minutes}m ${remainingSecs}s`;
}

/**
 * Format stopwatch time format (MM:SS.s)
 * Examples:
 * - 5400ms -> "00:05.4"
 * - 65200ms -> "01:05.2"
 */
export function formatStopwatch(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '00:00.0';
  const totalSecs = ms / 1000;
  const mins = Math.floor(totalSecs / 60);
  const secs = Math.floor(totalSecs % 60);
  const tenths = Math.floor((ms % 1000) / 100);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

/**
 * Format average processing speed
 */
export function formatSpeed(photosPerSecond?: number, avgMsPerItem?: number): string {
  if (photosPerSecond && photosPerSecond > 0) {
    if (photosPerSecond >= 1) {
      return `${photosPerSecond.toFixed(1)} photos/s`;
    } else {
      return `${(avgMsPerItem || 0).toFixed(0)} ms/photo`;
    }
  }
  if (avgMsPerItem && avgMsPerItem > 0) {
    return `${avgMsPerItem.toFixed(0)} ms/photo`;
  }
  return '--';
}
