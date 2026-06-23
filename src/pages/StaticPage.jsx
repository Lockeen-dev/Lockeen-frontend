import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { staticPages } from '../content/staticPages';

const pageTitles = {
  en: {
    about: 'About — Lockeen',
    blog: 'Blog — Lockeen',
    careers: 'Careers – Lockeen',
    earn: 'Earn · Ambassador Program – Lockeen',
    press: 'Press – Lockeen',
    privacy: 'Privacy Policy — Lockeen',
    terms: 'Terms of Service — Lockeen',
  },
  it: {
    about: 'Chi siamo — Lockeen',
    blog: 'Blog — Lockeen',
    careers: 'Lavora con noi – Lockeen',
    earn: 'Guadagna · Programma Ambassador – Lockeen',
    press: 'Stampa – Lockeen',
    privacy: 'Privacy Policy — Lockeen',
    terms: 'Termini di servizio — Lockeen',
  },
};

const staticTextTranslations = {
  en: [
    ['Features', 'Funzioni'],
    ['Product', 'Prodotto'],
    ['Pricing', 'Prezzi'],
    ['Quizzes', 'Quiz'],
    ['Calendar', 'Calendario'],
    ['Sign In', 'Accedi'],
    ['Start Free', 'Inizia gratis'],
    ['Get Started', 'Inizia'],
    ['About', 'Chi siamo'],
    ['Blog', 'Blog'],
    ['Careers', 'Lavora con noi'],
    ['Earn', 'Guadagna'],
    ['Press', 'Stampa'],
    ['Partners', 'Partner'],
    ['Company', 'Azienda'],
    ['Resources', 'Risorse'],
    ['Help Center', 'Centro assistenza'],
    ['Guides', 'Guide'],
    ['API Docs', 'API Docs'],
    ['Status', 'Status'],
    ['Legal', 'Legale'],
    ['Privacy', 'Privacy'],
    ['Terms', 'Termini'],
    ['Security', 'Sicurezza'],
    ['Cookie Policy', 'Cookie Policy'],
    ['Privacy Policy', 'Privacy Policy'],
    ['Terms of Service', 'Termini di servizio'],
    ['Cookie Settings', 'Impostazioni cookie'],
    ['The AI-powered workspace for smarter studying. Learn better, achieve more.', 'Lo spazio AI per studiare meglio. Impara meglio, ottieni di più.'],
    ['Lockeen Ambassador Program', 'Programma Ambassador Lockeen'],
    ['Earn with Lockeen', 'Guadagna con Lockeen'],
    ['Become an Ambassador at your university. Earn €2 for every student who signs up with your link — recurring, with no cap.', 'Diventa Ambassador nella tua università. Guadagni €2 per ogni studente che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['Diventa Ambassador nella tua università. Guadagni €2 per ogni studente che si iscrive con il tuo link — per sempre, senza limiti.', 'Diventa Ambassador nella tua università. Guadagni €2 per ogni studente che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['Become an Ambassador at your university. Earn', 'Diventa Ambassador nella tua università. Guadagni'],
    ['for every student who signs up with your link — recurring, with no cap.', 'che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['che si iscrive con il tuo link — per sempre, senza limiti.', 'che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['Become an Ambassador →', 'Diventa Ambassador →'],
    ['Diventa Ambassador →', 'Diventa Ambassador →'],
    ['© 2026 Lockeen. All rights reserved.', '© 2026 Lockeen. Tutti i diritti riservati.'],
    ['Study smarter with AI', 'Studia meglio con l’AI'],
    ['Contact us', 'Contattaci'],
    ['Media kit', 'Media kit'],
    ['Back to home', 'Torna alla home'],
  ],
};

const staticPageContentTranslations = {
  about: [
    ['Our story', 'La nostra storia'],
    ['Built by students,', 'Creato da studenti,'],
    ['for students.', 'per studenti.'],
    ['We were tired of juggling apps, highlights, and endless flashcards. So we built the tool we always wished existed — one workspace powered by AI that actually understands how students learn.', 'Eravamo stanchi di saltare tra app, evidenziatori e flashcard infinite. Così abbiamo costruito lo strumento che avremmo sempre voluto: un unico spazio potenziato dall’AI che capisce davvero come imparano gli studenti.'],
    ['Start for free', 'Inizia gratis'],
    ['Read our blog', 'Leggi il blog'],
    ['Our mission', 'La nostra missione'],
    ['Make deep learning accessible to every student on earth.', 'Rendere l’apprendimento profondo accessibile a ogni studente.'],
    ['Education is the single most powerful lever for a better future — yet most students spend more time fighting their tools than actually learning. Lockeen fixes that. We combine AI, cognitive science, and beautiful design into a workspace that adapts to you, not the other way around.', 'L’educazione è la leva più potente per costruire un futuro migliore, ma molti studenti passano più tempo a combattere con gli strumenti che a imparare davvero. Lockeen risolve questo problema. Uniamo AI, scienze cognitive e design curato in uno spazio che si adatta a te, non il contrario.'],
    ["Founded in 2024 by a small team of university students and researchers, we've grown to serve learners across 40+ countries — and we're just getting started.", 'Fondata nel 2024 da un piccolo team di studenti universitari e ricercatori, Lockeen oggi supporta studenti in oltre 40 Paesi. E siamo solo all’inizio.'],
    ['Lockeen by the numbers', 'Lockeen in numeri'],
    ['Countries reached', 'Paesi raggiunti'],
    ['Active learners', 'Studenti attivi'],
    ['Average rating', 'Valutazione media'],
    ['Flashcards created', 'Flashcard create'],
    ['"The most impactful study tool we\'ve seen in years."', '"Lo strumento di studio più impattante che abbiamo visto negli ultimi anni."'],
    ['What we believe', 'In cosa crediamo'],
    ['Our values', 'I nostri valori'],
    ['Learn Openly', 'Imparare apertamente'],
    ['Knowledge should flow freely. We publish our research, share what works, and build in the open wherever we can. An informed learner is an empowered learner.', 'La conoscenza dovrebbe circolare liberamente. Pubblichiamo la nostra ricerca, condividiamo ciò che funziona e costruiamo in modo aperto quando possiamo. Uno studente informato è uno studente più forte.'],
    ['AI-Powered', 'AI al centro'],
    ['We harness the best of modern AI — not as a gimmick, but as a genuine co-pilot for your learning. Smart suggestions, adaptive quizzes, instant summaries — all grounded in pedagogy.', 'Usiamo il meglio dell’AI moderna non come effetto speciale, ma come vero copilota per lo studio. Suggerimenti intelligenti, quiz adattivi, riassunti immediati: tutto con solide basi pedagogiche.'],
    ['Student-First', 'Prima gli studenti'],
    ['Every decision we make starts with one question: does this actually help the student? Not the university, not the institution — the human sitting at the desk trying to understand something.', 'Ogni decisione parte da una domanda: aiuta davvero lo studente? Non l’università, non l’istituzione: la persona seduta alla scrivania che sta cercando di capire qualcosa.'],
    ['The people', 'Le persone'],
    ['Meet the founders', 'Conosci i founder'],
    ['A small, focused team building Lockeen from real student needs.', 'Un team piccolo e concentrato che costruisce Lockeen partendo da bisogni reali degli studenti.'],
    ['Co-founder', 'Co-founder'],
    ['Product, growth, and student experience.', 'Prodotto, crescita ed esperienza studenti.'],
    ['Technology, AI, and product engineering.', 'Tecnologia, AI e product engineering.'],
    ['Join us', 'Unisciti a noi'],
    ['Ready to study smarter?', 'Pronto a studiare meglio?'],
    ['Join over 120,000 students already using Lockeen to learn faster, retain more, and stress less.', 'Unisciti a oltre 120.000 studenti che usano già Lockeen per imparare più velocemente, ricordare meglio e stressarsi meno.'],
    ["Get started — it's free", 'Inizia: è gratis'],
    ['Read the blog', 'Leggi il blog'],
  ],
  careers: [
    ["We're hiring", 'Stiamo assumendo'],
    ['Build the future', 'Costruisci il futuro'],
    ['of learning', 'dello studio'],
    ["Join a small team with a big mission. We're making studying smarter, faster, and more human — for students everywhere.", 'Entra in un piccolo team con una grande missione. Stiamo rendendo lo studio più intelligente, veloce e umano per studenti ovunque.'],
    ['View open roles', 'Vedi posizioni aperte'],
    ['Open application', 'Candidatura spontanea'],
    ['How we work', 'Come lavoriamo'],
    ['Our culture is built around focus, craft, and genuine care for the students we serve.', 'La nostra cultura nasce da focus, cura del prodotto e attenzione reale verso gli studenti che serviamo.'],
    ['Move fast', 'Muoversi velocemente'],
    ['We ship often and learn quickly. Small teams, short cycles, and real feedback from real students.', 'Rilasciamo spesso e impariamo in fretta. Team piccoli, cicli brevi e feedback reale da studenti reali.'],
    ['Student-obsessed', 'Ossessionati dagli studenti'],
    ['Every decision starts with the student. We build what genuinely helps, not what just looks good.', 'Ogni decisione parte dallo studente. Costruiamo ciò che aiuta davvero, non solo ciò che sembra bello.'],
    ['Work from anywhere', 'Lavora da dove vuoi'],
    ["We're fully remote and async-first. Great work can happen anywhere, and we trust you to make it happen.", 'Siamo completamente remote e async-first. Il lavoro eccellente può nascere ovunque, e ci fidiamo del tuo modo di farlo accadere.'],
    ['Open positions', 'Posizioni aperte'],
    ['All roles are fully remote unless noted otherwise.', 'Tutti i ruoli sono completamente da remoto, salvo diversa indicazione.'],
    ['Senior Frontend Engineer', 'Senior Frontend Engineer'],
    ['Remote', 'Remoto'],
    ['Full-time', 'Full-time'],
    ['Build beautiful, fast interfaces that students love.', 'Costruisci interfacce belle e veloci che gli studenti amano usare.'],
    ['Apply', 'Candidati'],
    ['ML / AI Engineer', 'ML / AI Engineer'],
    ['Train and fine-tune models that power our AI tutor.', 'Allena e ottimizza i modelli che alimentano il nostro AI Tutor.'],
    ['Product Designer', 'Product Designer'],
    ['Design delightful experiences across web and mobile.', 'Disegna esperienze curate su web e mobile.'],
    ['Growth Marketing Manager', 'Growth Marketing Manager'],
    ['Own our go-to-market strategy and user acquisition.', 'Guida la strategia go-to-market e l’acquisizione utenti.'],
    ['Student Ambassador', 'Student Ambassador'],
    ['Flexible', 'Flessibile'],
    ['Part-time', 'Part-time'],
    ['Represent Lockeen at your university and grow our community.', 'Rappresenta Lockeen nella tua università e fai crescere la community.'],
    ["Don't see your role?", 'Non trovi il ruolo giusto?'],
    ["Send us an open application. If you're exceptional, we'll find a way to work together.", 'Mandaci una candidatura spontanea. Se sei una persona eccezionale, troveremo un modo per lavorare insieme.'],
    ['Send open application', 'Invia candidatura spontanea'],
    ['Career application', 'Candidatura'],
    ['Apply to Lockeen', 'Candidati per Lockeen'],
    ['Role: Open Application', 'Ruolo: candidatura spontanea'],
    ['What would you like to do? *', 'Cosa ti piacerebbe fare? *'],
    ['Required for open applications, so we know where to route your CV.', 'Richiesto per le candidature spontanee, così sappiamo a chi indirizzare il tuo CV.'],
    ['First name *', 'Nome *'],
    ['Last name *', 'Cognome *'],
    ['CV / Resume *', 'CV / Resume *'],
    ['PDF, DOC, or DOCX. Keep it simple.', 'PDF, DOC o DOCX. Tienilo semplice.'],
    ['Portfolio / LinkedIn', 'Portfolio / LinkedIn'],
    ['Short note', 'Breve nota'],
    ["Application ready. In this demo we don't send files yet, but form flow is complete.", 'Candidatura pronta. In questa demo non inviamo ancora file, ma il flusso del form è completo.'],
    ['Cancel', 'Annulla'],
    ['Submit application', 'Invia candidatura'],
  ],
  privacy: [
    ['Last updated: January 15, 2026', 'Ultimo aggiornamento: 15 gennaio 2026'],
    ['1. Introduction', '1. Introduzione'],
    ['At Lockeen, we are deeply committed to protecting your privacy. This Privacy Policy explains how Lockeen S.r.l. ("Lockeen", "we", "our", or "us") collects, uses, shares, and safeguards the personal information you provide when you access or use our AI-powered study platform and related services (collectively, the "Service").', 'In Lockeen ci impegniamo seriamente a proteggere la tua privacy. Questa Privacy Policy spiega come Lockeen S.r.l. ("Lockeen", "noi" o "nostro") raccoglie, usa, condivide e protegge le informazioni personali che fornisci quando accedi o utilizzi la nostra piattaforma di studio potenziata dall’AI e i servizi collegati (collettivamente, il "Servizio").'],
    ['We believe that privacy is a fundamental right. We collect only the data we need to deliver and improve our Service, we are transparent about how we use it, and we give you meaningful control over your information. By using Lockeen, you agree to the practices described in this policy.', 'Crediamo che la privacy sia un diritto fondamentale. Raccogliamo solo i dati necessari per fornire e migliorare il Servizio, siamo trasparenti su come li usiamo e ti diamo un controllo concreto sulle tue informazioni. Usando Lockeen, accetti le pratiche descritte in questa policy.'],
    ['2. Information We Collect', '2. Informazioni che raccogliamo'],
    ['We collect information in several ways depending on how you interact with our Service:', 'Raccogliamo informazioni in modi diversi a seconda di come interagisci con il Servizio:'],
    ['Account Information.', 'Informazioni account.'],
    ['When you register for a Lockeen account, we collect your name, email address, password (stored in hashed form), and optional profile details such as your educational institution or study field.', 'Quando crei un account Lockeen, raccogliamo nome, indirizzo email, password (salvata in forma hash) e dettagli opzionali del profilo, come istituto scolastico o area di studio.'],
    ['Usage Data.', 'Dati di utilizzo.'],
    ['We collect information about how you use the Service, including study session duration, flashcard decks created, quiz results and scores, AI tutor interactions, and progress analytics. This data helps us personalize your learning experience and improve our algorithms.', 'Raccogliamo informazioni su come usi il Servizio, incluse durata delle sessioni di studio, mazzi di flashcard creati, risultati e punteggi dei quiz, interazioni con l’AI Tutor e analytics di progresso. Questi dati ci aiutano a personalizzare l’esperienza e migliorare gli algoritmi.'],
    ['Device and Technical Information.', 'Informazioni tecniche e dispositivo.'],
    ['We automatically collect certain technical data when you access our Service, including your IP address, browser type and version, operating system, device identifiers, and referring URLs. This information is used for security, debugging, and service optimization purposes.', 'Raccogliamo automaticamente alcuni dati tecnici quando accedi al Servizio, inclusi indirizzo IP, tipo e versione del browser, sistema operativo, identificatori del dispositivo e URL di provenienza. Usiamo queste informazioni per sicurezza, debug e ottimizzazione del servizio.'],
    ['Cookies and Similar Technologies.', 'Cookie e tecnologie simili.'],
    ['We use cookies and similar tracking technologies to recognize your session, remember your preferences, and understand how you navigate the Service. Please refer to the Cookies section below for more detail.', 'Usiamo cookie e tecnologie simili per riconoscere la sessione, ricordare le preferenze e capire come navighi nel Servizio. Consulta la sezione Cookie qui sotto per maggiori dettagli.'],
    ['3. How We Use Your Information', '3. Come usiamo le tue informazioni'],
    ['We use the information we collect for the following purposes:', 'Usiamo le informazioni raccolte per le seguenti finalità:'],
    ['Provide and Operate the Service.', 'Fornire e gestire il Servizio.'],
    ['Your account information and usage data are necessary to authenticate you, deliver the core features of Lockeen (flashcards, quizzes, AI tutor, analytics), and maintain the reliability and security of the platform.', 'Le informazioni account e i dati di utilizzo sono necessari per autenticarti, fornire le funzioni principali di Lockeen (flashcard, quiz, AI Tutor, analytics) e mantenere affidabilità e sicurezza della piattaforma.'],
    ['Personalize Your Learning.', 'Personalizzare il tuo apprendimento.'],
    ['We analyze your study sessions, quiz performance, and interaction patterns to tailor recommendations, adapt difficulty levels, and surface review material at the right time — helping you study more efficiently.', 'Analizziamo sessioni di studio, performance nei quiz e pattern di interazione per personalizzare raccomandazioni, adattare la difficoltà e mostrarti il materiale da ripassare al momento giusto, aiutandoti a studiare in modo più efficiente.'],
    ['Improve the Service.', 'Migliorare il Servizio.'],
    ['Aggregated and anonymized usage data helps us understand how users engage with Lockeen, identify areas for improvement, develop new features, and fix bugs.', 'I dati di utilizzo aggregati e anonimizzati ci aiutano a capire come gli utenti interagiscono con Lockeen, individuare aree di miglioramento, sviluppare nuove funzioni e correggere bug.'],
    ['Send Important Updates.', 'Inviare aggiornamenti importanti.'],
    ['We may contact you by email to deliver transactional communications (account confirmations, password resets), important policy updates, and, where you have consented, product news and study tips. You may opt out of marketing emails at any time.', 'Potremmo contattarti via email per comunicazioni transazionali (conferme account, reset password), aggiornamenti importanti delle policy e, se hai dato consenso, novità prodotto e consigli di studio. Puoi disiscriverti dalle email marketing in qualsiasi momento.'],
    ['4. Data Sharing', '4. Condivisione dei dati'],
    ['We do not sell, rent, or trade your personal information to third parties. We share your data only in the limited circumstances described below:', 'Non vendiamo, affittiamo né cediamo le tue informazioni personali a terzi. Condividiamo i dati solo nelle circostanze limitate descritte di seguito:'],
    ['Service Providers.', 'Fornitori di servizi.'],
    ['We engage trusted third-party companies to help us operate Lockeen, including cloud infrastructure and hosting providers, analytics services, payment processors, and email delivery platforms. These providers are contractually bound to use your data solely to perform services on our behalf and may not use it for their own purposes.', 'Collaboriamo con aziende terze fidate per gestire Lockeen, inclusi provider cloud e hosting, servizi analytics, processori di pagamento e piattaforme email. Questi fornitori sono contrattualmente vincolati a usare i dati solo per fornire servizi per nostro conto e non per finalità proprie.'],
    ['Legal Requirements.', 'Obblighi legali.'],
    ['We may disclose your information if we believe in good faith that such disclosure is required to comply with applicable law, regulation, legal process, or governmental request; to enforce our Terms of Service; or to protect the rights, property, or safety of Lockeen, our users, or the public.', 'Potremmo divulgare le tue informazioni se riteniamo in buona fede che sia necessario per rispettare leggi, regolamenti, procedimenti legali o richieste governative; per far rispettare i nostri Termini di servizio; o per proteggere diritti, proprietà o sicurezza di Lockeen, degli utenti o del pubblico.'],
    ['Business Transfers.', 'Operazioni societarie.'],
    ['In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on our Service before your data becomes subject to a different privacy policy.', 'In caso di fusione, acquisizione o vendita totale o parziale degli asset, le tue informazioni potrebbero essere trasferite come parte dell’operazione. Ti avviseremo via email e/o con un avviso evidente nel Servizio prima che i dati siano soggetti a una diversa privacy policy.'],
    ['5. Data Retention', '5. Conservazione dei dati'],
    ['We retain your personal information for as long as your account is active or as needed to provide the Service. If you delete your account, we will permanently delete your personal data within 30 days, except where we are required to retain it for longer periods to comply with legal obligations (such as tax or accounting requirements), resolve disputes, or enforce our agreements.', 'Conserviamo le tue informazioni personali finché l’account è attivo o per il tempo necessario a fornire il Servizio. Se elimini l’account, cancelleremo definitivamente i dati personali entro 30 giorni, salvo obblighi di conservazione più lunghi per legge (ad esempio fiscali o contabili), risoluzione di controversie o applicazione dei nostri accordi.'],
    ['Aggregated, anonymized data that cannot reasonably be used to identify you may be retained indefinitely for analytical and product improvement purposes.', 'I dati aggregati e anonimizzati che non possono ragionevolmente identificarti possono essere conservati senza limite per finalità analitiche e di miglioramento prodotto.'],
    ['6. Your Rights', '6. I tuoi diritti'],
    ['Depending on your location, you may have the following rights with respect to your personal data:', 'A seconda della tua posizione, potresti avere i seguenti diritti sui tuoi dati personali:'],
    ['Access.', 'Accesso.'],
    ['You have the right to request a copy of the personal data we hold about you.', 'Hai il diritto di richiedere una copia dei dati personali che conserviamo su di te.'],
    ['Rectification.', 'Rettifica.'],
    ['You may request that we correct inaccurate or incomplete personal data.', 'Puoi chiederci di correggere dati personali inesatti o incompleti.'],
    ['Erasure.', 'Cancellazione.'],
    ['You may request deletion of your personal data, subject to certain legal exceptions.', 'Puoi richiedere la cancellazione dei dati personali, salvo eccezioni previste dalla legge.'],
    ['Data Portability.', 'Portabilità dei dati.'],
    ['You may request that we provide your data in a structured, commonly used, machine-readable format.', 'Puoi richiedere che i tuoi dati siano forniti in un formato strutturato, di uso comune e leggibile da macchina.'],
    ['Objection.', 'Opposizione.'],
    ['You have the right to object to processing of your personal data for direct marketing purposes or, in certain circumstances, for other purposes based on our legitimate interests.', 'Hai il diritto di opporti al trattamento dei dati personali per marketing diretto o, in alcune circostanze, per altre finalità basate sui nostri legittimi interessi.'],
    ['To exercise any of these rights, please contact us at', 'Per esercitare questi diritti, contattaci a'],
    ['. We will respond to your request within 30 days.', '. Risponderemo alla tua richiesta entro 30 giorni.'],
    ['7. Cookies', '7. Cookie'],
    ['We use cookies and similar technologies on our platform. Here is a summary of the types we use:', 'Usiamo cookie e tecnologie simili sulla piattaforma. Ecco un riepilogo delle tipologie che utilizziamo:'],
    ['Essential Cookies.', 'Cookie essenziali.'],
    ['These cookies are strictly necessary for the Service to function. They enable core functionality such as user authentication and session management. You cannot opt out of these cookies while using the Service.', 'Questi cookie sono strettamente necessari al funzionamento del Servizio. Abilitano funzioni essenziali come autenticazione utente e gestione sessione. Non puoi disattivarli mentre usi il Servizio.'],
    ['Analytics Cookies.', 'Cookie analytics.'],
    ['We use analytics cookies to understand how users interact with Lockeen — which features are popular, where users encounter difficulties, and how performance can be improved. You may opt out of analytics cookies at any time through your account settings or by using standard browser controls.', 'Usiamo cookie analytics per capire come gli utenti interagiscono con Lockeen: quali funzioni sono popolari, dove incontrano difficoltà e come migliorare le performance. Puoi disattivarli in qualsiasi momento dalle impostazioni account o usando i controlli del browser.'],
    ['Advertising Cookies.', 'Cookie pubblicitari.'],
    ['We do not use advertising or third-party tracking cookies on Lockeen. We do not display third-party advertisements.', 'Non usiamo cookie pubblicitari o di tracciamento di terze parti su Lockeen. Non mostriamo pubblicità di terze parti.'],
    ["8. Children's Privacy", '8. Privacy dei minori'],
    ['Lockeen is not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information without your consent, please contact us immediately at', 'Lockeen non è rivolto a minori di 13 anni e non raccogliamo consapevolmente informazioni personali da minori di 13 anni. Se sei genitore o tutore e ritieni che tuo figlio ci abbia fornito informazioni personali senza consenso, contattaci subito a'],
    ['and we will take prompt steps to delete such information.', 'e prenderemo rapidamente le misure necessarie per eliminare tali informazioni.'],
    ['Users between the ages of 13 and 18 should review this policy with a parent or guardian before using the Service.', 'Gli utenti tra 13 e 18 anni dovrebbero leggere questa policy con un genitore o tutore prima di usare il Servizio.'],
    ['9. Changes to This Policy', '9. Modifiche a questa policy'],
    ['We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by sending an email to the address associated with your account at least 14 days before the changes take effect, and we will update the "Last updated" date at the top of this page.', 'Potremmo aggiornare questa Privacy Policy per riflettere cambiamenti nelle pratiche, nella tecnologia, nei requisiti legali o in altri fattori. In caso di modifiche sostanziali, ti informeremo inviando un’email all’indirizzo associato all’account almeno 14 giorni prima dell’entrata in vigore e aggiorneremo la data "Ultimo aggiornamento" in cima alla pagina.'],
    ['We encourage you to review this policy periodically. Your continued use of the Service after any changes become effective constitutes your acceptance of the revised policy.', 'Ti invitiamo a consultare periodicamente questa policy. L’uso continuato del Servizio dopo l’entrata in vigore delle modifiche costituisce accettazione della policy aggiornata.'],
    ['10. Contact Us', '10. Contattaci'],
    ['If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to us:', 'Per domande, dubbi o richieste relative a questa Privacy Policy o alle nostre pratiche sui dati, contattaci:'],
    ['Email:', 'Email:'],
    ['Mailing Address:', 'Indirizzo postale:'],
    ['Milan, Italy', 'Milano, Italia'],
  ],
  terms: [
    ['Last updated: January 15, 2026', 'Ultimo aggiornamento: 15 gennaio 2026'],
    ['1. Acceptance of Terms', '1. Accettazione dei termini'],
    ['By accessing or using the Lockeen platform, website, or any related services (collectively, the "Service"), you confirm that you have read, understood, and agree to be bound by these Terms of Service ("Terms") and our', 'Accedendo o usando la piattaforma Lockeen, il sito o qualsiasi servizio collegato (collettivamente, il "Servizio"), confermi di aver letto, compreso e accettato di essere vincolato da questi Termini di servizio ("Termini") e dalla nostra'],
    [', which is incorporated by reference.', ', incorporata per riferimento.'],
    ['If you do not agree to these Terms, you must not access or use the Service. These Terms constitute a legally binding agreement between you and Lockeen S.r.l. ("Lockeen", "we", "our", or "us"). If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.', 'Se non accetti questi Termini, non devi accedere né usare il Servizio. Questi Termini costituiscono un accordo legalmente vincolante tra te e Lockeen S.r.l. ("Lockeen", "noi" o "nostro"). Se usi il Servizio per conto di un’organizzazione, dichiari di avere l’autorità per vincolare tale organizzazione ai Termini.'],
    ['2. Description of Service', '2. Descrizione del servizio'],
    ['Lockeen is an AI-powered study platform designed to help students learn more effectively. The Service includes, but is not limited to, the following features:', 'Lockeen è una piattaforma di studio potenziata dall’AI progettata per aiutare gli studenti a imparare in modo più efficace. Il Servizio include, tra le altre, le seguenti funzioni:'],
    ['— create, organize, and review smart flashcard decks with spaced-repetition scheduling.', '— crea, organizza e ripassa mazzi di flashcard intelligenti con programmazione a ripetizione dilazionata.'],
    ['— auto-generated and custom quizzes to test and reinforce knowledge.', '— quiz generati automaticamente e personalizzati per testare e consolidare le conoscenze.'],
    ['— an intelligent assistant that explains concepts, answers questions, and adapts to your learning style.', '— un assistente intelligente che spiega concetti, risponde alle domande e si adatta al tuo stile di apprendimento.'],
    ['— personalized study insights, progress tracking, and performance reports.', '— insight personalizzati, tracciamento dei progressi e report sulle performance.'],
    ['We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time. We will provide reasonable notice of significant changes where practicable.', 'Ci riserviamo il diritto di modificare, sospendere o interrompere qualsiasi aspetto del Servizio in qualsiasi momento. Forniremo un preavviso ragionevole per modifiche significative quando possibile.'],
    ['3. Account Registration', '3. Registrazione account'],
    ['To access the full features of Lockeen, you must create an account. When registering, you agree to provide accurate, current, and complete information and to keep this information up to date at all times.', 'Per accedere a tutte le funzioni di Lockeen devi creare un account. Registrandoti, accetti di fornire informazioni accurate, aggiornate e complete e di mantenerle sempre aggiornate.'],
    ['You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately at', 'Sei l’unico responsabile della riservatezza delle credenziali e di tutte le attività svolte tramite il tuo account. Accetti di avvisarci immediatamente a'],
    ['if you suspect any unauthorized access to or use of your account.', 'se sospetti accessi o usi non autorizzati del tuo account.'],
    ['You may not create an account if you are under 13 years of age. By registering, you confirm that you meet this minimum age requirement.', 'Non puoi creare un account se hai meno di 13 anni. Registrandoti, confermi di rispettare questo requisito minimo di età.'],
    ['4. Acceptable Use', '4. Uso accettabile'],
    ['Lockeen is intended for lawful educational and study purposes. By using the Service, you agree not to:', 'Lockeen è destinato a finalità educative e di studio lecite. Usando il Servizio, accetti di non:'],
    ['Share, sell, or transfer your account credentials to any other person.', 'Condividere, vendere o trasferire le credenziali dell’account ad altre persone.'],
    ['Reverse engineer, decompile, disassemble, or attempt to derive the source code of any part of the Service.', 'Fare reverse engineering, decompilare, disassemblare o tentare di ricavare il codice sorgente di qualsiasi parte del Servizio.'],
    ['Upload, transmit, or distribute any content that is illegal, harmful, defamatory, obscene, or that infringes the intellectual property rights of any third party.', 'Caricare, trasmettere o distribuire contenuti illegali, dannosi, diffamatori, osceni o che violino diritti di proprietà intellettuale di terzi.'],
    ['Use the Service to create, distribute, or promote tools intended to facilitate academic dishonesty, plagiarism, or cheating of any kind.', 'Usare il Servizio per creare, distribuire o promuovere strumenti destinati a facilitare disonestà accademica, plagio o cheating di qualsiasi tipo.'],
    ['Attempt to gain unauthorized access to any part of the Service, its servers, or any systems or networks connected to the Service.', 'Tentare di ottenere accesso non autorizzato a qualsiasi parte del Servizio, ai server o a sistemi e reti collegati.'],
    ['Use automated scripts, bots, or scrapers to access or collect data from the Service without our prior written consent.', 'Usare script automatizzati, bot o scraper per accedere o raccogliere dati dal Servizio senza nostro previo consenso scritto.'],
    ['Use the Service in any manner that could damage, disable, overburden, or impair its infrastructure.', 'Usare il Servizio in modo da danneggiare, disabilitare, sovraccaricare o compromettere la sua infrastruttura.'],
    ['Violation of these acceptable use standards may result in immediate suspension or termination of your account.', 'La violazione di questi standard può comportare la sospensione o chiusura immediata dell’account.'],
    ['5. Subscription and Payments', '5. Abbonamenti e pagamenti'],
    ['Lockeen offers a free tier with limited features, as well as paid Pro subscription plans billed on a monthly or annual basis. By subscribing to a paid plan, you authorize us to charge the applicable fees to your designated payment method.', 'Lockeen offre un piano gratuito con funzioni limitate e piani Pro a pagamento con fatturazione mensile o annuale. Sottoscrivendo un piano a pagamento, ci autorizzi ad addebitare le tariffe applicabili al metodo di pagamento indicato.'],
    ['Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. You may cancel your subscription at any time through your account settings.', 'Gli abbonamenti si rinnovano automaticamente alla fine di ogni periodo di fatturazione salvo cancellazione prima della data di rinnovo. Puoi annullare l’abbonamento in qualsiasi momento dalle impostazioni account.'],
    ["All fees are exclusive of applicable taxes. We reserve the right to adjust pricing at any time, with at least 30 days' advance notice provided to active subscribers.", 'Tutte le tariffe sono al netto delle imposte applicabili. Ci riserviamo il diritto di modificare i prezzi in qualsiasi momento, con almeno 30 giorni di preavviso agli abbonati attivi.'],
    ['Refund Policy.', 'Politica di rimborso.'],
    ['Except as required by applicable law, all payments are non-refundable. If you believe you have been charged in error, please contact us at', 'Salvo quanto richiesto dalla legge applicabile, tutti i pagamenti non sono rimborsabili. Se ritieni che ti sia stato addebitato un importo per errore, contattaci a'],
    ['within 14 days of the charge and we will review your case.', 'entro 14 giorni dall’addebito e valuteremo il caso.'],
    ['6. Intellectual Property', '6. Proprietà intellettuale'],
    ["Lockeen's Property.", 'Proprietà di Lockeen.'],
    ['The Service and all of its contents, features, and functionality — including but not limited to software, algorithms, text, graphics, logos, icons, and the overall design — are the exclusive property of Lockeen S.r.l. and are protected by applicable intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our express written permission.', 'Il Servizio e tutti i suoi contenuti, funzioni e funzionalità, inclusi software, algoritmi, testi, grafiche, loghi, icone e design complessivo, sono proprietà esclusiva di Lockeen S.r.l. e sono protetti dalle leggi applicabili sulla proprietà intellettuale. Non puoi riprodurre, distribuire, modificare o creare opere derivate senza nostro esplicito permesso scritto.'],
    ['Your Content.', 'I tuoi contenuti.'],
    ['You retain full ownership of any content you upload or create using the Service, including study notes, flashcard decks, and other materials ("User Content"). By uploading User Content, you grant Lockeen a non-exclusive, worldwide, royalty-free license to store, process, and display your User Content solely for the purpose of providing and improving the Service.', 'Mantieni la piena proprietà dei contenuti che carichi o crei usando il Servizio, inclusi appunti, mazzi di flashcard e altri materiali ("Contenuti utente"). Caricando Contenuti utente, concedi a Lockeen una licenza non esclusiva, mondiale e gratuita per conservarli, elaborarli e mostrarli solo allo scopo di fornire e migliorare il Servizio.'],
    ['You represent and warrant that you have all rights necessary to grant this license and that your User Content does not infringe any third-party rights.', 'Dichiari e garantisci di avere tutti i diritti necessari per concedere questa licenza e che i tuoi Contenuti utente non violano diritti di terzi.'],
    ['7. Privacy', '7. Privacy'],
    ['Your use of the Service is also governed by our', 'L’uso del Servizio è regolato anche dalla nostra'],
    [', which describes how we collect, use, and protect your personal information. By using Lockeen, you consent to the data practices described in the Privacy Policy.', ', che descrive come raccogliamo, usiamo e proteggiamo le tue informazioni personali. Usando Lockeen, acconsenti alle pratiche sui dati descritte nella Privacy Policy.'],
    ['8. Disclaimers', '8. Esclusioni di garanzia'],
    ['THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, LOCKEEN DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.', 'IL SERVIZIO È FORNITO "COSÌ COM’È" E "COME DISPONIBILE", SENZA GARANZIE DI ALCUN TIPO, ESPRESSE O IMPLICITE. NELLA MISURA MASSIMA CONSENTITA DALLA LEGGE, LOCKEEN ESCLUDE OGNI GARANZIA, INCLUSE QUELLE DI COMMERCIABILITÀ, IDONEITÀ A UNO SCOPO SPECIFICO E NON VIOLAZIONE.'],
    ['Lockeen is a study aid designed to support your learning. We do not guarantee any specific academic outcomes, exam results, grades, or educational achievements resulting from use of the Service. Academic success depends on many factors outside our control, and you remain solely responsible for your educational decisions and results.', 'Lockeen è uno strumento di supporto allo studio. Non garantiamo specifici risultati accademici, esiti d’esame, voti o traguardi educativi derivanti dall’uso del Servizio. Il successo accademico dipende da molti fattori fuori dal nostro controllo e resti l’unico responsabile delle tue decisioni e dei risultati.'],
    ['We do not warrant that the Service will be uninterrupted, error-free, or free from viruses or other harmful components.', 'Non garantiamo che il Servizio sia ininterrotto, privo di errori o libero da virus o altri componenti dannosi.'],
    ['9. Limitation of Liability', '9. Limitazione di responsabilità'],
    ['TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, LOCKEEN AND ITS DIRECTORS, EMPLOYEES, PARTNERS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.', 'NELLA MISURA MASSIMA CONSENTITA DALLA LEGGE, LOCKEEN E I SUOI AMMINISTRATORI, DIPENDENTI, PARTNER E AFFILIATI NON SARANNO RESPONSABILI PER DANNI INDIRETTI, INCIDENTALI, SPECIALI, CONSEQUENZIALI O PUNITIVI DERIVANTI DA O COLLEGATI ALL’USO DEL SERVIZIO, ANCHE SE INFORMATI DELLA POSSIBILITÀ DI TALI DANNI.'],
    ["In any case, Lockeen's aggregate liability to you for all claims arising out of or related to your use of the Service shall not exceed the total amount you paid to Lockeen in the twelve (12) months immediately preceding the event giving rise to the claim, or €50, whichever is greater.", 'In ogni caso, la responsabilità complessiva di Lockeen verso di te per reclami derivanti da o collegati all’uso del Servizio non supererà l’importo totale pagato a Lockeen nei dodici (12) mesi immediatamente precedenti l’evento che ha dato origine al reclamo, oppure €50, se superiore.'],
    ['Some jurisdictions do not allow the exclusion or limitation of liability for certain types of damages, so some of the above limitations may not apply to you.', 'Alcune giurisdizioni non consentono l’esclusione o limitazione di responsabilità per alcuni tipi di danni, quindi alcune limitazioni potrebbero non applicarsi.'],
    ['10. Termination', '10. Chiusura account'],
    ['You may terminate your account at any time by deleting your account through the account settings page or by contacting us at', 'Puoi chiudere l’account in qualsiasi momento eliminandolo dalle impostazioni account o contattandoci a'],
    ['. Upon termination, your right to use the Service ceases immediately and your data will be handled in accordance with our Privacy Policy.', '. Alla chiusura, il tuo diritto di usare il Servizio termina immediatamente e i dati saranno gestiti secondo la nostra Privacy Policy.'],
    ['We reserve the right to suspend or terminate your access to the Service at our sole discretion, with or without notice, if we determine that you have violated these Terms, engaged in fraudulent activity, or for any other reason we deem necessary to protect the Service or other users.', 'Ci riserviamo il diritto di sospendere o chiudere l’accesso al Servizio a nostra discrezione, con o senza preavviso, se riteniamo che tu abbia violato questi Termini, svolto attività fraudolente o per qualsiasi altra ragione necessaria a proteggere il Servizio o gli utenti.'],
    ['Provisions of these Terms that by their nature should survive termination — including intellectual property rights, disclaimers, and limitations of liability — shall survive.', 'Le disposizioni che per loro natura devono sopravvivere alla chiusura, inclusi diritti di proprietà intellettuale, esclusioni di garanzia e limitazioni di responsabilità, resteranno valide.'],
    ['11. Governing Law and Disputes', '11. Legge applicabile e controversie'],
    ['These Terms and any dispute arising out of or in connection with them or your use of the Service shall be governed by and construed in accordance with the laws of Italy, without regard to its conflict of law principles.', 'Questi Termini e qualsiasi controversia derivante da o collegata a essi o all’uso del Servizio saranno regolati e interpretati secondo le leggi italiane, senza riguardo ai principi sul conflitto di leggi.'],
    ['Any disputes that cannot be resolved informally shall be submitted to the exclusive jurisdiction of the courts of Milan, Italy. If you are a consumer resident in the European Union, you may also have the right to use the EU Online Dispute Resolution platform at', 'Qualsiasi controversia non risolta informalmente sarà sottoposta alla giurisdizione esclusiva dei tribunali di Milano, Italia. Se sei un consumatore residente nell’Unione Europea, potresti anche avere diritto a usare la piattaforma europea di risoluzione online delle controversie a'],
    ['Before initiating any formal dispute, we encourage you to contact us directly so that we can attempt to resolve the matter amicably.', 'Prima di avviare una controversia formale, ti invitiamo a contattarci direttamente per tentare una soluzione amichevole.'],
    ['12. Contact Us', '12. Contattaci'],
    ['If you have any questions about these Terms of Service or wish to report a violation, please contact our legal team:', 'Per domande su questi Termini di servizio o per segnalare una violazione, contatta il nostro team legale:'],
    ['Email:', 'Email:'],
    ['Mailing Address:', 'Indirizzo postale:'],
    ['Milan, Italy', 'Milano, Italia'],
  ],
  blog: [
    ['From the Lockeen team', 'Dal team Lockeen'],
    ['Ideas worth', 'Idee che vale la pena'],
    ['studying.', 'studiare.'],
    ['Research, product updates, and learning science — straight from the people building Lockeen.', 'Ricerca, aggiornamenti prodotto e scienza dell’apprendimento, direttamente dalle persone che costruiscono Lockeen.'],
    ['All', 'Tutti'],
    ['AI &amp; Learning', 'AI e apprendimento'],
    ['AI & Learning', 'AI e apprendimento'],
    ['Study Tips', 'Consigli di studio'],
    ['Research', 'Ricerca'],
    ['Featured', 'In evidenza'],
    ['Read article', 'Leggi articolo'],
    ['No articles found.', 'Nessun articolo trovato.'],
    ['Load more articles', 'Carica altri articoli'],
    ['← Back to Blog', '← Torna al blog'],
    ['How AI is transforming the way students study', 'Come l’AI sta trasformando il modo in cui gli studenti studiano'],
    ['From personalized flashcards to real-time concept mapping, artificial intelligence is fundamentally reshaping how the next generation of learners absorbs and retains knowledge.', 'Dalle flashcard personalizzate alle mappe concettuali in tempo reale, l’intelligenza artificiale sta trasformando profondamente il modo in cui la nuova generazione di studenti assorbe e conserva conoscenze.'],
    ["Artificial intelligence has quietly become one of the most powerful tools in a student's arsenal. From personalized flashcard schedules to AI tutors that explain concepts in real time, the technology is fundamentally reshaping how people learn.", 'L’intelligenza artificiale è diventata silenziosamente uno degli strumenti più potenti a disposizione degli studenti. Dai calendari di flashcard personalizzati ai tutor AI che spiegano concetti in tempo reale, questa tecnologia sta trasformando in profondità il modo in cui le persone imparano.'],
    ['Personalization at scale', 'Personalizzazione su larga scala'],
    ['Traditional education is one-size-fits-all. A classroom of 30 students receives the same lecture, the same pace, the same examples. AI changes this by adapting to each learner individually — identifying weak spots, adjusting difficulty, and surfacing content at the optimal moment for retention.', 'L’educazione tradizionale è spesso uguale per tutti. Una classe di 30 studenti riceve la stessa lezione, lo stesso ritmo, gli stessi esempi. L’AI cambia questo modello adattandosi a ogni studente: individua i punti deboli, regola la difficoltà e propone i contenuti nel momento migliore per memorizzarli.'],
    ["Spaced repetition algorithms, powered by machine learning models trained on millions of study sessions, can now predict with remarkable accuracy when you're about to forget a piece of information — and show it to you just before that moment arrives.", 'Gli algoritmi di ripetizione dilazionata, alimentati da modelli di machine learning addestrati su milioni di sessioni di studio, possono prevedere con grande precisione quando stai per dimenticare un’informazione e mostrartela appena prima che accada.'],
    ['Real-time concept mapping', 'Mappe concettuali in tempo reale'],
    ["Beyond flashcards, AI is enabling entirely new study formats. Tools like Lockeen's AI Tutor can take a dense research paper and produce an interactive concept map in seconds — showing you how ideas relate, where the key arguments sit, and which sections are most relevant to your exam.", 'Oltre alle flashcard, l’AI rende possibili nuovi formati di studio. Strumenti come l’AI Tutor di Lockeen possono prendere un paper complesso e generare in pochi secondi una mappa concettuale interattiva, mostrando come le idee si collegano, dove si trovano gli argomenti principali e quali sezioni sono più rilevanti per l’esame.'],
    ['What the research says', 'Cosa dice la ricerca'],
    ['A 2025 study from the University of Cambridge found that students using AI-assisted study tools improved their exam scores by an average of 23% over a single semester. More importantly, they reported spending 40% less time on passive re-reading — one of the least effective study strategies.', 'Uno studio del 2025 dell’Università di Cambridge ha rilevato che gli studenti che usano strumenti di studio assistiti dall’AI hanno migliorato i risultati d’esame in media del 23% in un solo semestre. Ancora più importante: hanno dichiarato di passare il 40% di tempo in meno nella rilettura passiva, una delle strategie meno efficaci.'],
    ["The future of studying isn't about working harder. It's about working smarter — and AI is making that possible for every student, regardless of background or resources.", 'Il futuro dello studio non significa lavorare di più. Significa lavorare meglio, e l’AI sta rendendo questo possibile per ogni studente, indipendentemente da background o risorse.'],
    ['May 14, 2026 · 8 min read', '14 maggio 2026 · 8 min di lettura'],
    ['May 14, 2026', '14 maggio 2026'],
    ['8 min read', '8 min di lettura'],
    ['5 proven techniques to memorize faster', '5 tecniche provate per memorizzare più velocemente'],
    ['Not all memorization strategies are created equal. These five evidence-backed techniques will help you lock in information faster and keep it for longer.', 'Non tutte le strategie di memorizzazione sono uguali. Queste cinque tecniche basate su evidenze ti aiutano a fissare le informazioni più velocemente e mantenerle più a lungo.'],
    ['May 10, 2026', '10 maggio 2026'],
    ['5 min read', '5 min di lettura'],
    ['May 10, 2026 · 5 min read', '10 maggio 2026 · 5 min di lettura'],
    ['Introducing Lockeen 2.0: smarter, faster, better', 'Ti presentiamo Lockeen 2.0: più intelligente, veloce e migliore'],
    ["Today we're shipping the biggest update in Lockeen's history. New AI engine, redesigned workspace, and a batch of features students asked for.", 'Oggi rilasciamo il più grande aggiornamento nella storia di Lockeen: nuovo motore AI, workspace ridisegnato e tante funzioni richieste dagli studenti.'],
    ['May 7, 2026', '7 maggio 2026'],
    ['4 min read', '4 min di lettura'],
    ['May 7, 2026 · 4 min read', '7 maggio 2026 · 4 min di lettura'],
    ['The science behind spaced repetition', 'La scienza dietro la ripetizione dilazionata'],
    ["Decades of cognitive research point to one clear winner for long-term retention. Here's how spaced repetition works — and why Lockeen is built around it.", 'Decenni di ricerca cognitiva indicano una tecnica vincente per la memoria a lungo termine. Ecco come funziona la ripetizione dilazionata e perché Lockeen è costruito intorno a essa.'],
    ['Apr 29, 2026', '29 aprile 2026'],
    ['9 min read', '9 min di lettura'],
    ['Apr 29, 2026 · 9 min read', '29 aprile 2026 · 9 min di lettura'],
    ['How to build a study routine that actually sticks', 'Come costruire una routine di studio che duri davvero'],
    ["Most study routines fail within a week. We looked at what separates the ones that last — and it's not about discipline, it's about design.", 'La maggior parte delle routine di studio fallisce entro una settimana. Abbiamo analizzato cosa distingue quelle che durano: non è disciplina, è design.'],
    ['Apr 22, 2026', '22 aprile 2026'],
    ['6 min read', '6 min di lettura'],
    ['Apr 22, 2026 · 6 min read', '22 aprile 2026 · 6 min di lettura'],
    ['Why students at top universities are switching to AI tools', 'Perché gli studenti delle migliori università stanno passando agli strumenti AI'],
    ['Students at MIT, Oxford, and Bocconi are quietly replacing their old study habits with AI-powered workflows. We spoke to a dozen of them to find out why.', 'Studenti di MIT, Oxford e Bocconi stanno sostituendo in silenzio vecchie abitudini di studio con workflow potenziati dall’AI. Ne abbiamo intervistati alcuni per capire perché.'],
    ['Apr 15, 2026', '15 aprile 2026'],
    ['7 min read', '7 min di lettura'],
    ['Apr 15, 2026 · 7 min read', '15 aprile 2026 · 7 min di lettura'],
    ['What cognitive science tells us about procrastination', 'Cosa ci dice la scienza cognitiva sulla procrastinazione'],
    ["Procrastination isn't a time-management problem — it's an emotion-regulation problem. Understanding this changes how you fix it.", 'La procrastinazione non è un problema di gestione del tempo: è un problema di regolazione emotiva. Capirlo cambia il modo di affrontarla.'],
    ['Apr 8, 2026', '8 aprile 2026'],
    ['Apr 8, 2026 · 8 min read', '8 aprile 2026 · 8 min di lettura'],
    ['How to ace your exams with active recall', 'Come superare gli esami con active recall'],
    ["Active recall is the single most effective study technique validated by cognitive science. Here's a practical guide to using it.", 'L’active recall è la tecnica di studio più efficace validata dalla scienza cognitiva. Ecco una guida pratica per usarla.'],
    ['Mar 30, 2026', '30 marzo 2026'],
    ['Mar 30, 2026 · 6 min read', '30 marzo 2026 · 6 min di lettura'],
    ["Lockeen's new Calendar: plan your semester in minutes", 'Il nuovo Calendario di Lockeen: pianifica il semestre in pochi minuti'],
    ["We built the study calendar we always wanted — one that actually understands how students think about time.", 'Abbiamo costruito il calendario di studio che avremmo sempre voluto: uno strumento che capisce davvero come gli studenti pensano al tempo.'],
    ['Mar 20, 2026', '20 marzo 2026'],
    ['Mar 20, 2026 · 4 min read', '20 marzo 2026 · 4 min di lettura'],
    ['The optimal study session length (according to science)', 'La durata ideale di una sessione di studio secondo la scienza'],
    ["How long should you study before taking a break? The answer might surprise you — and it's not 25 minutes.", 'Quanto dovresti studiare prima di fare una pausa? La risposta potrebbe sorprenderti: non è 25 minuti.'],
    ['Mar 12, 2026', '12 marzo 2026'],
    ['Mar 12, 2026 · 7 min read', '12 marzo 2026 · 7 min di lettura'],
    ['Building better flashcards: a practical guide', 'Creare flashcard migliori: guida pratica'],
    ["Most flashcards are badly designed — too long, too passive, too easy. Here's how to make cards that actually work.", 'La maggior parte delle flashcard è progettata male: troppo lunga, troppo passiva, troppo facile. Ecco come creare carte che funzionano davvero.'],
    ['Mar 5, 2026', '5 marzo 2026'],
    ['Mar 5, 2026 · 5 min read', '5 marzo 2026 · 5 min di lettura'],
    ['AI tutors vs. human tutors: an honest comparison', 'Tutor AI vs tutor umani: un confronto onesto'],
    ['AI tutors are getting very good. But are they better than human tutors? The answer depends on what you need.', 'I tutor AI stanno diventando molto validi. Ma sono migliori dei tutor umani? Dipende da ciò di cui hai bisogno.'],
    ['Feb 25, 2026', '25 febbraio 2026'],
    ['Feb 25, 2026 · 8 min read', '25 febbraio 2026 · 8 min di lettura'],
    ['Stay in the loop', 'Resta aggiornato'],
    ['New articles, research drops, and product updates — delivered weekly. No spam.', 'Nuovi articoli, ricerche e aggiornamenti prodotto ogni settimana. Niente spam.'],
    ['Subscribe', 'Iscriviti'],
    ['Read →', 'Leggi →'],
  ],
};

function normalizePage(raw) {
  if (!raw) return 'about';
  return raw.replace(/\.html$/, '');
}

function normalizeStaticLang(lang) {
  return lang === 'it' ? 'it' : 'en';
}

function getStaticLang() {
  return normalizeStaticLang(localStorage.getItem('lockeen-lang') || 'en');
}

function updateStaticDocumentTitle(lang, pageName) {
  document.title = pageTitles[lang]?.[pageName] || pageTitles.en[pageName] || 'Lockeen';
}

function ensureStaticLanguageControls(root, lang) {
  const makeSelect = (extraClass = '') => `
    <select class="lang-select lang-select-compact js-static-lang-select ${extraClass}" aria-label="Language">
      <option value="en">🇬🇧 EN</option>
      <option value="it">🇮🇹 IT</option>
    </select>`;

  const desktopActions = root.querySelector('nav .hidden.md\\:flex.items-center.gap-4');
  if (desktopActions && !desktopActions.querySelector('.js-static-lang-select')) {
    desktopActions.insertAdjacentHTML('afterbegin', makeSelect());
  }

  const mobileMenu = root.querySelector('#mob-menu');
  if (mobileMenu && !mobileMenu.querySelector('.js-static-lang-select')) {
    mobileMenu.insertAdjacentHTML('afterbegin', makeSelect('w-full mb-3'));
  }

  const navRow = root.querySelector('nav .h-20');
  if (navRow && !mobileMenu && !root.querySelector('.js-static-lang-select-mobile-inline')) {
    const mobileToggle = root.querySelector('#mob-toggle');
    const mobileWrap = document.createElement('div');
    mobileWrap.className = 'js-static-lang-select-mobile-inline md:hidden ml-auto mr-3';
    mobileWrap.innerHTML = makeSelect();
    navRow.insertBefore(mobileWrap, mobileToggle || null);
  }

  root.querySelectorAll('.js-static-lang-select').forEach((select) => {
    select.value = lang;
  });
}

function ensureStaticNavLinks(root) {
  const desktopNav = root.querySelector('nav .hidden.md\\:flex.items-center.gap-8');
  const mobileMenu = root.querySelector('#mob-menu');
  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/#product', label: 'Product' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
  ];

  if (desktopNav && desktopNav.dataset.staticNavReady !== 'true') {
    desktopNav.innerHTML = navLinks.map(({ href, label }) => (
      `<a href="${href}" class="text-[#070B2D]/70 hover:text-[#070B2D] transition-colors">${label}</a>`
    )).join('');
    desktopNav.dataset.staticNavReady = 'true';
  }

  if (mobileMenu && mobileMenu.dataset.staticNavReady !== 'true') {
    const authLink = mobileMenu.querySelector('[data-static-auth="signup"]')?.outerHTML
      || '<a href="#signup" data-static-auth="signup" class="block mt-4 px-6 py-2.5 bg-[#2F2BFF] text-white rounded-full text-center font-medium">Start Free</a>';
    mobileMenu.innerHTML = `${navLinks.map(({ href, label }) => (
      `<a href="${href}" class="block text-[#070B2D]/70">${label}</a>`
    )).join('')}${authLink}`;
    mobileMenu.dataset.staticNavReady = 'true';
  }
}

function ensureStaticAuthLinks(root) {
  root.querySelectorAll('a').forEach((anchor) => {
    const text = anchor.textContent.trim().replace(/\s+/g, ' ').toLowerCase();
    const href = anchor.getAttribute('href') || '';
    const isSignIn = text === 'sign in' || text === 'accedi';
    const isStartFree =
      text === 'start free'
      || text === 'inizia gratis'
      || text === 'start for free'
      || text === 'get started — it\'s free'
      || text === 'get started - it\'s free'
      || text === 'inizia: è gratis';

    if (isSignIn) {
      anchor.setAttribute('href', '#signin');
      anchor.dataset.staticAuth = 'signin';
      return;
    }

    if (isStartFree && (href === '/' || href === '#signup' || href === '')) {
      anchor.setAttribute('href', '#signup');
      anchor.dataset.staticAuth = 'signup';
    }
  });
}

const BLOG_FEATURED_ARTICLES = {
  en: {
    id: 1,
    category: 'Product',
    title: 'How Lockeen works: from messy notes to a study plan',
    excerpt: 'A simple walkthrough of the Lockeen workflow: upload your material, turn it into practice, ask questions, and plan the week without switching tools.',
    body: `<p>Most students do not need another folder of notes. They need a way to turn those notes into action. That is the idea behind Lockeen: one place where your material becomes flashcards, quizzes, AI explanations, and a calendar you can actually follow.</p>
    <h3>1. Upload what you already have</h3>
    <p>You start with your real study material: PDFs, lecture notes, summaries, slides, or documents. Lockeen keeps the workflow close to what students already do, so there is no need to rebuild your system from scratch.</p>
    <h3>2. Turn notes into practice</h3>
    <p>Once your material is inside the workspace, you can generate flashcards and quizzes from it. The point is not to create content for the sake of it. The point is to move quickly from passive reading to active recall, because that is where learning starts to stick.</p>
    <h3>3. Ask the AI Tutor when you get stuck</h3>
    <p>When a concept is unclear, the AI Tutor gives you an explanation in plain language. You can ask follow-up questions, compare ideas, or request an example. It works best as a study companion: not a shortcut, but a way to remove friction when you are blocked.</p>
    <h3>4. Plan the week around your exams</h3>
    <p>The calendar brings the workflow together. Instead of guessing what to study next, you can organize sessions around exam dates, subjects, and the time you realistically have. The goal is simple: fewer scattered tools, fewer abandoned plans, more consistent progress.</p>
    <h3>Why this matters</h3>
    <p>A good study system should feel calm. You should know what to review, what you still do not understand, and what comes next. Lockeen is built around that feeling: structured enough to guide you, flexible enough to match how students actually study.</p>`,
    author: 'Lockeen Team',
    authorInitials: 'LT',
    authorGradient: 'linear-gradient(135deg,#2F2BFF,#7C78FF)',
    date: 'Jun 23, 2026',
    readTime: '5 min read',
    featured: true,
  },
  it: {
    id: 1,
    category: 'Product',
    title: 'Come funziona Lockeen: dagli appunti al piano di studio',
    excerpt: 'Un percorso semplice dentro Lockeen: carichi il materiale, lo trasformi in esercizio, fai domande e pianifichi la settimana senza saltare tra mille strumenti.',
    body: `<p>Molti studenti non hanno bisogno di un'altra cartella piena di appunti. Hanno bisogno di trasformare quegli appunti in azioni concrete. Lockeen nasce da qui: un unico spazio in cui il materiale diventa flashcard, quiz, spiegazioni AI e un calendario che puoi davvero seguire.</p>
    <h3>1. Carichi quello che hai già</h3>
    <p>Parti dal tuo materiale reale: PDF, appunti delle lezioni, riassunti, slide o documenti. Lockeen resta vicino al modo in cui gli studenti studiano già, quindi non devi ricostruire tutto da zero.</p>
    <h3>2. Trasformi gli appunti in pratica</h3>
    <p>Quando il materiale è nello spazio di lavoro, puoi generare flashcard e quiz. L'obiettivo non è creare contenuti tanto per crearli. L'obiettivo è passare velocemente dalla lettura passiva al recupero attivo, perché è lì che lo studio inizia a restare.</p>
    <h3>3. Chiedi al Tutor AI quando ti blocchi</h3>
    <p>Se un concetto non è chiaro, il Tutor AI te lo spiega in modo semplice. Puoi fare domande di follow-up, confrontare idee o chiedere un esempio. Funziona meglio come compagno di studio: non una scorciatoia, ma un modo per togliere attrito quando sei bloccato.</p>
    <h3>4. Pianifichi la settimana intorno agli esami</h3>
    <p>Il calendario tiene insieme il flusso. Invece di indovinare cosa studiare dopo, puoi organizzare sessioni in base alle date degli esami, alle materie e al tempo che hai davvero. L'obiettivo è semplice: meno strumenti sparsi, meno piani abbandonati, più continuità.</p>
    <h3>Perché conta</h3>
    <p>Un buon sistema di studio dovrebbe farti sentire più tranquillo. Dovresti sapere cosa ripassare, cosa non hai ancora capito e qual è il prossimo passo. Lockeen è costruito intorno a questa sensazione: abbastanza strutturato da guidarti, abbastanza flessibile da seguire il modo reale in cui studi.</p>`,
    author: 'Team Lockeen',
    authorInitials: 'LT',
    authorGradient: 'linear-gradient(135deg,#2F2BFF,#7C78FF)',
    date: '23 giu 2026',
    readTime: '5 min',
    featured: true,
  },
};

function applyBlogArticleOverrides(lang) {
  const articles = window.__lockeenBlogArticles;
  if (!Array.isArray(articles)) return;
  const target = articles.find((article) => article?.id === 1);
  const article = BLOG_FEATURED_ARTICLES[lang] || BLOG_FEATURED_ARTICLES.en;
  if (!target || target.title === article.title) return;
  Object.assign(target, article);
  window.__lockeenBlogRenderAll?.();
}

function ensureBlogNewsletter(root, lang) {
  const subscribeButton = Array.from(root.querySelectorAll('button')).find((button) => {
    const text = button.textContent.trim().toLowerCase();
    return text === 'subscribe' || text === 'iscriviti';
  });
  const input = subscribeButton?.parentElement?.querySelector('input[type="email"]');
  if (!subscribeButton || !input) return;
  const helperCopy = lang === 'it'
    ? 'La newsletter non è ancora collegata. Se lasci la mail, per ora la salviamo solo su questo dispositivo.'
    : 'Newsletter signup is not live yet. Leave your email and we will store it on this device for now.';
  if (subscribeButton.dataset.newsletterReady === 'true') {
    const helperNode = subscribeButton.parentElement.querySelector('.newsletter-status');
    if (helperNode && !helperNode.dataset.newsletterTouched) helperNode.textContent = helperCopy;
    return;
  }

  const helper = document.createElement('p');
  helper.className = 'newsletter-status text-xs leading-relaxed';
  helper.style.cssText = 'color:rgba(255,255,255,.55);margin-top:8px;';
  helper.textContent = helperCopy;
  subscribeButton.parentElement.appendChild(helper);

  subscribeButton.dataset.newsletterReady = 'true';
  subscribeButton.addEventListener('click', (event) => {
    event.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      helper.textContent = lang === 'it' ? 'Inserisci prima una email valida.' : 'Enter a valid email first.';
      helper.dataset.newsletterTouched = 'true';
      helper.style.color = '#FCA5A5';
      return;
    }
    const stored = JSON.parse(localStorage.getItem('lockeen-newsletter-interest') || '[]');
    if (!stored.includes(email)) stored.push(email);
    localStorage.setItem('lockeen-newsletter-interest', JSON.stringify(stored));
    helper.textContent = lang === 'it'
      ? 'Salvata localmente per ora. Collegheremo una raccolta email reale prima del lancio.'
      : 'Saved locally for now. We will connect real email collection before launch.';
    helper.dataset.newsletterTouched = 'true';
    helper.style.color = '#86EFAC';
    input.value = '';
  });
}

