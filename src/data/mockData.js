// API: GET /api/tasks/today  |  API: GET /api/recommendations/*  |  API: GET /api/checklist/today
export const mockDashboard = {
  todayTasks: [
    { id:'t1', subject:'Biologia', topic:'Respirazione cellulare', time:'09:00', durationMinutes:90, accentColor:'var(--indigo)' },
    { id:'t2', subject:'Matematica Analisi', topic:'Limiti e continuità', time:'14:00', durationMinutes:60, accentColor:'var(--purple)' },
  ],
  recommendedQuiz:       { title:'Biology Quiz', questionCount:15, estimatedMinutes:20, difficulty:'Media' },
  recommendedFlashcards: { title:'Chemistry Flash', cardCount:48, mode:'Practice', lastSessionDaysAgo:3 },
};


/* ===================== MY NOTES ===================== */
export const seedNotes = [
  { id: 1, title: 'Cellular Respiration',         subject: 'Biology',   updated: '2h ago',  pages: 12, color: '#EEF2FF', dot: 'var(--indigo)', examDate: '2026-06-15', targetGrade: 27 },
  { id: 2, title: 'Organic Chemistry Reactions',  subject: 'Chemistry', updated: 'Yesterday', pages: 24, color: '#FDF2F8', dot: 'var(--purple)', examDate: '2026-06-20', targetGrade: 25 },
  { id: 3, title: 'World War II Timeline',        subject: 'History',   updated: '3 days ago', pages: 18, color: '#FEF3C7', dot: '#F59E0B', examDate: '2026-07-01', targetGrade: 24 },
  { id: 4, title: 'Calculus — Derivatives',       subject: 'Math',      updated: '1 week ago', pages: 32, color: '#ECFEFF', dot: '#06B6D4', examDate: '2026-06-10', targetGrade: 28 },
  { id: 5, title: 'Macroeconomics Notes',         subject: 'Economics', updated: '2 weeks ago', pages: 16, color: '#DCFCE7', dot: '#10B981', examDate: '2026-07-05', targetGrade: 26 },
  { id: 6, title: 'Shakespeare — Hamlet',         subject: 'Literature',updated: '3 weeks ago', pages: 22, color: '#FEE2E2', dot: '#EF4444', examDate: '2026-06-28', targetGrade: 24 },
];

export const SUBJECT_COLORS = {
  'Biology':    { bg:'#EEF2FF', dot:'#3730E8', text:'#3730E8', border:'#c7d0f8' },
  'Chemistry':  { bg:'#FDF2F8', dot:'#8B5CF6', text:'#8B5CF6', border:'#e9c5f8' },
  'History':    { bg:'#FEF3C7', dot:'#F59E0B', text:'#92400E', border:'#fcd34d' },
  'Math':       { bg:'#ECFEFF', dot:'#06B6D4', text:'#0E7490', border:'#a5f3fc' },
  'Economics':  { bg:'#DCFCE7', dot:'#10B981', text:'#065F46', border:'#86efac' },
  'Literature': { bg:'#FEE2E2', dot:'#EF4444', text:'#991B1B', border:'#fca5a5' },
};

export const SUBJECT_COLORS_DARK = {
  'Biology':    { bg:'#1e1b4b', dot:'#818cf8', text:'#a5b4fc', border:'#3730a3' },
  'Chemistry':  { bg:'#2d1b33', dot:'#c084fc', text:'#d8b4fe', border:'#7e22ce' },
  'History':    { bg:'#292524', dot:'#fbbf24', text:'#fcd34d', border:'#92400e' },
  'Math':       { bg:'#0c2626', dot:'#22d3ee', text:'#67e8f9', border:'#0e7490' },
  'Economics':  { bg:'#052e16', dot:'#34d399', text:'#6ee7b7', border:'#065f46' },
  'Literature': { bg:'#450a0a', dot:'#f87171', text:'#fca5a5', border:'#991b1b' },
};

