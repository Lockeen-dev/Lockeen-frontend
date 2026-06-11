import { createIcons, icons } from 'lucide';

export function initMarketingDom() {
  const refreshIcons = () => createIcons({ icons });
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
            <i data-lucide="${f.icon}" class="${f.ic}" style="font-size:1.75rem"></i>
          </div>
          <h3 class="text-xl mb-3 font-semibold">${title}</h3>
          <p class="text-foreground/70" style="line-height:1.6">${desc}</p>
        </div>
      </div>`;
    }).join('');
    refreshIcons();
  }

  // Pricing data — simplified 2-plan layout
  let billingAnnual = false;
  const plans = [
    { name: 'Free', monthlyPrice: '$0', annualPrice: '$0', period: 'forever',
      features: ['5 AI quiz generations/mo','50 flashcards','AI Tutor access','Calendar & progress tracking'],
      cta: 'Get Started Free', popular: false },
    { name: 'Pro', monthlyPrice: '$12', annualPrice: '$10', period: '/mo',
      features: ['Unlimited quizzes & flashcards','Advanced AI Tutor (priority)','Analytics & Study Arena','Export, sharing & mobile app'],
      cta: 'Start Free Trial', popular: true },
    { name: 'Lifetime', monthlyPrice: '$150', annualPrice: '$150', period: 'one-time', oneTime: true,
      features: ['Pay once, use forever','All Pro features included','No recurring subscription','Future updates included'],
      cta: 'Get Lifetime', popular: false },
  ];
  const pricingCopy = {
    en: [
      { name:'Free', periodForever:'forever', cta:'Get Started Free', features:['5 AI quiz generations/mo','50 flashcards','AI Tutor access','Calendar & progress tracking'] },
      { name:'Pro', periodMonthly:'/mo', periodAnnual:'/mo, billed annually', cta:'Start Free Trial', badge:'Most Popular', features:['Unlimited quizzes & flashcards','Advanced AI Tutor (priority)','Analytics & Study Arena','Export, sharing & mobile app'] },
      { name:'Lifetime', periodOneTime:'one-time', cta:'Get Lifetime', features:['Pay once, use forever','All Pro features included','No recurring subscription','Future updates included'] },
    ],
    it: [
      { name:'Gratis', periodForever:'per sempre', cta:'Inizia gratis', features:['5 generazioni quiz AI/mese','50 flashcard','Accesso Tutor AI','Calendario e progressi'] },
      { name:'Pro', periodMonthly:'/mese', periodAnnual:'/mese, fatturato annualmente', cta:'Prova gratis', badge:'Più scelto', features:['Quiz e flashcard illimitati','Tutor AI avanzato (priorità)','Analytics e Study Arena','Export, condivisione e app mobile'] },
      { name:'Lifetime', periodOneTime:'una volta sola', cta:'Prendi Lifetime', features:['Paghi una volta, usi per sempre','Tutte le funzioni Pro incluse','Nessun abbonamento ricorrente','Aggiornamenti futuri inclusi'] },
    ],
    de: [
      { name:'Kostenlos', periodForever:'für immer', cta:'Kostenlos starten', features:['5 KI-Quiz-Generierungen/Monat','50 Karteikarten','KI-Tutor-Zugang','Kalender & Fortschritt'] },
      { name:'Pro', periodMonthly:'/Monat', periodAnnual:'/Monat, jährlich abgerechnet', cta:'Kostenlos testen', badge:'Beliebt', features:['Unbegrenzte Quizze & Karteikarten','Erweiterter KI-Tutor (Priorität)','Analysen & Study Arena','Export, Teilen & mobile App'] },
      { name:'Lifetime', periodOneTime:'einmalig', cta:'Lifetime kaufen', features:['Einmal zahlen, für immer nutzen','Alle Pro-Funktionen enthalten','Kein wiederkehrendes Abo','Zukünftige Updates enthalten'] },
    ],
    es: [
      { name:'Gratis', periodForever:'para siempre', cta:'Empezar gratis', features:['5 generaciones de quiz IA/mes','50 flashcards','Acceso Tutor IA','Calendario y progreso'] },
      { name:'Pro', periodMonthly:'/mes', periodAnnual:'/mes, facturado anual', cta:'Prueba gratis', badge:'Más popular', features:['Quizzes y flashcards ilimitados','Tutor IA avanzado (prioridad)','Analíticas y Study Arena','Exportar, compartir y app móvil'] },
      { name:'Lifetime', periodOneTime:'pago único', cta:'Comprar Lifetime', features:['Paga una vez, úsalo siempre','Todas las funciones Pro incluidas','Sin suscripción recurrente','Actualizaciones futuras incluidas'] },
    ],
    fr: [
      { name:'Gratuit', periodForever:'à vie', cta:'Commencer gratis', features:['5 générations quiz IA/mois','50 flashcards','Accès Tuteur IA','Calendrier & progression'] },
      { name:'Pro', periodMonthly:'/mois', periodAnnual:'/mois, facturé annuellement', cta:'Essai gratuit', badge:'Le plus populaire', features:['Quiz et flashcards illimités','Tuteur IA avancé (priorité)','Analytics & Study Arena','Export, partage & app mobile'] },
      { name:'Lifetime', periodOneTime:'paiement unique', cta:'Obtenir Lifetime', features:['Paie une fois, utilise pour toujours','Toutes les fonctions Pro incluses','Aucun abonnement récurrent','Mises à jour futures incluses'] },
    ],
    pt: [
      { name:'Grátis', periodForever:'para sempre', cta:'Começar grátis', features:['5 gerações de quiz IA/mês','50 flashcards','Acesso Tutor IA','Calendário e progresso'] },
      { name:'Pro', periodMonthly:'/mês', periodAnnual:'/mês, faturado anualmente', cta:'Teste grátis', badge:'Mais popular', features:['Quizzes e flashcards ilimitados','Tutor IA avançado (prioridade)','Analytics e Study Arena','Exportar, partilhar e app móvel'] },
      { name:'Lifetime', periodOneTime:'pagamento único', cta:'Obter Lifetime', features:['Paga uma vez, usa para sempre','Todas as funções Pro incluídas','Sem subscrição recorrente','Atualizações futuras incluídas'] },
    ],
  };

  function renderPricing(lang) {
    const copy = pricingCopy[lang] || pricingCopy[localStorage.getItem('lockeen-lang')] || pricingCopy.en;
    document.getElementById('pricing-grid').innerHTML = plans.map(p => {
      const pc = copy[plans.indexOf(p)] || pricingCopy.en[plans.indexOf(p)];
      const price = billingAnnual ? p.annualPrice : p.monthlyPrice;
      const period = p.period === 'forever' ? pc.periodForever : (p.oneTime ? pc.periodOneTime : (billingAnnual ? pc.periodAnnual : pc.periodMonthly));
      return `
    <div class="relative p-8 bg-white rounded-3xl border-2 transition-all duration-300 ${p.popular ? 'border-primary shadow-2xl shadow-primary/20' : 'border-border hover:border-primary/30 hover:shadow-lg'}">
      ${p.popular ? `<div class="absolute -top-5 left-1/2 z-20 -translate-x-1/2"><div class="px-5 py-2 bg-gradient-to-r from-primary to-purple-500 text-white rounded-full text-sm font-semibold shadow-primary-soft whitespace-nowrap">${pc.badge}</div></div>` : ''}
      <div class="mb-6">
        <h3 class="text-2xl mb-1 font-bold">${pc.name}</h3>
        <div class="flex items-baseline gap-1 mt-4 mb-1">
          <span class="text-5xl font-bold" translate="no">${price}</span>
          <span class="text-foreground/50 text-sm">${period}</span>        </div>
      </div>
      <button onclick="window.openAuth && window.openAuth('signup')" class="w-full py-3 rounded-xl mb-6 transition-all font-semibold text-sm ${p.popular ? 'bg-primary text-white hover:opacity-90' : 'bg-muted text-foreground hover:bg-border'}">${pc.cta}</button>
      <div class="space-y-3">
        ${pc.features.map(feat => `
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${p.popular ? 'bg-primary/10' : 'bg-muted'}">
              <i data-lucide="check" class="${p.popular ? 'text-primary' : 'text-foreground/60'}" style="font-size:0.7rem"></i>
            </div>
            <span class="text-sm text-foreground/80">${feat}</span>
          </div>`).join('')}
      </div>
    </div>`;
    }).join('');
    refreshIcons();
  }

  window.toggleBilling = function() {
    billingAnnual = !billingAnnual;
    const knob = document.getElementById('billing-toggle-knob');
    const annLabel = document.getElementById('billing-annual-label');
    const monLabel = document.getElementById('billing-monthly-label');
    if (knob) knob.style.transform = billingAnnual ? 'translateX(26px)' : 'translateX(0)';
    if (annLabel) annLabel.style.opacity = billingAnnual ? '1' : '0.5';
    if (monLabel) monLabel.style.opacity = billingAnnual ? '0.5' : '1';
    renderPricing(localStorage.getItem('lockeen-lang') || 'en');
  };

  renderPricing(localStorage.getItem('lockeen-lang') || 'en');
  const LOCKEEN_LANGS = {
    en: { flag:'🇬🇧', label:'English' },
    it: { flag:'🇮🇹', label:'Italiano' },
    de: { flag:'🇩🇪', label:'Deutsch' },
    es: { flag:'🇪🇸', label:'Español' },
    fr: { flag:'🇫🇷', label:'Français' },
    pt: { flag:'🇵🇹', label:'Português' },
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
      'pricing.title':'Simple, <span class="gradient-text">transparent pricing</span>', 'pricing.sub':'Three plans. No hidden fees.', 'pricing.monthly':'Monthly', 'pricing.annual':'Annual', 'pricing.teams':'For schools & teams', 'pricing.teamsSub':'Volume pricing from <strong>$6</strong>/student/mo · dedicated workspace · admin controls', 'pricing.contact':'Contact Sales →',
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
      'pricing.title':'Prezzi <span class="gradient-text">semplici e trasparenti</span>', 'pricing.sub':'Tre piani. Nessun costo nascosto.', 'pricing.monthly':'Mensile', 'pricing.annual':'Annuale', 'pricing.teams':'Per scuole e team', 'pricing.teamsSub':'Prezzi volume da <strong>$6</strong>/studente/mese · workspace dedicato · controlli admin', 'pricing.contact':'Contatta vendite →',
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
  function applyLockeenLanguage(lang) {
    const safeLang = LOCKEEN_I18N[lang] ? lang : 'en';
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
  }
  window.setLockeenLanguage = function(lang) {
    applyLockeenLanguage(lang);
    renderPricing(lang);
    if (window.lockeenApplyGlobalLanguage) window.lockeenApplyGlobalLanguage(lang);
    window.dispatchEvent(new CustomEvent('lockeen-language', { detail: { lang } }));
  };
  const initialLockeenLang = localStorage.getItem('lockeen-lang') || 'en';
  applyLockeenLanguage(initialLockeenLang);

  // Boot icons
  refreshIcons();

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
