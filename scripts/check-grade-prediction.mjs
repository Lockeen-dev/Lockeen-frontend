import assert from 'node:assert/strict';

import {
  estimateGradePrediction,
  getCombinedPerformance,
  getPredictionDisplay,
  getRecentWeightedAverage,
} from '../src/lib/gradePrediction.js';

function exam(extra = {}) {
  return {
    id: 'exam-1',
    name: 'Biologia',
    targetGrade: 27,
    chapters: [{ id: 'chapter-1' }, { id: 'chapter-2' }],
    ...extra,
  };
}

function predict({ quiz = [], flash = [], extraExam = {}, lang = 'en' }) {
  return estimateGradePrediction(
    exam(extraExam),
    { 'exam-1': quiz },
    { 'exam-1': flash },
    lang,
  );
}

const allWrong = predict({ quiz: [0, 0, 0, 0, 0], lang: 'it' });
assert.equal(allWrong.prediction, 15, 'all wrong attempts should bottom at 15 internally');
assert.equal(getPredictionDisplay(allWrong.prediction, 'it'), 'Insufficiente', 'sub-18 scores must be hidden in Italian UI');

const perfectQuiz = predict({ quiz: [100, 100, 100, 100, 100, 100, 100, 100] });
assert.equal(perfectQuiz.prediction, 30, 'repeated perfect quiz attempts should reach 30');
assert.equal(perfectQuiz.status, 'on-track', 'perfect quiz attempts should be on track');

const perfectFlash = predict({ flash: [100, 100, 100, 100, 100] });
assert.equal(perfectFlash.prediction, 30, 'perfect flashcard-only practice should reach 30');

const recoveredQuiz = predict({ quiz: [0, 20, 40, 100, 100, 100, 100, 100, 100] });
assert.ok(recoveredQuiz.prediction >= 29, `old quiz mistakes should not block recovery to near 30, got ${recoveredQuiz.prediction}`);

const recoveredFlash = predict({ flash: [20, 40, 60, 100, 100, 100] });
assert.ok(recoveredFlash.prediction >= 28, `old flashcard mistakes should decay after strong recovery, got ${recoveredFlash.prediction}`);

const recentDrop = predict({ quiz: [100, 100, 100, 60, 50] });
assert.ok(recentDrop.prediction < 27, `recent weak attempts should pull prediction down, got ${recentDrop.prediction}`);

const mixedSources = predict({ quiz: [80, 80, 80, 80], flash: [100, 100, 100, 100] });
assert.ok(mixedSources.prediction > 27 && mixedSources.prediction < 30, `mixed quiz/flash performance should land high but below perfect, got ${mixedSources.prediction}`);

const backendClampedLow = predict({ extraExam: { gradePrediction: 10, gradePredictionConfidence: 42 } });
assert.equal(backendClampedLow.prediction, 15, 'backend prediction should be clamped to the internal lower bound');
assert.equal(backendClampedLow.confidence, 42, 'backend confidence should be preserved');

const backendClampedHigh = predict({ extraExam: { gradePrediction: 33 } });
assert.equal(backendClampedHigh.prediction, 30, 'backend prediction should be clamped to 30');

assert.equal(getRecentWeightedAverage([0, 100]), 60, 'recent weighted average should favor the latest attempt');
assert.ok(getCombinedPerformance([80, 80], [100, 100]).score < 100, 'mixed sources should combine instead of taking the best source only');

console.log('Grade prediction check OK: 11 cases checked.');