export const EXTRA_SUBJECT_COLORS = {
  Physics: { bg: '#DBEAFE', dot: '#3B82F6', text: '#1D4ED8', border: '#BFDBFE' },
  Other:   { bg: '#F3F4F6', dot: '#6B7280', text: '#374151', border: '#D1D5DB' },
};

export const EXTRA_SUBJECT_COLORS_DARK = {
  Physics: { bg: '#172554', dot: '#60A5FA', text: '#93C5FD', border: '#1D4ED8' },
  Other:   { bg: '#1F2937', dot: '#94A3B8', text: '#CBD5E1', border: '#334155' },
};

export function getSubjectPalette(subject, fallback = {}, darkMode = false) {
  const primary = darkMode ? SUBJECT_COLORS_DARK : SUBJECT_COLORS;
  const extra = darkMode ? EXTRA_SUBJECT_COLORS_DARK : EXTRA_SUBJECT_COLORS;
  return primary[subject]
    || extra[subject]
    || {
      bg: fallback.bg || fallback.color || '#F3F4F6',
      dot: fallback.dot || '#6B7280',
      text: fallback.text || '#374151',
      border: fallback.border || '#D1D5DB',
    };
}

export function inferSubjectFromName(value) {
  const text = (value || '').toLowerCase();
  const patterns = [
    ['Biology', ['biology', 'biologia', 'cellular', 'genetics']],
    ['Chemistry', ['chemistry', 'chimica', 'organic', 'reaction']],
    ['History', ['history', 'storia', 'war', 'wwii']],
    ['Math', ['math', 'matematica', 'calculus', 'algebra']],
    ['Economics', ['economics', 'economia', 'macro', 'micro']],
    ['Literature', ['literature', 'letteratura', 'english', 'shakespeare']],
    ['Physics', ['physics', 'fisica', 'quantum']],
  ];
  const found = patterns.find(([, keys]) => keys.some((k) => text.includes(k)));
  return found ? found[0] : null;
}

export const PALETTE_CYCLE = ['#EEF2FF', '#FDF2F8', '#ECFEFF', '#FEF3C7', '#DBEAFE', '#EDE9FE'];
export const DOT_CYCLE     = ['var(--indigo)', 'var(--purple)', '#06B6D4', '#F59E0B', '#3B82F6', '#7C3AED'];

export const cellularRespirationCards = [
  { q: 'What is the main purpose of cellular respiration?', a: 'To convert glucose into ATP, the usable energy currency of the cell.' },
  { q: 'Where does glycolysis take place?', a: 'In the cytoplasm of the cell.' },
  { q: 'What are the three main stages of cellular respiration?', a: 'Glycolysis, the Krebs cycle, and the electron transport chain.' },
  { q: 'Which molecule is the final electron acceptor in aerobic respiration?', a: 'Oxygen, which combines with electrons and hydrogen ions to form water.' },
  { q: 'Where does the Krebs cycle occur in eukaryotic cells?', a: 'In the mitochondrial matrix.' },
  { q: 'Why is the electron transport chain important?', a: 'It creates the proton gradient that drives ATP synthase to produce most of the ATP.' },
];