function replaceAboutTeam(root, pageName) {
  if (pageName !== 'about' || root.querySelector('[data-lockeen-real-team="true"]')) return;

  const heading = Array.from(root.querySelectorAll('h2')).find((node) => {
    const text = node.textContent.trim();
    return text === 'Meet the founders' || text === 'Conosci i founder';
  });
  const section = heading?.closest('section');
  if (!section) return;

  section.innerHTML = `
    <div class="max-w-7xl mx-auto px-6 lg:px-8" data-lockeen-real-team="true">
      <div class="text-center mb-16">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#2F2BFF] mb-4">The people</p>
        <h2 class="text-4xl md:text-5xl font-bold text-[#070B2D] mb-4">Meet the founders</h2>
        <p class="text-lg text-[#070B2D]/60 max-w-xl mx-auto">A small, focused team building Lockeen from real student needs.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <div class="text-center group rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-[#2F2BFF]/5 transition-all">
          <img src="/team-federico-de-luca.jpg" alt="Federico De Luca" class="w-28 h-28 rounded-3xl object-cover mx-auto mb-5 shadow-lg transition-transform group-hover:-translate-y-1" loading="lazy" />
          <h3 class="text-lg font-bold text-[#070B2D] mb-1">Federico De Luca</h3>
          <p class="text-sm text-[#070B2D]/50">Co-founder</p>
          <p class="text-xs text-[#070B2D]/40 mt-3 leading-relaxed">Product, growth, and student experience.</p>
        </div>
        <div class="text-center group rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-[#2F2BFF]/5 transition-all">
          <img src="/team-alberto-piazza.jpg" alt="Alberto Piazza" class="w-28 h-28 rounded-3xl object-cover mx-auto mb-5 shadow-lg transition-transform group-hover:-translate-y-1" loading="lazy" />
          <h3 class="text-lg font-bold text-[#070B2D] mb-1">Alberto Piazza</h3>
          <p class="text-sm text-[#070B2D]/50">Co-founder</p>
          <p class="text-xs text-[#070B2D]/40 mt-3 leading-relaxed">Technology, AI, and product engineering.</p>
        </div>
      </div>
    </div>`;
}

