export function initMarketingDom() {
  const iconPaths = {
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
    brain: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
    'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline>',
    check: '<polyline points="20 6 9 17 4 12"></polyline>',
    menu: '<line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path>',
    play: '<polygon points="5 3 19 12 5 21 5 3"></polygon>',
  };
  const iconSvg = (name, className = '', size = '1em') => `
    <svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${iconPaths[name] || iconPaths.zap}
    </svg>`;
  const refreshIcons = () => {
    document.querySelectorAll('[data-lucide]').forEach((el) => {
      const name = el.getAttribute('data-lucide');
      const className = el.getAttribute('class') || '';
      const size = el.style.fontSize || '1em';
      el.outerHTML = iconSvg(name, className, size);
    });
  };
  // Features data
  const featureBase = [
    { icon: 'zap',            bg: 'bg-primary/10',        ic: 'text-primary' },
    { icon: 'brain',          bg: 'bg-purple-500/10',     ic: 'text-purple-500' },
    { icon: 'message-square', bg: 'bg-cyan-500/10',       ic: 'text-cyan-500' },
    { icon: 'calendar',       bg: 'bg-primary/10',        ic: 'text-primary' },
    { icon: 'file-text',      bg: 'bg-orange-500/10',     ic: 'text-orange-500' },
    { icon: 'trending-up',    bg: 'bg-pink-500/10',       ic: 'text-pink-500' },
  ];
  const featureCopy = {
    en: [
      ['AI Quiz Generator', 'Upload notes and instantly generate comprehensive quizzes tailored to your content.'],
      ['Smart Flashcards', 'AI-powered flashcards that adapt to your learning pace and identify weak areas.'],
      ['AI Tutor', 'Ask questions and get instant, personalized explanations in any subject.'],
      ['Exam Calendar', 'Schedule your exams, set deadlines, and never miss an important date with your personal study calendar.'],
      ['Smart Summaries', 'Get concise, AI-generated summaries of lengthy materials in seconds.'],
      ['Progress Tracking', 'Visualize your improvement with detailed analytics and insights.'],
    ],
    it: [
      ['Generatore quiz AI', 'Carica gli appunti e genera subito quiz completi, adattati ai tuoi contenuti.'],
      ['Flashcard intelligenti', 'Flashcard AI che si adattano al tuo ritmo e trovano le aree deboli.'],
      ['Tutor AI', 'Fai domande e ricevi spiegazioni immediate e personalizzate in ogni materia.'],
      ['Calendario esami', 'Organizza esami e scadenze, senza perdere date importanti nel tuo calendario studio.'],
      ['Riassunti intelligenti', 'Ottieni riassunti AI chiari e brevi di materiali lunghi in pochi secondi.'],
      ['Monitoraggio progressi', 'Visualizza i tuoi miglioramenti con analytics e insight dettagliati.'],
    ],
    de: [
      ['KI-Quizgenerator', 'Lade Notizen hoch und erstelle sofort umfassende Quizze passend zu deinem Material.'],
      ['Smarte Karteikarten', 'KI-Karteikarten passen sich deinem Lerntempo an und erkennen Schwachstellen.'],
      ['KI-Tutor', 'Stelle Fragen und erhalte sofort persönliche Erklärungen in jedem Fach.'],
      ['Prüfungskalender', 'Plane Prüfungen und Deadlines, damit du keine wichtigen Termine verpasst.'],
      ['Smarte Zusammenfassungen', 'Erhalte kurze KI-Zusammenfassungen langer Materialien in Sekunden.'],
      ['Fortschrittstracking', 'Sieh deinen Fortschritt mit detaillierten Analysen und Insights.'],
    ],
    es: [
      ['Generador de quizzes IA', 'Sube apuntes y genera quizzes completos adaptados a tu contenido.'],
      ['Flashcards inteligentes', 'Flashcards con IA que se adaptan a tu ritmo y detectan puntos débiles.'],
      ['Tutor IA', 'Haz preguntas y recibe explicaciones instantáneas y personalizadas en cualquier materia.'],
      ['Calendario de exámenes', 'Programa exámenes y fechas límite sin perder ninguna fecha importante.'],
      ['Resúmenes inteligentes', 'Obtén resúmenes claros generados por IA de materiales largos en segundos.'],
      ['Seguimiento del progreso', 'Visualiza tu mejora con analíticas e insights detallados.'],
    ],
    fr: [
      ['Générateur de quiz IA', 'Importe tes notes et génère des quiz complets adaptés à ton contenu.'],
      ['Flashcards intelligentes', 'Des flashcards IA qui s’adaptent à ton rythme et détectent tes points faibles.'],
      ['Tuteur IA', 'Pose des questions et reçois des explications instantanées et personnalisées.'],
      ['Calendrier d’examens', 'Planifie examens et échéances sans manquer de date importante.'],
      ['Résumés intelligents', 'Obtiens des résumés IA clairs de longs documents en quelques secondes.'],
      ['Suivi des progrès', 'Visualise tes progrès avec des analyses et insights détaillés.'],
    ],
    pt: [
      ['Gerador de quizzes IA', 'Envia apontamentos e gera quizzes completos adaptados ao teu conteúdo.'],
      ['Flashcards inteligentes', 'Flashcards com IA que se adaptam ao teu ritmo e identificam pontos fracos.'],
      ['Tutor IA', 'Faz perguntas e recebe explicações imediatas e personalizadas em qualquer matéria.'],
      ['Calendário de exames', 'Agenda exames e prazos sem perder datas importantes.'],
      ['Resumos inteligentes', 'Obtém resumos claros gerados por IA de materiais longos em segundos.'],
      ['Acompanhamento de progresso', 'Visualiza a tua evolução com analytics e insights detalhados.'],
    ],
  };
  function renderFeatures(lang) {
    const copy = featureCopy[lang] || featureCopy.en;
    document.getElementById('features-grid').innerHTML = featureBase.map((f, i) => {
      const title = copy[i][0];
      const desc = copy[i][1];
      return `
      <div class="group relative p-8 bg-gradient-to-br from-white to-muted rounded-3xl border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
        <div class="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/0 rounded-3xl transition-all duration-300"></div>
        <div class="relative">
          <div class="w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            ${iconSvg(f.icon, f.ic, '1.75rem')}
          </div>
          <h3 class="text-xl mb-3 font-semibold">${title}</h3>
          <p class="text-foreground/70" style="line-height:1.6">${desc}</p>
        </div>
      </div>`;
    }).join('');
    refreshIcons();
  }

  // Pricing data — Free is a short trial; Pro unlocks the full workflow.
  let billingAnnual = false;
  const plans = [
    { name: 'Free', monthlyPrice: '€0', annualPrice: '€0', period: 'forever',
      features: ['1 active document','1 quiz generation','1 flashcard generation','20 AI Tutor messages/mo'],
      cta: 'Get Started Free', popular: false },
    { name: 'Pro', monthlyPrice: '€9.99', annualPrice: '€6.67', annualBillingTotal: '€79.99', period: '/mo',
      features: ['More documents and materials','High quiz and flashcard limits','Higher AI Tutor usage','Analytics and Study Planner'],
      cta: 'Upgrade to Pro', popular: true },
  ];
  const pricingCopy = {
    en: [
      { name:'Free', periodForever:'trial', cta:'Start Free', features:['1 active document','1 quiz generation','1 flashcard generation','20 AI Tutor messages/month'] },
      { name:'Pro', periodMonthly:'/month', periodAnnual:'/month', annualBillingNote:'Billed yearly at €79.99', cta:'Upgrade to Pro', badge:'Best value', features:['More documents and materials','High quiz and flashcard limits','Higher AI Tutor usage','Analytics and Study Planner'] },
    ],
    it: [
      { name:'Free', periodForever:'prova', cta:'Inizia gratis', features:['1 documento attivo','1 generazione quiz','1 generazione flashcard','20 messaggi AI Tutor/mese'] },
      { name:'Pro', periodMonthly:'/mese', periodAnnual:'/mese', annualBillingNote:'Fatturato annualmente a €79,99', cta:'Passa a Pro', badge:'Miglior valore', features:['Più documenti e materiali','Limiti quiz e flashcard alti','Uso AI Tutor più alto','Analytics e Study Planner'] },
    ],
  };

  function renderPricing(lang) {
    const copy = pricingCopy[lang] || pricingCopy[localStorage.getItem('lockeen-lang')] || pricingCopy.en;
    document.getElementById('pricing-grid').innerHTML = plans.map(p => {
      const pc = copy[plans.indexOf(p)] || pricingCopy.en[plans.indexOf(p)];
      const price = billingAnnual ? p.annualPrice : p.monthlyPrice;
      const period = p.period === 'forever' ? pc.periodForever : (billingAnnual ? pc.periodAnnual : pc.periodMonthly);
      const billingNote = billingAnnual && p.annualBillingTotal ? (pc.annualBillingNote || `Billed yearly at ${p.annualBillingTotal}`) : '';
      return `
    <div class="relative p-8 bg-white rounded-3xl border-2 transition-all duration-300 ${p.popular ? 'border-primary shadow-2xl shadow-primary/20' : 'border-border hover:border-primary/30 hover:shadow-lg'}">
      ${p.popular ? `<div class="absolute -top-5 left-1/2 z-20 -translate-x-1/2"><div class="px-5 py-2 bg-gradient-to-r from-primary to-purple-500 text-white rounded-full text-sm font-semibold shadow-primary-soft whitespace-nowrap">${pc.badge}</div></div>` : ''}
      <div class="mb-6">
        <h3 class="text-2xl mb-1 font-bold">${pc.name}</h3>
        <div class="flex items-baseline gap-1 mt-4 mb-1">
          <span class="text-5xl font-bold" translate="no">${price}</span>
          <span class="text-foreground/50 text-sm">${period}</span>        </div>
        ${billingNote ? `<p class="text-xs font-semibold text-foreground/50 mt-1">${billingNote}</p>` : ''}
      </div>
      <button onclick="window.openAuth && window.openAuth('signup')" class="w-full py-3 rounded-xl mb-6 transition-all font-semibold text-sm ${p.popular ? 'bg-primary text-white hover:opacity-90' : 'bg-muted text-foreground hover:bg-border'}">${pc.cta}</button>
      <div class="space-y-3">
        ${pc.features.map(feat => `
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${p.popular ? 'bg-primary/10' : 'bg-muted'}">
              ${iconSvg('check', p.popular ? 'text-primary' : 'text-foreground/60', '0.7rem')}
            </div>
            <span class="text-sm text-foreground/80">${feat}</span>
          </div>`).join('')}
      </div>
    </div>`;
    }).join('');
    refreshIcons();
  }

  const LOCKEEN_SUPPORTED_LANGS = ['en', 'it'];
  function normalizeLockeenLang(lang) {
    return LOCKEEN_SUPPORTED_LANGS.includes(lang) ? lang : 'en';
  }

  window.toggleBilling = function() {
    billingAnnual = !billingAnnual;
    const knob = document.getElementById('billing-toggle-knob');
    const annLabel = document.getElementById('billing-annual-label');
    const monLabel = document.getElementById('billing-monthly-label');
    if (knob) knob.style.transform = billingAnnual ? 'translateX(26px)' : 'translateX(0)';
    if (annLabel) annLabel.style.opacity = billingAnnual ? '1' : '0.5';
    if (monLabel) monLabel.style.opacity = billingAnnual ? '0.5' : '1';
    renderPricing(normalizeLockeenLang(localStorage.getItem('lockeen-lang') || 'en'));
  };

  renderPricing(normalizeLockeenLang(localStorage.getItem('lockeen-lang') || 'en'));
  const LOCKEEN_LANGS = {
    en: { flag:'🇬🇧', label:'English' },
    it: { flag:'🇮🇹', label:'Italiano' },
  };
  const LOCKEEN_I18N = {
    en: {
      'nav.features':'Features', 'nav.product':'Product', 'nav.pricing':'Pricing', 'nav.calendar':'Calendar',
      'auth.signIn':'Sign In', 'auth.startFree':'Start Free',
      'hero.badge':'Powered by Advanced AI',
      'hero.title':'The AI Workspace for<br /><span class="gradient-text">Smarter Studying</span>',
      'hero.sub':'Upload your notes and let AI generate quizzes, flashcards, summaries, and personalized tutoring. Study smarter, not harder.',
      'hero.demo':'See Demo',
      'demo.quiz':'AI Quiz', 'demo.quizQ':'Where does glycolysis occur in the cell?', 'demo.question':'Question 3 of 10',
      'demo.flashcards':'Flashcards', 'demo.cardMeta':'Biochemistry · Card 4/18', 'demo.cardQ':'What is the role of ATP synthase?', 'demo.cardA':'Catalyzes ATP synthesis from ADP + Pᵢ using the proton gradient across the inner mitochondrial membrane.', 'demo.again':'Again', 'demo.gotIt':'Got it',
      'demo.tutor':'AI Tutor', 'demo.tutorQ':'Why does the Krebs cycle happen in the mitochondria?', 'demo.tutorA':'The enzymes needed for the Krebs cycle are located in the <span class="font-semibold text-cyan-700">mitochondrial matrix</span>, where acetyl-CoA is also delivered from glycolysis. 🔬', 'demo.ask':'Ask anything about your notes…',
      'trust.title':"Trusted by students at the world's top universities", 'stats.students':'Active Students', 'stats.sessions':'Study Sessions', 'stats.grades':'Improved Grades',
      'features.badge':'Features', 'features.title':'Everything you need to<br /><span class="gradient-text">excel in your studies</span>', 'features.sub':'Powerful AI tools designed to transform the way you learn',
      'product.title':'A workspace designed for<br /><span class="gradient-text">modern learners</span>', 'product.sub':'Clean, intuitive, and packed with intelligent features',
      'pricing.title':'Simple, <span class="gradient-text">transparent pricing</span>', 'pricing.sub':'Start free, then unlock the full workflow with Pro.', 'pricing.monthly':'Monthly', 'pricing.annual':'Annual', 'pricing.teams':'For schools & teams', 'pricing.teamsSub':'Volume pricing from <strong>€6</strong>/student/month · dedicated workspace · admin controls', 'pricing.contact':'Contact Sales →',
      'pricing.trialNote':'Free trial plan · No credit card required · Upgrade when ready',
      'final.title':'Ready to transform your<br />study experience?',
      'final.sub':'Join thousands of students who are already achieving better grades with AI-powered learning.',
      'final.primary':'Start Free', 'final.secondary':'Schedule Demo', 'final.note':'No credit card required • Upgrade only when you are ready',
      'footer.tagline':'The AI-powered workspace for smarter studying. Learn better, achieve more.',
      'footer.product':'Product', 'footer.company':'Company', 'footer.resources':'Resources', 'footer.legal':'Legal',
      'footer.pricing':'Pricing', 'footer.quizzes':'Quizzes', 'footer.about':'About', 'footer.blog':'Blog', 'footer.careers':'Careers', 'footer.earn':'Earn', 'footer.press':'Press', 'footer.partners':'Partners',
      'footer.help':'Help Center', 'footer.guides':'Guides', 'footer.apiDocs':'API Docs', 'footer.status':'Status', 'footer.privacy':'Privacy', 'footer.terms':'Terms', 'footer.security':'Security', 'footer.cookiePolicy':'Cookie Policy',
      'footer.ambassadorBadge':'Lockeen Ambassador Program', 'footer.ambassadorTitle':'Earn with Lockeen', 'footer.ambassadorCopy':'Become an Ambassador at your university. Earn <strong style="color:#34D399">€2 for every student</strong> who signs up with your link — recurring, with no cap.', 'footer.ambassadorCta':'Become an Ambassador →',
      'footer.rights':'© 2026 Lockeen. All rights reserved.', 'footer.privacyPolicy':'Privacy Policy', 'footer.termsService':'Terms of Service', 'footer.cookieSettings':'Cookie Settings',
      'app.dashboard':'Dashboard', 'app.myExams':'My Exams', 'app.flashcards':'Flashcards', 'app.quiz':'Quiz', 'app.aiTutor':'AI Tutor', 'app.analytics':'Analytics', 'app.calendar':'Calendar', 'app.weeklyGoal':'Weekly Goal',
    },
    it: {
      'nav.features':'Funzioni', 'nav.product':'Prodotto', 'nav.pricing':'Prezzi', 'nav.calendar':'Calendario',
      'auth.signIn':'Accedi', 'auth.startFree':'Inizia gratis',
      'hero.badge':'Potente AI per studiare meglio',
      'hero.title':'Lo spazio AI per<br /><span class="gradient-text">studiare meglio</span>',
      'hero.sub':'Carica i tuoi appunti e lascia che l’AI generi quiz, flashcard, riassunti e tutoring personalizzato. Studia meglio, non di più.',
      'hero.demo':'Vedi demo',
      'demo.quiz':'Quiz AI', 'demo.quizQ':'Dove avviene la glicolisi nella cellula?', 'demo.question':'Domanda 3 di 10',
      'demo.flashcards':'Flashcard', 'demo.cardMeta':'Biochimica · Carta 4/18', 'demo.cardQ':'Qual è il ruolo dell’ATP sintasi?', 'demo.cardA':'Catalizza la sintesi di ATP da ADP + Pᵢ usando il gradiente protonico attraverso la membrana mitocondriale interna.', 'demo.again':'Ripeti', 'demo.gotIt':'Lo so',
      'demo.tutor':'Tutor AI', 'demo.tutorQ':'Perché il ciclo di Krebs avviene nei mitocondri?', 'demo.tutorA':'Gli enzimi necessari al ciclo di Krebs si trovano nella <span class="font-semibold text-cyan-700">matrice mitocondriale</span>, dove arriva anche l’acetil-CoA dalla glicolisi. 🔬', 'demo.ask':'Chiedi qualsiasi cosa sui tuoi appunti…',
      'trust.title':'Scelto da studenti delle migliori università al mondo', 'stats.students':'Studenti attivi', 'stats.sessions':'Sessioni di studio', 'stats.grades':'Voti migliorati',
      'features.badge':'Funzioni', 'features.title':'Tutto ciò che ti serve per<br /><span class="gradient-text">eccellere nello studio</span>', 'features.sub':'Strumenti AI potenti per trasformare il modo in cui impari',
      'product.title':'Uno spazio progettato per<br /><span class="gradient-text">studenti moderni</span>', 'product.sub':'Pulito, intuitivo e pieno di funzioni intelligenti',
      'pricing.title':'Prezzi <span class="gradient-text">semplici e trasparenti</span>', 'pricing.sub':'Inizia gratis, poi sblocca il flusso completo con Pro.', 'pricing.monthly':'Mensile', 'pricing.annual':'Annuale', 'pricing.teams':'Per scuole e team', 'pricing.teamsSub':'Prezzi volume da <strong>€6</strong>/studente/mese · workspace dedicato · controlli admin', 'pricing.contact':'Contatta vendite →',
      'pricing.trialNote':'Piano Free di prova · Nessuna carta richiesta · Passi a Pro quando vuoi',
      'final.title':'Pronto a trasformare<br />il tuo modo di studiare?',
      'final.sub':'Unisciti agli studenti che stanno già ottenendo risultati migliori con l’apprendimento potenziato dall’AI.',
      'final.primary':'Inizia gratis', 'final.secondary':'Guarda demo', 'final.note':'Nessuna carta richiesta • Passi a Pro solo quando vuoi',
      'footer.tagline':'Lo spazio AI per studiare meglio. Impara meglio, ottieni di più.',
      'footer.product':'Prodotto', 'footer.company':'Azienda', 'footer.resources':'Risorse', 'footer.legal':'Legale',
      'footer.pricing':'Prezzi', 'footer.quizzes':'Quiz', 'footer.about':'Chi siamo', 'footer.blog':'Blog', 'footer.careers':'Lavora con noi', 'footer.earn':'Guadagna', 'footer.press':'Stampa', 'footer.partners':'Partner',
      'footer.help':'Centro assistenza', 'footer.guides':'Guide', 'footer.apiDocs':'API Docs', 'footer.status':'Status', 'footer.privacy':'Privacy', 'footer.terms':'Termini', 'footer.security':'Sicurezza', 'footer.cookiePolicy':'Cookie Policy',
      'footer.ambassadorBadge':'Programma Ambassador Lockeen', 'footer.ambassadorTitle':'Guadagna con Lockeen', 'footer.ambassadorCopy':'Diventa Ambassador nella tua università. Guadagni <strong style="color:#34D399">€2 per ogni studente</strong> che si iscrive con il tuo link — ricorrenti, senza limiti.', 'footer.ambassadorCta':'Diventa Ambassador →',
      'footer.rights':'© 2026 Lockeen. Tutti i diritti riservati.', 'footer.privacyPolicy':'Privacy Policy', 'footer.termsService':'Termini di servizio', 'footer.cookieSettings':'Impostazioni cookie',
      'app.dashboard':'Dashboard', 'app.myExams':'I miei esami', 'app.flashcards':'Flashcard', 'app.quiz':'Quiz', 'app.aiTutor':'Tutor AI', 'app.analytics':'Analytics', 'app.calendar':'Calendario', 'app.weeklyGoal':'Obiettivo settimanale',
    },
    de: {
      'nav.features':'Funktionen', 'nav.product':'Produkt', 'nav.pricing':'Preise', 'nav.calendar':'Kalender',
      'auth.signIn':'Anmelden', 'auth.startFree':'Kostenlos starten',
      'hero.badge':'Mit fortschrittlicher KI',
      'hero.title':'Der KI-Workspace für<br /><span class="gradient-text">klügeres Lernen</span>',
      'hero.sub':'Lade deine Notizen hoch und lass KI Quiz, Karteikarten, Zusammenfassungen und persönliches Tutoring erstellen.',
      'hero.demo':'Demo ansehen', 'trust.title':'Vertraut von Studierenden der besten Universitäten der Welt', 'stats.students':'Aktive Studierende', 'stats.sessions':'Lernsitzungen', 'stats.grades':'Verbesserte Noten',
      'features.badge':'Funktionen', 'features.title':'Alles, was du brauchst, um<br /><span class="gradient-text">im Studium zu glänzen</span>', 'features.sub':'Leistungsstarke KI-Tools, die dein Lernen verändern',
      'product.title':'Ein Workspace für<br /><span class="gradient-text">moderne Lernende</span>', 'product.sub':'Klar, intuitiv und voller intelligenter Funktionen',
      'pricing.title':'Einfache, <span class="gradient-text">transparente Preise</span>', 'pricing.sub':'Drei Pläne. Keine versteckten Gebühren.', 'pricing.monthly':'Monatlich', 'pricing.annual':'Jährlich', 'pricing.teams':'Für Schulen & Teams', 'pricing.teamsSub':'Volumenpreise ab <strong>$6</strong>/Student/Monat · eigener Workspace · Admin-Kontrollen', 'pricing.contact':'Vertrieb kontaktieren →',
      'demo.quiz':'KI-Quiz', 'demo.quizQ':'Wo findet die Glykolyse in der Zelle statt?', 'demo.question':'Frage 3 von 10', 'demo.flashcards':'Karteikarten', 'demo.cardMeta':'Biochemie · Karte 4/18', 'demo.cardQ':'Welche Rolle hat ATP-Synthase?', 'demo.cardA':'Katalysiert ATP-Synthese aus ADP + Pᵢ mithilfe des Protonengradienten über die innere Mitochondrienmembran.', 'demo.again':'Nochmal', 'demo.gotIt':'Gewusst', 'demo.tutor':'KI-Tutor', 'demo.tutorQ':'Warum läuft der Krebszyklus in den Mitochondrien ab?', 'demo.tutorA':'Die Enzyme des Krebszyklus befinden sich in der <span class="font-semibold text-cyan-700">mitochondrialen Matrix</span>, wohin auch Acetyl-CoA aus der Glykolyse gelangt. 🔬', 'demo.ask':'Frag alles zu deinen Notizen…',
      'app.dashboard':'Dashboard', 'app.myExams':'Meine Prüfungen', 'app.flashcards':'Karteikarten', 'app.quiz':'Quiz', 'app.aiTutor':'KI-Tutor', 'app.analytics':'Analysen', 'app.calendar':'Kalender', 'app.weeklyGoal':'Wochenziel',
    },
    es: {
      'nav.features':'Funciones', 'nav.product':'Producto', 'nav.pricing':'Precios', 'nav.calendar':'Calendario',
      'auth.signIn':'Iniciar sesión', 'auth.startFree':'Empezar gratis',
      'hero.badge':'Impulsado por IA avanzada',
      'hero.title':'El espacio IA para<br /><span class="gradient-text">estudiar mejor</span>',
      'hero.sub':'Sube tus apuntes y deja que la IA genere quizzes, flashcards, resúmenes y tutoría personalizada.',
      'hero.demo':'Ver demo', 'trust.title':'Usado por estudiantes de las mejores universidades del mundo', 'stats.students':'Estudiantes activos', 'stats.sessions':'Sesiones de estudio', 'stats.grades':'Notas mejoradas',
      'features.badge':'Funciones', 'features.title':'Todo lo que necesitas para<br /><span class="gradient-text">destacar en tus estudios</span>', 'features.sub':'Herramientas IA potentes para transformar cómo aprendes',
      'product.title':'Un espacio diseñado para<br /><span class="gradient-text">estudiantes modernos</span>', 'product.sub':'Limpio, intuitivo y lleno de funciones inteligentes',
      'pricing.title':'Precios <span class="gradient-text">simples y transparentes</span>', 'pricing.sub':'Tres planes. Sin costes ocultos.', 'pricing.monthly':'Mensual', 'pricing.annual':'Anual', 'pricing.teams':'Para escuelas y equipos', 'pricing.teamsSub':'Precios por volumen desde <strong>$6</strong>/estudiante/mes · workspace dedicado · controles admin', 'pricing.contact':'Contactar ventas →',
      'demo.quiz':'Quiz IA', 'demo.quizQ':'¿Dónde ocurre la glucólisis en la célula?', 'demo.question':'Pregunta 3 de 10', 'demo.flashcards':'Flashcards', 'demo.cardMeta':'Bioquímica · Tarjeta 4/18', 'demo.cardQ':'¿Cuál es el papel de la ATP sintasa?', 'demo.cardA':'Cataliza la síntesis de ATP desde ADP + Pᵢ usando el gradiente de protones de la membrana mitocondrial interna.', 'demo.again':'Repetir', 'demo.gotIt':'Lo sabía', 'demo.tutor':'Tutor IA', 'demo.tutorQ':'¿Por qué el ciclo de Krebs ocurre en las mitocondrias?', 'demo.tutorA':'Las enzimas del ciclo de Krebs están en la <span class="font-semibold text-cyan-700">matriz mitocondrial</span>, donde también llega el acetil-CoA desde la glucólisis. 🔬', 'demo.ask':'Pregunta cualquier cosa sobre tus apuntes…',
      'app.dashboard':'Dashboard', 'app.myExams':'Mis exámenes', 'app.flashcards':'Flashcards', 'app.quiz':'Quiz', 'app.aiTutor':'Tutor IA', 'app.analytics':'Analíticas', 'app.calendar':'Calendario', 'app.weeklyGoal':'Objetivo semanal',
    },
    fr: {
      'nav.features':'Fonctions', 'nav.product':'Produit', 'nav.pricing':'Tarifs', 'nav.calendar':'Calendrier',
      'auth.signIn':'Connexion', 'auth.startFree':'Commencer gratis',
      'hero.badge':'Propulsé par une IA avancée',
      'hero.title':'L’espace IA pour<br /><span class="gradient-text">mieux étudier</span>',
      'hero.sub':'Importe tes notes et laisse l’IA générer quiz, flashcards, résumés et tutorat personnalisé.',
      'hero.demo':'Voir la démo', 'trust.title':'Adopté par des étudiants des meilleures universités du monde', 'stats.students':'Étudiants actifs', 'stats.sessions':'Sessions d’étude', 'stats.grades':'Notes améliorées',
      'features.badge':'Fonctions', 'features.title':'Tout ce qu’il faut pour<br /><span class="gradient-text">réussir tes études</span>', 'features.sub':'Des outils IA puissants pour transformer ta façon d’apprendre',
      'product.title':'Un espace conçu pour<br /><span class="gradient-text">les étudiants modernes</span>', 'product.sub':'Clair, intuitif et rempli de fonctions intelligentes',
      'pricing.title':'Tarifs <span class="gradient-text">simples et transparents</span>', 'pricing.sub':'Trois offres. Aucun frais caché.', 'pricing.monthly':'Mensuel', 'pricing.annual':'Annuel', 'pricing.teams':'Pour écoles et équipes', 'pricing.teamsSub':'Tarifs volume dès <strong>$6</strong>/étudiant/mois · workspace dédié · contrôles admin', 'pricing.contact':'Contacter ventes →',
      'demo.quiz':'Quiz IA', 'demo.quizQ':'Où se déroule la glycolyse dans la cellule ?', 'demo.question':'Question 3 sur 10', 'demo.flashcards':'Flashcards', 'demo.cardMeta':'Biochimie · Carte 4/18', 'demo.cardQ':'Quel est le rôle de l’ATP synthase ?', 'demo.cardA':'Catalyse la synthèse d’ATP depuis ADP + Pᵢ grâce au gradient de protons à travers la membrane mitochondriale interne.', 'demo.again':'Revoir', 'demo.gotIt':'Compris', 'demo.tutor':'Tuteur IA', 'demo.tutorQ':'Pourquoi le cycle de Krebs a lieu dans les mitochondries ?', 'demo.tutorA':'Les enzymes du cycle de Krebs se trouvent dans la <span class="font-semibold text-cyan-700">matrice mitochondriale</span>, où arrive aussi l’acétyl-CoA issu de la glycolyse. 🔬', 'demo.ask':'Pose une question sur tes notes…',
      'app.dashboard':'Dashboard', 'app.myExams':'Mes examens', 'app.flashcards':'Flashcards', 'app.quiz':'Quiz', 'app.aiTutor':'Tuteur IA', 'app.analytics':'Analytics', 'app.calendar':'Calendrier', 'app.weeklyGoal':'Objectif hebdo',
    },
    pt: {
      'nav.features':'Recursos', 'nav.product':'Produto', 'nav.pricing':'Preços', 'nav.calendar':'Calendário',
      'auth.signIn':'Entrar', 'auth.startFree':'Começar grátis',
      'hero.badge':'Com IA avançada',
      'hero.title':'O workspace de IA para<br /><span class="gradient-text">estudar melhor</span>',
      'hero.sub':'Envia as tuas notas e deixa a IA gerar quizzes, flashcards, resumos e tutoria personalizada.',
      'hero.demo':'Ver demo', 'trust.title':'Usado por estudantes das melhores universidades do mundo', 'stats.students':'Estudantes ativos', 'stats.sessions':'Sessões de estudo', 'stats.grades':'Notas melhoradas',
      'features.badge':'Recursos', 'features.title':'Tudo o que precisas para<br /><span class="gradient-text">brilhar nos estudos</span>', 'features.sub':'Ferramentas IA poderosas para transformar a forma como aprendes',
      'product.title':'Um workspace criado para<br /><span class="gradient-text">estudantes modernos</span>', 'product.sub':'Limpo, intuitivo e cheio de recursos inteligentes',
      'pricing.title':'Preços <span class="gradient-text">simples e transparentes</span>', 'pricing.sub':'Três planos. Sem taxas escondidas.', 'pricing.monthly':'Mensal', 'pricing.annual':'Anual', 'pricing.teams':'Para escolas e equipas', 'pricing.teamsSub':'Preço por volume desde <strong>$6</strong>/estudante/mês · workspace dedicado · controlos admin', 'pricing.contact':'Contactar vendas →',
      'demo.quiz':'Quiz IA', 'demo.quizQ':'Onde ocorre a glicólise na célula?', 'demo.question':'Pergunta 3 de 10', 'demo.flashcards':'Flashcards', 'demo.cardMeta':'Bioquímica · Cartão 4/18', 'demo.cardQ':'Qual é o papel da ATP sintase?', 'demo.cardA':'Catalisa a síntese de ATP a partir de ADP + Pᵢ usando o gradiente de protões na membrana mitocondrial interna.', 'demo.again':'Repetir', 'demo.gotIt':'Sabia', 'demo.tutor':'Tutor IA', 'demo.tutorQ':'Porque é que o ciclo de Krebs acontece nas mitocôndrias?', 'demo.tutorA':'As enzimas do ciclo de Krebs ficam na <span class="font-semibold text-cyan-700">matriz mitocondrial</span>, onde também chega acetil-CoA vindo da glicólise. 🔬', 'demo.ask':'Pergunta qualquer coisa sobre as tuas notas…',
      'app.dashboard':'Dashboard', 'app.myExams':'Meus exames', 'app.flashcards':'Flashcards', 'app.quiz':'Quiz', 'app.aiTutor':'Tutor IA', 'app.analytics':'Analytics', 'app.calendar':'Calendário', 'app.weeklyGoal':'Meta semanal',
    },
  };

  function ensureHeroDemoStyles() {
    if (document.getElementById('hero-demo-interactions-style')) return;
    const style = document.createElement('style');
    style.id = 'hero-demo-interactions-style';
    style.textContent = `
      .hero-demo-card {
        cursor: default;
        transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
      }
      .hero-demo-card:hover,
      .hero-demo-card:focus-within {
        transform: translateY(-3px);
        box-shadow: 0 18px 45px rgba(15, 23, 42, .09);
        border-color: rgba(55, 48, 232, .24);
      }
      .hero-demo-option,
      .hero-demo-flashcard-panel,
      .hero-demo-action,
      .hero-demo-ask {
        cursor: pointer;
        transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease, color .18s ease, opacity .18s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .hero-demo-option:hover,
      .hero-demo-option:focus-visible,
      .hero-demo-action:hover,
      .hero-demo-action:focus-visible,
      .hero-demo-ask:hover,
      .hero-demo-ask:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(15, 23, 42, .08);
      }
      .hero-demo-option:focus-visible,
      .hero-demo-flashcard-panel:focus-visible,
      .hero-demo-action:focus-visible,
      .hero-demo-ask:focus-visible {
        outline: 2px solid rgba(55, 48, 232, .55);
        outline-offset: 3px;
      }
      .hero-demo-option.is-neutral {
        background: rgba(255, 255, 255, .62) !important;
        border-color: rgba(15, 23, 42, .09) !important;
        color: rgba(15, 23, 42, .5) !important;
      }
      .hero-demo-option.is-correct {
        background: rgba(16, 185, 129, .13) !important;
        border-color: rgba(16, 185, 129, .3) !important;
        color: #065F46 !important;
      }
      .hero-demo-option.is-wrong {
        background: rgba(239, 68, 68, .11) !important;
        border-color: rgba(239, 68, 68, .28) !important;
        color: #B91C1C !important;
      }
      .hero-demo-option-marker {
        background: transparent !important;
        border: 1px solid rgba(15, 23, 42, .12) !important;
        color: rgba(15, 23, 42, .48) !important;
      }
      .hero-demo-option.is-correct .hero-demo-option-marker {
        background: #10B981 !important;
        border-color: #10B981 !important;
        color: #fff !important;
      }
      .hero-demo-option.is-wrong .hero-demo-option-marker {
        background: #EF4444 !important;
        border-color: #EF4444 !important;
        color: #fff !important;
      }
      .hero-demo-flashcard-answer {
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transition: max-height .22s ease, opacity .18s ease;
      }
      .hero-demo-flashcard-panel.is-revealed .hero-demo-flashcard-answer {
        max-height: 90px;
        opacity: 1;
      }
      .hero-demo-flashcard-panel:not(.is-revealed) .hero-demo-flashcard-divider {
        opacity: .18;
      }
      .hero-demo-action.is-active {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(15, 23, 42, .08);
      }
      .hero-demo-ask.is-thinking {
        border-color: rgba(6, 182, 212, .45) !important;
        background: rgba(255, 255, 255, .82) !important;
      }
      .hero-demo-tutor-answer.is-thinking {
        opacity: .72;
      }
      @media (prefers-reduced-motion: reduce) {
        .hero-demo-card,
        .hero-demo-option,
        .hero-demo-flashcard-panel,
        .hero-demo-action,
        .hero-demo-ask,
        .hero-demo-flashcard-answer {
          transition: none;
        }
        .hero-demo-card:hover,
        .hero-demo-card:focus-within,
        .hero-demo-option:hover,
        .hero-demo-action:hover,
        .hero-demo-ask:hover {
          transform: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function makeKeyboardClickable(el, handler) {
    el.addEventListener('click', handler);
    el.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handler(event);
    });
  }

  function setupHeroDemoCards() {
    ensureHeroDemoStyles();

    const quizCard = document.querySelector('[data-i18n="demo.quiz"]')?.closest('.rounded-2xl');
    if (quizCard && quizCard.dataset.heroDemoReady !== 'true') {
      quizCard.dataset.heroDemoReady = 'true';
      quizCard.classList.add('hero-demo-card');
      const options = Array.from(quizCard.querySelectorAll('.px-3.py-1\\.5'));
      options.forEach(function(option, index) {
        const marker = option.querySelector('span');
        option.classList.add('hero-demo-option', 'is-neutral');
        option.removeAttribute('style');
        option.setAttribute('role', 'button');
        option.setAttribute('tabindex', '0');
        option.setAttribute('aria-pressed', 'false');
        if (marker) {
          marker.removeAttribute('style');
          marker.classList.add('hero-demo-option-marker');
          marker.textContent = ['A', 'B', 'C'][index] || String(index + 1);
        }

        makeKeyboardClickable(option, function() {
          options.forEach(function(row, rowIndex) {
            row.classList.remove('is-correct', 'is-wrong');
            row.classList.add('is-neutral');
            row.setAttribute('aria-pressed', 'false');
            const rowMarker = row.querySelector('span');
            if (rowMarker) rowMarker.textContent = ['A', 'B', 'C'][rowIndex] || String(rowIndex + 1);
          });

          option.classList.remove('is-neutral');
          option.classList.add(index === 0 ? 'is-correct' : 'is-wrong');
          option.setAttribute('aria-pressed', 'true');
          if (marker) marker.textContent = index === 0 ? '✓' : '×';

          if (index !== 0 && options[0]) {
            const correctMarker = options[0].querySelector('span');
            options[0].classList.remove('is-neutral');
            options[0].classList.add('is-correct');
            if (correctMarker) correctMarker.textContent = '✓';
          }
        });
      });
    }

    const flashcard = document.querySelector('[data-i18n="demo.flashcards"]')?.closest('.rounded-2xl');
    if (flashcard && flashcard.dataset.heroDemoReady !== 'true') {
      flashcard.dataset.heroDemoReady = 'true';
      flashcard.classList.add('hero-demo-card');
      const panel = flashcard.querySelector('.rounded-xl.p-4');
      const divider = panel?.querySelector('.h-px');
      const answer = flashcard.querySelector('[data-i18n="demo.cardA"]');
      const actions = Array.from(flashcard.querySelectorAll('.flex-1.py-1\\.5'));
      if (panel) {
        panel.classList.add('hero-demo-flashcard-panel');
        panel.setAttribute('role', 'button');
        panel.setAttribute('tabindex', '0');
        panel.setAttribute('aria-pressed', 'false');
        divider?.classList.add('hero-demo-flashcard-divider');
        answer?.classList.add('hero-demo-flashcard-answer');
        makeKeyboardClickable(panel, function() {
          const revealed = panel.classList.toggle('is-revealed');
          panel.setAttribute('aria-pressed', String(revealed));
        });
      }
      actions.forEach(function(action) {
        action.classList.add('hero-demo-action');
        action.setAttribute('role', 'button');
        action.setAttribute('tabindex', '0');
        makeKeyboardClickable(action, function(event) {
          event.stopPropagation();
          actions.forEach(function(item) { item.classList.remove('is-active'); });
          action.classList.add('is-active');
          panel?.classList.add('is-revealed');
          panel?.setAttribute('aria-pressed', 'true');
        });
      });
    }

    const tutor = document.querySelector('[data-i18n="demo.tutor"]')?.closest('.rounded-2xl');
    if (tutor && tutor.dataset.heroDemoReady !== 'true') {
      tutor.dataset.heroDemoReady = 'true';
      tutor.classList.add('hero-demo-card');
      const ask = tutor.querySelector('[data-i18n="demo.ask"]')?.parentElement;
      const answer = tutor.querySelector('[data-i18n-html="demo.tutorA"]');
      answer?.classList.add('hero-demo-tutor-answer');
      if (ask && answer) {
        ask.classList.add('hero-demo-ask');
        ask.setAttribute('role', 'button');
        ask.setAttribute('tabindex', '0');
        makeKeyboardClickable(ask, function() {
          if (ask.classList.contains('is-thinking')) return;
          const currentAnswer = answer.innerHTML;
          ask.classList.add('is-thinking');
          answer.classList.add('is-thinking');
          answer.textContent = '...';
          window.setTimeout(function() {
            answer.innerHTML = currentAnswer;
            answer.classList.remove('is-thinking');
            ask.classList.remove('is-thinking');
          }, 520);
        });
      }
    }
  }

  const marketingStaticText = [
    ['p.text-foreground\\/50.text-sm', 'Free trial plan · No credit card required · Upgrade when ready', 'pricing.trialNote'],
    ['footer p.text-white\\/70', 'The AI-powered workspace for smarter studying. Learn better, achieve more.', 'footer.tagline'],
    ['footer h4', 'Product', 'footer.product'],
    ['footer h4', 'Company', 'footer.company'],
    ['footer h4', 'Resources', 'footer.resources'],
    ['footer h4', 'Legal', 'footer.legal'],
    ['footer a', 'Pricing', 'footer.pricing'],
    ['footer a', 'Quizzes', 'footer.quizzes'],
    ['footer a', 'About', 'footer.about'],
    ['footer a', 'Careers', 'footer.careers'],
    ['footer a', 'Earn', 'footer.earn'],
    ['footer a', 'Press', 'footer.press'],
    ['footer a', 'Partners', 'footer.partners'],
    ['footer a', 'Help Center', 'footer.help'],
    ['footer a', 'Guides', 'footer.guides'],
    ['footer a', 'Status', 'footer.status'],
    ['footer a', 'Privacy', 'footer.privacy'],
    ['footer a', 'Terms', 'footer.terms'],
    ['footer a', 'Security', 'footer.security'],
    ['footer a', 'Cookie Policy', 'footer.cookiePolicy'],
    ['footer a', 'Privacy Policy', 'footer.privacyPolicy'],
    ['footer a', 'Terms of Service', 'footer.termsService'],
    ['footer a', 'Cookie Settings', 'footer.cookieSettings'],
    ['footer span', 'Lockeen Ambassador Program', 'footer.ambassadorBadge'],
    ['footer h3', 'Guadagna con Lockeen', 'footer.ambassadorTitle'],
    ['footer a', 'Diventa Ambassador →', 'footer.ambassadorCta'],
  ];

  function setExactText(selector, sourceText, translatedText, translationKey) {
    document.querySelectorAll(selector).forEach(function(el) {
      const current = el.textContent.trim();
      const knownValues = Object.values(LOCKEEN_I18N).map(function(dict) { return dict[translationKey]; }).filter(Boolean);
      if (current === sourceText || knownValues.includes(current)) el.textContent = translatedText;
    });
  }

  function setExactHtml(selector, sourceText, translatedHtml, translationKey) {
    document.querySelectorAll(selector).forEach(function(el) {
      const current = el.textContent.trim().replace(/\s+/g, ' ');
      const currentCompact = current.replace(/\s+/g, '');
      const sourceCompact = sourceText.replace(/\s+/g, '');
      const knownValues = Object.values(LOCKEEN_I18N).map(function(dict) {
        const tmp = document.createElement('div');
        tmp.innerHTML = dict[translationKey] || '';
        return tmp.textContent.trim().replace(/\s+/g, ' ');
      }).filter(Boolean);
      const knownCompacts = knownValues.map(function(value) { return value.replace(/\s+/g, ''); });
      if (current === sourceText || currentCompact === sourceCompact || knownValues.includes(current) || knownCompacts.includes(currentCompact)) el.innerHTML = translatedHtml;
    });
  }

  function applyMarketingStaticCopy(lang) {
    const dict = LOCKEEN_I18N[lang] || LOCKEEN_I18N.en;
    marketingStaticText.forEach(function(item) {
      setExactText(item[0], item[1], dict[item[2]], item[2]);
    });

    setExactHtml('section h2', 'Ready to transform your study experience?', dict['final.title'], 'final.title');
    setExactText('section p', 'Join thousands of students who are already achieving better grades with AI-powered learning.', dict['final.sub'], 'final.sub');
    setExactText('section button', 'Start Free', dict['final.primary'], 'final.primary');
    setExactText('section button', 'Schedule Demo', dict['final.secondary'], 'final.secondary');
    setExactText('section p', 'No credit card required • Upgrade only when you are ready', dict['final.note'], 'final.note');
    setExactHtml('footer p', 'Diventa Ambassador nella tua università. Guadagni €2 per ogni studente che si iscrive con il tuo link — per sempre, senza limiti.', dict['footer.ambassadorCopy'], 'footer.ambassadorCopy');

    document.querySelectorAll('footer p.text-white\\/60.text-sm').forEach(function(el) {
      if (el.textContent.includes('© 2026 Lockeen.')) el.textContent = dict['footer.rights'];
    });
  }

  function applyLockeenLanguage(lang) {
    const safeLang = normalizeLockeenLang(lang);
    const dict = LOCKEEN_I18N[safeLang];
    document.documentElement.lang = safeLang;
    localStorage.setItem('lockeen-lang', safeLang);
    document.querySelectorAll('.js-lang-select').forEach(function(sel){ sel.value = safeLang; });
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      const text = dict[el.getAttribute('data-i18n')];
      if (text) el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el){
      const html = dict[el.getAttribute('data-i18n-html')];
      if (html) el.innerHTML = html;
    });
    renderFeatures(safeLang);
    renderPricing(safeLang);
    applyMarketingStaticCopy(safeLang);
    setupHeroDemoCards();
  }

  function handleProductPreviewLink(event) {
    const link = event.target.closest('a[href*="preview="]');
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    const previewView = url.searchParams.get('preview');
    if (!previewView || !url.hash.includes('product-tablet')) return;

    event.preventDefault();
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new CustomEvent('lockeen-product-preview', { detail: { view: previewView } }));
    window.setTimeout(function() {
      const target = document.getElementById('product-tablet') || document.getElementById('product');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (link.dataset.cleanDemoUrl === 'true') {
        window.history.replaceState({}, '', '/');
      }
    }, 40);
  }

  function handlePricingLink(event) {
    const link = event.target.closest('a[href$="#pricing"], a[href="/#pricing"]');
    if (!link) return;

    event.preventDefault();
    window.history.pushState({}, '', '/#pricing');
    window.setTimeout(function() {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  window.setLockeenLanguage = function(lang) {
    const safeLang = normalizeLockeenLang(lang);
    applyLockeenLanguage(safeLang);
    renderPricing(safeLang);
    if (window.lockeenApplyGlobalLanguage) window.lockeenApplyGlobalLanguage(safeLang);
    window.dispatchEvent(new CustomEvent('lockeen-language', { detail: { lang: safeLang } }));
  };
  const initialLockeenLang = normalizeLockeenLang(localStorage.getItem('lockeen-lang') || 'en');
  applyLockeenLanguage(initialLockeenLang);
  document.addEventListener('click', handleProductPreviewLink);
  document.addEventListener('click', handlePricingLink);
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenuPanel = document.getElementById('mobile-menu-panel');
  function closeMobileMenu() {
    if (!mobileMenuPanel || !mobileMenuToggle) return;
    mobileMenuPanel.classList.remove('open');
    mobileMenuPanel.setAttribute('aria-hidden', 'true');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
  }
  function toggleMobileMenu() {
    if (!mobileMenuPanel || !mobileMenuToggle) return;
    const open = !mobileMenuPanel.classList.contains('open');
    mobileMenuPanel.classList.toggle('open', open);
    mobileMenuPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    mobileMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  mobileMenuToggle?.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleMobileMenu();
  });
  mobileMenuPanel?.querySelectorAll('a, button').forEach(function(el) {
    el.addEventListener('click', closeMobileMenu);
  });
  document.querySelectorAll('.js-lang-select').forEach(function(sel) {
    sel.addEventListener('change', function(e) {
      e.stopPropagation();
      window.setLockeenLanguage(e.target.value);
    });
  });
  document.addEventListener('click', function(e) {
    if (!mobileMenuPanel || !mobileMenuToggle) return;
    if (!mobileMenuPanel.contains(e.target) && !mobileMenuToggle.contains(e.target)) closeMobileMenu();
  });
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 768) closeMobileMenu();
  });

}