export const cellularRespirationQuestions = [
  {
    q: 'What is the main purpose of cellular respiration?',
    options: ['Store glucose', 'Convert glucose into ATP', 'Produce oxygen', 'Build proteins'],
    correct: 1,
    explanation: 'Cellular respiration breaks down glucose to make ATP, usable cell energy.',
  },
  {
    q: 'Where does glycolysis occur?',
    options: ['Mitochondrial matrix', 'Nucleus', 'Cytoplasm', 'Ribosome'],
    correct: 2,
    explanation: 'Glycolysis happens in cytoplasm before later mitochondrial stages.',
  },
  {
    q: 'Which molecule is final electron acceptor in aerobic respiration?',
    options: ['Carbon dioxide', 'Oxygen', 'Glucose', 'ATP'],
    correct: 1,
    explanation: 'Oxygen accepts electrons at chain end and helps form water.',
  },
  {
    q: 'Where does Krebs cycle occur in eukaryotic cells?',
    options: ['Cytoplasm', 'Mitochondrial matrix', 'Cell membrane', 'Golgi apparatus'],
    correct: 1,
    explanation: 'Krebs cycle runs inside mitochondrial matrix.',
  },
  {
    q: 'Which stage produces most ATP in cellular respiration?',
    options: ['Glycolysis', 'Krebs cycle', 'Electron transport chain', 'Fermentation'],
    correct: 2,
    explanation: 'Electron transport chain drives oxidative phosphorylation, making most ATP.',
  },
];
export const chemistryQuestions = [
  { q: 'What type of reaction involves a nucleophile attacking an electrophile?', options: ['Radical reaction', 'Nucleophilic substitution', 'Electrophilic addition', 'Elimination'], correct: 1, explanation: 'Nucleophilic substitution (SN1/SN2) involves nucleophile attacking electrophilic carbon.' },
  { q: 'In SN2 reactions, the rate depends on:', options: ['Only substrate concentration', 'Only nucleophile concentration', 'Both substrate and nucleophile', 'Neither'], correct: 2, explanation: 'SN2 is bimolecular — rate = k[substrate][nucleophile].' },
  { q: 'What is the IUPAC name for CH3CH2CH3?', options: ['Methane', 'Ethane', 'Propane', 'Butane'], correct: 2, explanation: 'Three carbons in a chain = propane.' },
  { q: 'Which reagent converts alkenes to alkanes?', options: ['HCl', 'H2/Pd', 'NaOH', 'KMnO4'], correct: 1, explanation: 'H2 with Pd catalyst reduces alkenes to alkanes via hydrogenation.' },
  { q: "Markovnikov's rule applies to:", options: ['Nucleophilic substitution', 'Electrophilic addition to alkenes', 'Radical chain reactions', 'Elimination reactions'], correct: 1, explanation: "Markovnikov: H adds to less substituted carbon in electrophilic addition." },
];
export const mathQuestions = [
  { q: 'What is the integral of x squared?', options: ['2x', 'x cubed', 'x^3/3 + C', 'x^2/2 + C'], correct: 2, explanation: 'Power rule: integral(x^n) = x^(n+1)/(n+1) + C.' },
  { q: 'Integration by parts formula:', options: ['integral(uv)=u*integral(v)', 'integral(u dv)=uv - integral(v du)', 'integral(uv)=integral(u)*integral(v)', 'integral(u dv)=uv + integral(v du)'], correct: 1, explanation: 'IBP: integral(u dv) = uv - integral(v du). Derived from product rule.' },
  { q: 'A convergent series has:', options: ['Terms growing to infinity', 'A finite sum', 'All positive terms', 'Terms equal to zero'], correct: 1, explanation: 'Convergent series has a finite limit S as n approaches infinity.' },
  { q: 'The ratio test: series converges if lim |a(n+1)/a(n)|:', options: ['> 1', '= 1', '< 1', '= 0'], correct: 2, explanation: 'L < 1 converges, L > 1 diverges, L = 1 inconclusive.' },
  { q: 'The integral from 0 to 1 of e^x equals:', options: ['e', 'e - 1', 'e + 1', '1'], correct: 1, explanation: '[e^x] from 0 to 1 = e - 1.' },
];
export const historyQuestions = [
  { q: 'Immediate trigger of World War II?', options: ['Assassination of Franz Ferdinand', "Germany's invasion of Poland", 'Attack on Pearl Harbor', 'Fall of France'], correct: 1, explanation: 'Germany invaded Poland on September 1, 1939.' },
  { q: 'The Molotov-Ribbentrop Pact (1939) was signed between:', options: ['Germany and Italy', 'USSR and Germany', 'Japan and Germany', 'USSR and Japan'], correct: 1, explanation: 'Nazi-Soviet non-aggression pact signed August 1939.' },
  { q: 'Operation Barbarossa was the German invasion of:', options: ['France', 'Britain', 'Soviet Union', 'North Africa'], correct: 2, explanation: "Barbarossa (June 1941) — Germany's invasion of the Soviet Union." },
  { q: 'The Battle of Midway (1942) was a turning point in:', options: ['European theater', 'Pacific theater', 'North African campaign', 'Eastern front'], correct: 1, explanation: 'Midway turned the tide in the Pacific — Japan lost 4 carriers.' },
  { q: 'D-Day Normandy landings occurred on:', options: ['June 6, 1944', 'June 6, 1943', 'May 8, 1945', 'September 2, 1945'], correct: 0, explanation: 'D-Day was June 6, 1944 — Allied amphibious assault on Normandy.' },
];
export const physicsQuestions = [
  { q: 'Wave-particle duality was demonstrated by:', options: ["Newton's prism experiment", 'Double-slit experiment', 'Millikan oil drop', 'Rutherford scattering'], correct: 1, explanation: 'Double-slit shows particles create interference patterns — wave behavior.' },
  { q: 'The Schrodinger equation describes:', options: ['Relativistic mass increase', 'Quantum state evolution over time', 'Nuclear binding energy', 'Electromagnetic propagation'], correct: 1, explanation: 'Fundamental equation governing quantum state evolution.' },
  { q: 'Heisenberg uncertainty principle states:', options: ['Energy and time cannot both be known', 'Position and momentum cannot both be precise', 'Spin states are always uncertain', 'All quantum states are probabilistic'], correct: 1, explanation: 'Delta_x * Delta_p >= h_bar/2.' },
  { q: 'The de Broglie wavelength (lambda=h/p) means:', options: ['Only photons have wavelength', 'All matter has wave-like properties', 'Wavelength inversely proportional to frequency', 'Large objects have large wavelength'], correct: 1, explanation: 'de Broglie extended wave-particle duality to all matter.' },
  { q: 'Quantum entanglement refers to:', options: ['Particles sharing space', 'Correlated quantum states regardless of distance', 'Particles at absolute zero', 'Superposition of energy levels'], correct: 1, explanation: 'Entangled particles have correlated measurements regardless of distance.' },
];
export const literatureQuestions = [
  { q: 'Central theme of Hamlet?', options: ['Love and marriage', 'Revenge and moral corruption', 'Nature and civilization', 'War and honor'], correct: 1, explanation: 'Hamlet explores revenge, moral corruption, and the consequences of inaction.' },
  { q: "Hamlet's 'To be or not to be' soliloquy reflects:", options: ['His love for Ophelia', 'Contemplation of existence and death', 'His plan to kill Claudius', 'Grief over his father'], correct: 1, explanation: "Questions whether to endure suffering or end it." },
  { q: 'William Wordsworth is associated with:', options: ['Metaphysical poetry', 'Romantic poetry', 'Augustan satire', 'Modernist free verse'], correct: 1, explanation: 'Wordsworth is a key Romantic poet.' },
  { q: '"Ode to a Nightingale" was written by:', options: ['Wordsworth', 'Byron', 'Keats', 'Shelley'], correct: 2, explanation: 'Keats wrote "Ode to a Nightingale" (1819).' },
  { q: 'The Romantic movement emphasized:', options: ['Reason and order', 'Nature, emotion, and the individual', 'Classical forms', 'Urban industrial life'], correct: 1, explanation: 'Romanticism celebrated nature, emotion, and imagination.' },
];