function applyStaticLanguage(root, lang, pageName) {
  ensureStaticNavLinks(root);
  ensureStaticLanguageControls(root, lang);
  updateStaticDocumentTitle(lang, pageName);
  if (pageName === 'blog') {
    applyBlogArticleOverrides(lang);
    ensureBlogNewsletter(root, lang);
  }

  const targetIndex = lang === 'it' ? 1 : 0;
  const lookup = new Map();
  const entries = [
    ...staticTextTranslations.en,
    ...(staticPageContentTranslations[pageName] || []),
  ];

  entries.forEach((entry) => {
    lookup.set(entry[0], entry[targetIndex]);
    lookup.set(entry[1], entry[targetIndex]);
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const text = node.nodeValue;
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (!normalized || !lookup.has(normalized)) return;
    node.nodeValue = text.replace(text.trim(), lookup.get(normalized));
  });

  const pageHeading = {
    en: {
      about: 'Built by students, for students.',
      blog: 'Ideas worth studying.',
      careers: 'Build the future of learning',
      earn: 'Share Lockeen. Earn €2 for every student.',
      press: 'Lockeen in the news',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
    },
    it: {
      about: 'Creato da studenti, per studenti.',
      blog: 'Idee da studiare.',
      careers: 'Costruisci il futuro dello studio',
      earn: 'Condividi Lockeen. Guadagna €2 per ogni studente.',
      press: 'Lockeen sulla stampa',
      privacy: 'Privacy Policy',
      terms: 'Termini di servizio',
    },
  };

  const headingText = pageHeading[lang]?.[pageName];
  if (headingText) {
    const heading = root.querySelector('h1');
    if (heading && heading.textContent.trim()) heading.textContent = headingText;
  }

  ensureStaticAuthLinks(root);
}

