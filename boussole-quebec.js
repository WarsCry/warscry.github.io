(() => {
  "use strict";

  const letters = ["A", "B", "C", "D"];
  const translations = {
    fr: {
      ui: {
        back: "← Retour à DanPC",
        badge: "ÉLECTION PROVINCIALE · 5 OCTOBRE 2026",
        eyebrow: "Un outil citoyen indépendant",
        title: "Ta boussole. Ton choix.",
        intro: "Dix questions simples pour mettre des mots sur tes priorités avant de comparer les programmes et les personnes candidates.",
        trustNeutral: "⚖️ Aucun parti favorisé",
        trustPrivate: "🔒 Réponses privées",
        trustTime: "⏱️ Environ 3 minutes",
        start: "Commencer le questionnaire",
        disclaimer: "Ce site n'est pas affilié à Élections Québec. Il ne recommande aucun parti et ne remplace pas la lecture des plateformes officielles.",
        previous: "← Précédent",
        next: "Suivant →",
        finish: "Voir mon portrait",
        resultEyebrow: "Ton portrait citoyen",
        resultTitle: "Voici ce qui compte pour toi",
        resultIntro: "Ce portrait résume tes réponses. Ce n'est ni une étiquette politique ni une recommandation de vote.",
        priorities: "TES PRIORITÉS DÉCLARÉES",
        yourSummary: "TON RÉSUMÉ",
        copy: "Copier mon résumé",
        copied: "Résumé copié ✓",
        nextStep: "PROCHAINE ÉTAPE",
        compareTitle: "Compare les réponses de toutes les personnes candidates",
        compareText: "Cherche leurs engagements sur tes trois priorités principales. Note les promesses précises, leur coût, leur échéancier et ce qui dépend réellement du gouvernement provincial.",
        restart: "Refaire le questionnaire",
        print: "Imprimer / enregistrer en PDF",
        officialEyebrow: "Informations officielles",
        officialTitle: "Être prêt à voter",
        officialIntro: "Les liens ci-dessous mènent directement à Élections Québec, l'autorité neutre et indépendante.",
        registerTitle: "Vérifier mon inscription",
        registerText: "Ton nom et ton adresse doivent être exacts.",
        candidatesTitle: "Voir les candidatures",
        candidatesText: "Trouve toutes les personnes candidates de ta circonscription.",
        whereTitle: "Où et quand voter",
        whereText: "Vote par anticipation : 27 et 28 septembre. Scrutin : 5 octobre.",
        partiesTitle: "Tous les partis autorisés",
        partiesText: "Consulte la liste complète, pas seulement les partis les plus connus.",
        dateRegistration: "Début des inscriptions et modifications",
        dateAdvance: "Vote par anticipation",
        dateElection: "Jour du scrutin",
        footerIndependent: "Projet citoyen indépendant créé par DanPC.",
        footerPrivacy: "Aucune réponse n'est transmise ou conservée sur un serveur. Tout reste dans ton navigateur.",
        verified: "Informations électorales vérifiées le 31 août 2026.",
        method: "Méthode et règles de neutralité",
        counter: (n) => `Question ${n} / 10`,
        answered: (n) => `${n} réponse${n > 1 ? "s" : ""}`,
        selectTwo: "Tu peux choisir jusqu'à deux priorités.",
        summaryLead: "Mes priorités pour l'élection québécoise de 2026 sont",
        researchLead: "Demande à chaque personne candidate :"
      },
      questions: [
        { topic: "Économie", text: "Quelle approche préfères-tu pour les impôts et la taille de l'État?", help: "Pense à l'équilibre entre ton portefeuille, la dette et les services.", options: ["Réduire fortement les impôts et les dépenses publiques", "Réduire un peu les impôts et mieux gérer les dépenses", "Maintenir à peu près le niveau actuel", "Faire davantage contribuer les plus riches pour augmenter les services"] },
        { topic: "Santé", text: "Quel rôle le secteur privé devrait-il jouer en santé?", help: "On parle du financement et de la prestation des soins.", options: ["Beaucoup plus de privé et de concurrence", "Du privé en complément du réseau public", "Un réseau principalement public", "Un réseau presque exclusivement public"] },
        { topic: "Immigration", text: "Que devrait faire le Québec avec les seuils d'immigration?", help: "Considère l'économie, l'intégration, le logement et les services.", options: ["Les réduire fortement", "Les réduire modérément", "Les maintenir environ au niveau actuel", "Accueillir davantage d'immigration"] },
        { topic: "Laïcité", text: "Quelle direction préfères-tu pour la Loi sur la laïcité de l'État (Loi 21)?", help: "Choisis l'orientation la plus proche de ta position.", options: ["La renforcer", "La conserver telle quelle", "L'assouplir", "L'abolir ou la remplacer"] },
        { topic: "Avenir du Québec", text: "Quelle place l'indépendance du Québec devrait-elle occuper?", help: "Cette question peut être déterminante même si d'autres enjeux te préoccupent davantage.", options: ["Oui, et elle devrait être une priorité importante", "Oui, mais pas une priorité maintenant", "Je préfère que le Québec demeure au Canada", "Je suis indécis ou cet enjeu m'importe peu"] },
        { topic: "Environnement", text: "Quel niveau d'effort climatique souhaites-tu?", help: "Pense aux coûts immédiats et aux bénéfices à long terme.", options: ["Éviter de nouvelles contraintes ou de nouveaux coûts aux citoyens", "Agir avec des mesures économiquement raisonnables", "Investir beaucoup plus, même si cela coûte davantage", "Faire de la transition climatique une priorité absolue"] },
        { topic: "Mobilité", text: "Quelle option préfères-tu pour un éventuel 3e lien Québec–Lévis?", help: "Tu peux aussi choisir que l'enjeu n'est pas important pour toi.", options: ["Un lien principalement autoroutier", "Un projet de transport collectif ou mixte", "Aucun nouveau lien", "Ce dossier n'est pas important pour moi"] },
        { topic: "Logement", text: "Comment devrait-on répondre à la crise du logement?", help: "Les réponses combinent construction, réglementation et aide publique.", options: ["Laisser surtout le privé construire et réduire les règles", "Combiner construction privée et incitatifs gouvernementaux", "Construire beaucoup plus de logements sociaux et publics", "Accroître fortement l'intervention de l'État et le contrôle des loyers"] },
        { topic: "Travail", text: "Quel équilibre souhaites-tu entre employeurs, syndicats et protections du travail?", help: "Choisis la direction générale, pas une mesure précise.", options: ["Réduire le pouvoir des syndicats", "Maintenir l'équilibre actuel", "Renforcer certaines protections des travailleuses et travailleurs", "Renforcer considérablement les syndicats et les protections"] },
        { topic: "Priorités", text: "Quels enjeux pèseront le plus dans ton choix?", help: "Tu peux en choisir un ou deux.", multi: true, options: ["Économie, impôts et dépenses publiques", "Santé et services publics", "Identité québécoise, immigration et laïcité", "Environnement, logement et inégalités"] }
      ],
      prompts: [
        "Quelle mesure précise proposez-vous, combien coûtera-t-elle et quand sera-t-elle réalisée?",
        "Quel résultat mesurable utiliserez-vous pour prouver que votre mesure fonctionne?",
        "Quel compromis êtes-vous prêt à faire si les revenus publics sont moins élevés que prévu?"
      ]
    },
    en: {
      ui: {
        back: "← Back to DanPC",
        badge: "PROVINCIAL ELECTION · OCTOBER 5, 2026",
        eyebrow: "An independent civic tool",
        title: "Your compass. Your choice.",
        intro: "Ten simple questions to clarify your priorities before comparing official platforms and local candidates.",
        trustNeutral: "⚖️ No party favoured",
        trustPrivate: "🔒 Private answers",
        trustTime: "⏱️ About 3 minutes",
        start: "Start the questionnaire",
        disclaimer: "This website is not affiliated with Élections Québec. It does not recommend a party and is not a substitute for reading official platforms.",
        previous: "← Previous",
        next: "Next →",
        finish: "See my profile",
        resultEyebrow: "Your civic profile",
        resultTitle: "What matters to you",
        resultIntro: "This profile summarizes your answers. It is neither a political label nor a voting recommendation.",
        priorities: "YOUR STATED PRIORITIES",
        yourSummary: "YOUR SUMMARY",
        copy: "Copy my summary",
        copied: "Summary copied ✓",
        nextStep: "NEXT STEP",
        compareTitle: "Compare every candidate's answers",
        compareText: "Look for commitments on your three main priorities. Note each promise, its cost, its deadline, and whether it actually falls under provincial responsibility.",
        restart: "Restart the questionnaire",
        print: "Print / save as PDF",
        officialEyebrow: "Official information",
        officialTitle: "Be ready to vote",
        officialIntro: "The links below go directly to Élections Québec, the neutral and independent election authority.",
        registerTitle: "Check my registration",
        registerText: "Your name and address must be correct.",
        candidatesTitle: "See the candidates",
        candidatesText: "Find every candidate running in your electoral division.",
        whereTitle: "Where and when to vote",
        whereText: "Advance voting: September 27 and 28. Election day: October 5.",
        partiesTitle: "All authorized parties",
        partiesText: "See the complete list, not only the best-known parties.",
        dateRegistration: "Registration and changes begin",
        dateAdvance: "Advance voting",
        dateElection: "Election day",
        footerIndependent: "Independent civic project created by DanPC.",
        footerPrivacy: "No answers are sent to or stored on a server. Everything stays in your browser.",
        verified: "Election information verified August 31, 2026.",
        method: "Method and neutrality rules",
        counter: (n) => `Question ${n} / 10`,
        answered: (n) => `${n} answer${n === 1 ? "" : "s"}`,
        selectTwo: "You may select up to two priorities.",
        summaryLead: "My priorities for Québec's 2026 election are",
        researchLead: "Ask every candidate:"
      },
      questions: [
        { topic: "Economy", text: "Which approach do you prefer for taxes and the size of government?", help: "Think about the balance between your wallet, public debt, and services.", options: ["Significantly reduce taxes and public spending", "Reduce taxes somewhat and manage spending better", "Keep them around their current levels", "Ask the wealthiest to contribute more to expand services"] },
        { topic: "Health care", text: "What role should the private sector play in health care?", help: "This includes both health-care funding and delivery.", options: ["Much more private care and competition", "Private care as a complement to the public system", "A mainly public system", "An almost exclusively public system"] },
        { topic: "Immigration", text: "What should Québec do with immigration levels?", help: "Consider the economy, integration, housing, and public services.", options: ["Reduce them significantly", "Reduce them moderately", "Keep them around their current level", "Welcome more immigration"] },
        { topic: "Secularism", text: "Which direction do you prefer for the Act respecting the laicity of the State (Bill 21)?", help: "Choose the general direction closest to your view.", options: ["Strengthen it", "Keep it as it is", "Relax it", "Repeal or replace it"] },
        { topic: "Québec's future", text: "What place should Québec independence have?", help: "This can be a decisive question even when other issues matter more to you.", options: ["Yes, and it should be an important priority", "Yes, but not a priority right now", "I prefer Québec to remain in Canada", "I am undecided or this issue is not important to me"] },
        { topic: "Environment", text: "What level of climate action do you want?", help: "Consider immediate costs and long-term benefits.", options: ["Avoid new costs or restrictions for citizens", "Act through economically reasonable measures", "Invest much more, even if it costs more", "Make the climate transition an absolute priority"] },
        { topic: "Transportation", text: "Which option do you prefer for a possible third Québec–Lévis link?", help: "You can also say the issue is not important to you.", options: ["A mainly highway-based link", "A public-transit or mixed project", "No new link", "This issue is not important to me"] },
        { topic: "Housing", text: "How should Québec respond to the housing crisis?", help: "The answers combine construction, regulation, and public support.", options: ["Mostly let the private sector build and reduce rules", "Combine private construction and government incentives", "Build far more social and public housing", "Greatly expand government intervention and rent control"] },
        { topic: "Labour", text: "What balance do you want among employers, unions, and worker protections?", help: "Choose a broad direction rather than a specific measure.", options: ["Reduce union power", "Maintain the current balance", "Strengthen some worker protections", "Greatly strengthen unions and worker protections"] },
        { topic: "Priorities", text: "Which issues will weigh most heavily in your choice?", help: "You may choose one or two.", multi: true, options: ["Economy, taxes, and public spending", "Health care and public services", "Québec identity, immigration, and secularism", "Environment, housing, and inequality"] }
      ],
      prompts: [
        "What exact measure are you proposing, how much will it cost, and when will it be completed?",
        "What measurable result will you use to prove that your proposal is working?",
        "What compromise will you make if government revenue is lower than expected?"
      ]
    }
  };

  const state = { lang: localStorage.getItem("boussoleLang") || "fr", current: 0, answers: Array(10).fill(null) };
  const $ = (selector) => document.querySelector(selector);
  const quizShell = $("#quizShell");
  const results = $("#results");

  function t() { return translations[state.lang]; }

  function applyLanguage(lang) {
    state.lang = lang;
    localStorage.setItem("boussoleLang", lang);
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const value = t().ui[node.dataset.i18n];
      if (typeof value === "string") node.textContent = value;
    });
    $("#langFr").classList.toggle("active", lang === "fr");
    $("#langEn").classList.toggle("active", lang === "en");
    if (!quizShell.classList.contains("hidden")) renderQuestion();
    if (!results.classList.contains("hidden")) renderResults();
  }

  function answeredCount() { return state.answers.filter((answer) => answer !== null && (!Array.isArray(answer) || answer.length)).length; }

  function renderQuestion() {
    const q = t().questions[state.current];
    const currentAnswer = state.answers[state.current];
    $("#questionCounter").textContent = t().ui.counter(state.current + 1);
    $("#answeredCounter").textContent = t().ui.answered(answeredCount());
    $("#progressFill").style.width = `${(state.current + 1) * 10}%`;
    $("#questionNumber").textContent = String(state.current + 1).padStart(2, "0");
    $("#questionTopic").textContent = q.topic;
    $("#questionText").textContent = q.text;
    $("#questionHelp").textContent = q.help;
    $("#choiceNote").textContent = q.multi ? t().ui.selectTwo : "";
    $("#choiceNote").classList.toggle("hidden", !q.multi);
    $("#previousQuestion").disabled = state.current === 0;
    $("#nextQuestion").textContent = state.current === 9 ? t().ui.finish : t().ui.next;
    $("#nextQuestion").disabled = currentAnswer === null || (Array.isArray(currentAnswer) && currentAnswer.length === 0);

    $("#answers").innerHTML = "";
    q.options.forEach((option, index) => {
      const selected = q.multi ? Array.isArray(currentAnswer) && currentAnswer.includes(index) : currentAnswer === index;
      const button = document.createElement("button");
      button.className = `answer-option${selected ? " selected" : ""}`;
      button.type = "button";
      button.setAttribute("role", q.multi ? "checkbox" : "radio");
      button.setAttribute("aria-checked", String(selected));
      button.innerHTML = `<span class="answer-letter">${letters[index]}</span><span>${option}</span>`;
      button.addEventListener("click", () => chooseAnswer(index));
      $("#answers").appendChild(button);
    });
  }

  function chooseAnswer(index) {
    const q = t().questions[state.current];
    if (q.multi) {
      const selected = Array.isArray(state.answers[state.current]) ? [...state.answers[state.current]] : [];
      const found = selected.indexOf(index);
      if (found >= 0) selected.splice(found, 1);
      else if (selected.length < 2) selected.push(index);
      state.answers[state.current] = selected;
    } else {
      state.answers[state.current] = index;
    }
    renderQuestion();
  }

  function showQuiz() {
    quizShell.classList.remove("hidden");
    results.classList.add("hidden");
    renderQuestion();
    quizShell.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function nextQuestion() {
    if (state.current < 9) {
      state.current += 1;
      renderQuestion();
      $("#questionCard").scrollIntoView({ behavior: "smooth", block: "center" });
    } else renderResults();
  }

  function profileContext(questionIndex, answerIndex) {
    const fr = [
      ["moins d'État", "gestion et allègement modéré", "continuité", "services renforcés"],
      ["davantage de privé", "système mixte", "priorité au public", "public presque exclusif"],
      ["forte réduction", "réduction modérée", "stabilité", "plus grande ouverture"],
      ["renforcement", "statu quo", "assouplissement", "remplacement"],
      ["priorité indépendantiste", "indépendance à plus long terme", "fédéralisme", "question ouverte"],
      ["prudence sur les coûts", "action pragmatique", "investissement accru", "priorité climatique"],
      ["lien autoroutier", "transport collectif ou mixte", "aucun nouveau lien", "faible priorité"],
      ["marché et déréglementation", "partenariat public-privé", "logement public", "intervention forte"],
      ["pouvoir syndical réduit", "équilibre actuel", "protections accrues", "renforcement important"]
    ];
    const en = [
      ["smaller government", "moderate tax relief and management", "continuity", "expanded services"],
      ["more private care", "mixed system", "public-system priority", "almost entirely public"],
      ["large reduction", "moderate reduction", "stable levels", "greater openness"],
      ["strengthening", "status quo", "relaxation", "replacement"],
      ["independence as a priority", "longer-term independence", "federalism", "an open question"],
      ["cost restraint", "pragmatic action", "greater investment", "climate priority"],
      ["highway link", "public transit or mixed link", "no new link", "low priority"],
      ["market and deregulation", "public-private partnership", "public housing", "strong intervention"],
      ["reduced union power", "current balance", "stronger protections", "major strengthening"]
    ];
    return (state.lang === "fr" ? fr : en)[questionIndex][answerIndex];
  }

  function renderResults() {
    quizShell.classList.add("hidden");
    results.classList.remove("hidden");
    const questions = t().questions;
    $("#profileGrid").innerHTML = "";
    for (let i = 0; i < 9; i += 1) {
      const answer = state.answers[i];
      const card = document.createElement("article");
      card.className = "profile-card";
      card.innerHTML = `<h3>${questions[i].topic}</h3><p class="profile-answer">${letters[answer]} · ${questions[i].options[answer]}</p><p class="profile-context">${profileContext(i, answer)}</p>`;
      $("#profileGrid").appendChild(card);
    }

    const priorities = state.answers[9] || [];
    $("#priorityList").innerHTML = priorities.map((index) => `<span class="priority-pill">${questions[9].options[index]}</span>`).join("");
    const priorityText = priorities.map((index) => questions[9].options[index].toLowerCase()).join(state.lang === "fr" ? " et " : " and ");
    const selectedStances = [0, 1, 2, 3, 4, 5, 7].map((index) => questions[index].options[state.answers[index]].toLowerCase());
    const summary = `${t().ui.summaryLead} ${priorityText}. ${state.lang === "fr" ? "Mes positions incluent" : "My positions include"}: ${selectedStances.join("; ")}.`;
    $("#summaryText").textContent = summary;

    $("#researchPrompts").innerHTML = t().prompts.map((prompt) => `<div class="research-prompt">${prompt}</div>`).join("");
    $("#copySummary").textContent = t().ui.copy;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText($("#summaryText").textContent);
      $("#copySummary").textContent = t().ui.copied;
      setTimeout(() => { $("#copySummary").textContent = t().ui.copy; }, 1800);
    } catch {
      $("#copySummary").textContent = t().ui.copy;
    }
  }

  $("#startQuiz").addEventListener("click", showQuiz);
  $("#previousQuestion").addEventListener("click", () => { if (state.current > 0) { state.current -= 1; renderQuestion(); } });
  $("#nextQuestion").addEventListener("click", nextQuestion);
  $("#restartQuiz").addEventListener("click", () => { state.current = 0; state.answers = Array(10).fill(null); showQuiz(); });
  $("#copySummary").addEventListener("click", copySummary);
  $("#printResult").addEventListener("click", () => window.print());
  $("#langFr").addEventListener("click", () => applyLanguage("fr"));
  $("#langEn").addEventListener("click", () => applyLanguage("en"));

  applyLanguage(state.lang);
})();