export const geneticsCards = [
  { q: 'What is a gene?', a: 'A segment of DNA that encodes a specific protein or functional RNA.' },
  { q: 'Genotype vs phenotype?', a: 'Genotype = genetic makeup; phenotype = observable trait expressed by that genotype.' },
  { q: 'What is Mendelian inheritance?', a: 'Traits governed by dominant/recessive alleles that assort independently during meiosis.' },
  { q: 'What is a mutation?', a: 'A change in DNA sequence — can be point, frameshift, insertion, or deletion.' },
  { q: 'What is meiosis?', a: 'Cell division producing gametes with half the chromosome number (haploid).' },
  { q: 'What is co-dominance?', a: 'Both alleles are fully expressed simultaneously (e.g., AB blood type).' },
];
export const chemistryCards = [
  { q: 'What is an SN2 reaction?', a: 'Bimolecular nucleophilic substitution — nucleophile attacks from the back in one concerted step, inverting stereochemistry.' },
  { q: "Markovnikov's rule?", a: 'In electrophilic addition, H adds to the less substituted carbon of the alkene.' },
  { q: 'What is a nucleophile?', a: 'Electron-rich species that donates electrons to an electrophile to form a bond.' },
  { q: 'What are alkanes?', a: 'Saturated hydrocarbons with only C–C single bonds. Formula: CₙH₂ₙ₊₂.' },
  { q: 'SN1 vs SN2?', a: 'SN1: two-step, carbocation intermediate, rate depends only on substrate. SN2: concerted, rate depends on both substrate and nucleophile.' },
  { q: 'What does H₂/Pd do to alkenes?', a: 'Hydrogenation — reduces the double bond to a single bond, converting alkene to alkane.' },
];
export const mathCards = [
  { q: 'Integration by parts formula?', a: '∫u dv = uv − ∫v du. Use when integrand is a product of two functions.' },
  { q: 'Ratio test for convergence?', a: 'Series converges if lim|aₙ₊₁/aₙ| < 1, diverges if > 1, inconclusive if = 1.' },
  { q: '∫eˣ dx = ?', a: 'eˣ + C. The exponential is its own derivative and antiderivative.' },
  { q: 'Power rule for integration?', a: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C, valid for n ≠ −1.' },
  { q: 'What is a convergent series?', a: 'A series whose sequence of partial sums approaches a finite limit as n → ∞.' },
  { q: '∫₀¹ eˣ dx = ?', a: 'e − 1. Evaluate [eˣ]₀¹ = e¹ − e⁰ = e − 1.' },
];
export const historyCards = [
  { q: 'When did WWII begin?', a: 'September 1, 1939 — Germany invaded Poland.' },
  { q: 'What was the Molotov–Ribbentrop Pact?', a: 'Non-aggression pact between Nazi Germany and the Soviet Union, signed August 1939.' },
  { q: 'What was Operation Barbarossa?', a: "Germany's invasion of the Soviet Union, launched June 22, 1941." },
  { q: 'Significance of Battle of Midway?', a: 'June 1942 naval battle — US destroyed 4 Japanese carriers, turning the Pacific tide.' },
  { q: 'When was D-Day?', a: 'June 6, 1944 — Allied amphibious assault on Normandy beaches.' },
  { q: 'When did WWII end?', a: 'May 8, 1945 (V-E Day in Europe); September 2, 1945 (V-J Day, Japan surrenders).' },
];
export const physicsCards = [
  { q: 'What does the double-slit experiment prove?', a: 'Wave-particle duality — particles create interference patterns, showing wave behavior.' },
  { q: 'What does the Schrödinger equation describe?', a: "Evolution of a quantum system's wave function over time." },
  { q: 'Heisenberg uncertainty principle?', a: 'Δx · Δp ≥ ℏ/2 — position and momentum cannot both be simultaneously precise.' },
  { q: 'de Broglie wavelength formula?', a: 'λ = h/p — all matter has wave properties; wavelength inversely proportional to momentum.' },
  { q: 'What is wave-particle duality?', a: 'Quantum objects behave as waves (interference) or particles (discrete detection) depending on measurement.' },
  { q: 'What is quantization?', a: 'Energy, angular momentum, and other properties come in discrete packets (quanta), not continuous values.' },
];
export const literatureCards = [
  { q: "Central theme of Hamlet?", a: "Revenge and moral corruption — Hamlet's paralysis in seeking revenge leads to collective tragedy." },
  { q: '"To be or not to be" — what does it contemplate?', a: 'Whether to endure suffering passively or act — a meditation on existence, death, and the cost of inaction.' },
  { q: 'Wordsworth — which movement?', a: 'Romanticism — emphasized nature, individual emotion, and imagination over Enlightenment reason.' },
  { q: 'Who wrote "Ode to a Nightingale"?', a: 'John Keats, 1819. Explores beauty, mortality, and the escape into imagination.' },
  { q: 'Core values of Romanticism?', a: 'Nature, emotion, imagination, the sublime, and individual experience over classical forms.' },
  { q: 'What is a soliloquy?', a: "A dramatic monologue where a character speaks thoughts aloud alone on stage (e.g., Hamlet's famous speeches)." },
];

export function makeSampleChapter(id, title, updated, pages, files, idx, cards = [], questions = []) {
  const i = idx % PALETTE_CYCLE.length;
  return { id, title, updated, pages, files: files || 1, color: PALETTE_CYCLE[i], dot: DOT_CYCLE[i], cards, questions };
}

export function formatExamDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) { return iso; }
}
export function daysLeft(iso) {
  if (!iso) return -1;
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const exam = new Date(iso + 'T00:00:00'); exam.setHours(0,0,0,0);
    return Math.round((exam - today) / 86400000);
  } catch (_) { return -1; }
}

