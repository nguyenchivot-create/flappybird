/**
 * @fileoverview Leaderboard — persists top scores to localStorage, supports
 * rank calculation, high-score detection, and capped entry management (max 50).
 * Scores are saved automatically: there is no name entry.
 */

class Leaderboard {
  constructor() {
    this.key = 'flappy_bird_leaderboard';
    this.maxEntries = 50;
  }

  getScores() {
    try {
      const data = localStorage.getItem(this.key);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  saveScores(scores) {
    try {
      localStorage.setItem(this.key, JSON.stringify(scores));
    } catch (e) {}
  }

  addScore(score) {
    const scores = this.getScores();
    const now = new Date();
    scores.push({
      score: score,
      date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > this.maxEntries) {
      scores.length = this.maxEntries;
    }
    this.saveScores(scores);
    return this.getRank(score);
  }

  isHighScore(score) {
    if (score <= 0) return false;
    const scores = this.getScores();
    if (scores.length < this.maxEntries) return true;
    return score > scores[scores.length - 1].score;
  }

  getRank(score) {
    const scores = this.getScores();
    return scores.findIndex(s => s.score === score) + 1;
  }

  getTopScores(limit = 50) {
    return this.getScores().slice(0, limit);
  }

  clearAll() {
    try {
      localStorage.removeItem(this.key);
    } catch (e) {}
  }
}
