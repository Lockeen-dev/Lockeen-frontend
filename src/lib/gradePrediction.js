import { tt } from './i18n.js';

export function getAverage(values = []) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getAverageDecimal(values = [], digits = 1) {
  const nums = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!nums.length) return null;
  const factor = 10 ** digits;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * factor) / factor;
}

export function getPredictionDisplay(prediction, lang = 'en') {
  if (prediction == null) return '—';
  if (prediction < 18) return lang === 'it' ? 'Insufficiente' : 'Insufficient';
  return prediction;
}

export function getRecentWeightedAverage(values = [], decay = 0.68) {
  const nums = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!nums.length) return null;
  const weighted = nums.reduce((acc, value, index) => {
    const weight = Math.pow(decay, nums.length - index - 1);
    return {
      score: acc.score + (value * weight),
      weight: acc.weight + weight,
    };
  }, { score: 0, weight: 0 });
  return Math.round(weighted.score / weighted.weight);
}

export function getSourceSignal(scores = [], weight = 1) {
  const average = getRecentWeightedAverage(scores);
  if (average == null) return null;
  return {
    average,
    count: scores.length,
    evidence: Math.min(1, Math.log1p(scores.length) / Math.log1p(10)) * weight,
  };
}

export function getCombinedPerformance(quizScores = [], flashScores = []) {
  const signals = [
    getSourceSignal(quizScores, 1.15),
    getSourceSignal(flashScores, 1),
  ].filter(Boolean);
  if (!signals.length) return null;
  const totals = signals.reduce((acc, signal) => ({
    score: acc.score + (signal.average * signal.evidence),
    evidence: acc.evidence + signal.evidence,
    count: acc.count + signal.count,
  }), { score: 0, evidence: 0, count: 0 });
  if (!totals.evidence) return null;
  return {
    score: totals.score / totals.evidence,
    evidence: Math.min(1, totals.evidence / 2),
    count: totals.count,
    hasQuiz: quizScores.length > 0,
    hasFlash: flashScores.length > 0,
  };
}

export function estimateCoverage(exam = {}, quizScores = [], flashScores = []) {
  const chapters = exam.chapters || [];
  if (!chapters.length) return quizScores.length || flashScores.length ? 0.5 : 0;
  const signalCount = quizScores.length + flashScores.length;
  return clamp(signalCount / Math.max(1, chapters.length * 2), 0, 1);
}

export function getDaysUntilExam(exam, now = new Date()) {
  const raw = exam.date || exam.examDate;
  if (!raw) return null;
  const examDate = new Date(raw);
  if (Number.isNaN(examDate.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / 86400000);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function estimateGradePrediction(exam, quizHistory = {}, flashHistory = {}, lang = 'en') {
  const ids = [exam.id, ...(exam.chapters || []).map((chapter) => chapter.id)];
  const quizScores = ids.flatMap((id) => (quizHistory || {})[id] || [])
    .filter((score) => Number.isFinite(Number(score))).map(Number);
  const flashScores = ids.flatMap((id) => (flashHistory || {})[id] || [])
    .filter((score) => Number.isFinite(Number(score))).map(Number);
  const scores = [...quizScores, ...flashScores];
  const backendPrediction = exam.gradePrediction ?? exam.predictedGrade ?? exam.prediction;
  const backendConfidence = exam.gradePredictionConfidence ?? exam.predictionConfidence;
  const backendStatus = exam.gradePredictionStatus ?? exam.predictionStatus;

  if (!scores.length && !Number.isFinite(Number(backendPrediction))) {
    return {
      prediction: null,
      confidence: 0,
      confidenceLabel: tt(lang, 'noData'),
      delta: null,
      status: 'needs-practice',
      statusLabel: tt(lang, 'needsPractice'),
      helper: tt(lang, 'needsPractice'),
    };
  }

  const performance = getCombinedPerformance(quizScores, flashScores);
  const performanceScore = performance?.score ?? getAverage(scores);
  const rawGrade = 15 + ((performanceScore || 0) / 100) * 15;
  const attemptCount = scores.length;
  const daysUntilExam = getDaysUntilExam(exam);
  const coverageRatio = estimateCoverage(exam, quizScores, flashScores);
  const prediction = Number.isFinite(Number(backendPrediction))
    ? clamp(Math.round(Number(backendPrediction) * 10) / 10, 15, 30)
    : clamp(Math.round(rawGrade * 10) / 10, 15, 30);
  const target = exam.targetGrade || 27;
  const delta = Math.round((prediction - target) * 10) / 10;
  const attemptsConfidence = clamp(attemptCount * 7, 0, 45);
  const sourceConfidence = performance?.hasQuiz && performance?.hasFlash ? 15 : 6;
  const evidenceConfidence = Math.round((performance?.evidence || 0) * 15);
  const coverageConfidence = Math.round(coverageRatio * 20);
  const confidence = Number.isFinite(Number(backendConfidence))
    ? Math.round(Number(backendConfidence))
    : clamp(10 + attemptsConfidence + sourceConfidence + evidenceConfidence + coverageConfidence, 0, 100);
  const confidenceLabel = confidence >= 70 ? (lang === 'it' ? 'Alta confidenza' : 'High confidence') : confidence >= 40 ? (lang === 'it' ? 'Media confidenza' : 'Medium confidence') : confidence > 0 ? (lang === 'it' ? 'Bassa confidenza' : 'Low confidence') : tt(lang, 'noData');
  const cramRisk = daysUntilExam != null && daysUntilExam <= 7 && coverageRatio < 0.5;
  const lowCoverage = coverageRatio > 0 && coverageRatio < 0.35;
  let status = backendStatus || (
    delta >= 0 && confidence >= 40 ? 'on-track' :
    delta >= -2 ? 'close' :
    delta >= -5 ? 'at-risk' :
    'needs-practice'
  );
  if (!backendStatus && status === 'on-track' && (cramRisk || lowCoverage)) status = 'close';
  if (!backendStatus && status === 'close' && cramRisk) status = 'at-risk';
  const labels = {
    'on-track': tt(lang, 'onTrack'),
    close: lang === 'it' ? 'Vicino' : 'Close',
    'at-risk': tt(lang, 'atRisk'),
    'needs-practice': tt(lang, 'needsPractice'),
  };
  const helpers = {
    'on-track': 'On track: maintain practice',
    close: lowCoverage ? 'Close: improve coverage' : quizScores.length ? 'Close: one focused quiz can lift it' : 'Close: add quiz attempts',
    'at-risk': cramRisk ? 'Cram risk: low coverage near exam' : lowCoverage ? 'At risk: low coverage' : 'At risk: practice weak quiz topics',
    'needs-practice': 'Needs practice: start with quiz + flashcards',
  };
  return {
    prediction,
    confidence,
    confidenceLabel,
    delta,
    status,
    statusLabel: labels[status] || labels['needs-practice'],
    helper: helpers[status] || helpers['needs-practice'],
  };
}