export const seedExams = [
  { id: 1, name: 'Biology 2024',       subject: 'Biology',    date: '2026-06-24', targetGrade: 27, priority: 3, updated: '2h ago',     chapters: [
    makeSampleChapter(101, 'Cellular Respiration', '2h ago',     12, 1, 0, cellularRespirationCards, cellularRespirationQuestions),
    makeSampleChapter(102, 'Genetics Basics',      '3 days ago', 18, 2, 1, geneticsCards,            cellularRespirationQuestions),
  ]},
  { id: 2, name: 'Organic Chemistry',  subject: 'Chemistry',  date: '2026-07-08', targetGrade: 25, priority: 4, updated: '1 day ago',  chapters: [
    makeSampleChapter(201, 'Reaction Mechanisms', '1 day ago',  22, 2, 1, chemistryCards, chemistryQuestions),
    makeSampleChapter(202, 'Alkanes & Alkenes',   '4 days ago', 14, 1, 2, chemistryCards, chemistryQuestions),
  ]},
  { id: 3, name: 'Calculus II',        subject: 'Math',       date: '2026-06-15', targetGrade: 28, priority: 5, updated: '3 days ago', chapters: [
    makeSampleChapter(301, 'Integration Techniques', '3 days ago', 28, 3, 2, mathCards, mathQuestions),
    makeSampleChapter(302, 'Series & Sequences',     '1 week ago', 20, 2, 3, mathCards, mathQuestions),
  ]},
  { id: 4, name: 'World War II',       subject: 'History',    date: '2026-06-24', targetGrade: 24, priority: 2, updated: '5 days ago', chapters: [
    makeSampleChapter(401, 'Causes & Outbreak', '5 days ago', 16, 1, 3, historyCards, historyQuestions),
    makeSampleChapter(402, 'Pacific Theater',   '1 week ago', 22, 2, 4, historyCards, historyQuestions),
  ]},
  { id: 5, name: 'Quantum Physics',    subject: 'Physics',    date: '2026-07-22', targetGrade: 27, priority: 3, updated: '1 week ago', chapters: [
    makeSampleChapter(501, 'Wave-Particle Duality',  '1 week ago',  24, 2, 4, physicsCards, physicsQuestions),
    makeSampleChapter(502, 'Schrödinger Equation',   '2 weeks ago', 30, 3, 5, physicsCards, physicsQuestions),
  ]},
  { id: 6, name: 'English Literature', subject: 'Literature', date: '2026-05-29', targetGrade: 24, priority: 4, updated: '2 weeks ago', chapters: [
    makeSampleChapter(601, 'Shakespeare — Hamlet', '2 weeks ago', 26, 2, 5, literatureCards, literatureQuestions),
    makeSampleChapter(602, 'Romantic Poetry',      '3 weeks ago', 18, 1, 0, literatureCards, literatureQuestions),
  ]},
];