export default function StaticPage() {
  const { page } = useParams();
  const location = useLocation();
  const pageName = normalizePage(page || location.pathname.split('/').filter(Boolean)[0]);
  const html = staticPages[pageName] || staticPages.about;

  useEffect(() => {
    const lang = getStaticLang();
    updateStaticDocumentTitle(lang, pageName);
    localStorage.removeItem('lockeen-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    const root = document.getElementById('static-page-root');
    if (!root) return undefined;

    const scripts = Array.from(root.querySelectorAll('script'));
    scripts.forEach((oldScript) => {
      if (oldScript.src) {
        const nextScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => nextScript.setAttribute(attr.name, attr.value));
        oldScript.replaceWith(nextScript);
        return;
      }

      try {
        Function(`
          ${oldScript.textContent}
          if (typeof ARTICLES !== 'undefined') window.__lockeenBlogArticles = ARTICLES;
          if (typeof renderAll !== 'undefined') window.__lockeenBlogRenderAll = renderAll;
          if (typeof openArticle !== 'undefined') window.openArticle = openArticle;
          if (typeof closeModal !== 'undefined') window.closeModal = closeModal;
          if (typeof showForm !== 'undefined') window.showForm = showForm;
        `)();
      } catch (error) {
        console.error('Static page script failed', error);
      }
      oldScript.remove();
    });

    replaceAboutTeam(root, pageName);
    applyStaticLanguage(root, lang, pageName);

    let activeLang = lang;

    const onChange = (event) => {
      if (!event.target.matches('.js-static-lang-select')) return;
      const nextLang = normalizeStaticLang(event.target.value);
      activeLang = nextLang;
      localStorage.setItem('lockeen-lang', nextLang);
      applyStaticLanguage(root, nextLang, pageName);
      window.dispatchEvent(new CustomEvent('lockeen-language', { detail: { lang: nextLang } }));
    };

    const onClick = (event) => {
      const authLink = event.target.closest('[data-static-auth]');
      if (!authLink) return;
      event.preventDefault();
      const mode = authLink.dataset.staticAuth === 'signin' ? 'signin' : 'signup';
      if (window.openAuth) {
        window.openAuth(mode);
      } else {
        window.location.href = `/?auth=${mode}`;
      }
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => applyStaticLanguage(root, activeLang, pageName));
    });

    root.addEventListener('change', onChange);
    root.addEventListener('click', onClick);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      root.removeEventListener('change', onChange);
      root.removeEventListener('click', onClick);
      document.body.style.overflow = '';
      window.openArticle = undefined;
      window.closeModal = undefined;
      window.showForm = undefined;
      window.__lockeenBlogArticles = undefined;
      window.__lockeenBlogRenderAll = undefined;
    };
  }, [location.pathname]);

  return <div id="static-page-root" className="static-page" dangerouslySetInnerHTML={{ __html: html }} />;
}
