/**
 * Structured representation of the Universal Service 2006 / Lycamobile retailer
 * contract used when building the PDF. Text mirrors the official 7-page
 * Italian template. Placeholders like $COMPANY NAME$ are substituted at build
 * time with the actual retailer data.
 */

export interface ContractFields {
  companyName: string
  vatNumber: string
  address: string // composed "street, house_number, post_code city"
  mobileNumber: string
  landlineNumber: string
  contactPerson: string // "firstName lastName"
  surname: string
  firstName: string
  shopName: string
  shopAddress: string
  street: string
  houseNumber: string
  city: string
  postCode: string
  email: string
  date: string // dd/mm/yyyy
}

// Paragraph blocks per page. Page layout (tables/signatures) is handled in
// build-pdf.ts; these strings provide the actual legal copy.

export function page1Intro(f: ContractFields) {
  return [
    {
      bold: true,
      text: "CONTRATTO DI DISTRIBUZIONE E VENDITA AL MINUTO PER PUNTO VENDITA",
      align: "center" as const,
    },
    { text: "" },
    { text: "FRA: una società con sede legale in" },
    {
      text:
        '1. Universal Service 2006 S.R.L, una società con sede legale in Via Genzano 195, cap 00175, Roma, iscritta con il numero Repertorio Economico Amministrativo (REA) RM 1135154 Codice Fiscale 09037721009, qui rappresentata dal Sig. Deivendran Subramaniam debitamente incaricato in qualità di "Fornitore"',
    },
    { text: "e", align: "center" as const },
    {
      text: `2. Rivenditore, una società o impresa [[B]]${f.companyName}[[B]] costituita e operante secondo le Leggi della Repubblica Italiana, numero Registro Imprese [[B]]${f.vatNumber}[[B]] con sede in [[B]]${f.address}[[B]], numero di telefono [[B]]${f.mobileNumber}[[B]], persona di contatto [[B]]${f.contactPerson}[[B]].`,
    },
  ]
}

export const page1Body = [
  { bold: true, text: "1. Disposizioni" },
  {
    text:
      "1.1 Il Rivenditore s'impegna a rivendere, in via non esclusiva, vari prodotti a marchio registrato forniti dal Fornitore (schede SIM e carte di ricarica) secondo quanto concordato di volta in volta.",
  },
  {
    text:
      '1.2 Il Fornitore è il distributore debitamente autorizzato dei prodotti a marchio Lycamobile, GT Mobile e Toggle Mobile (complessivamente definiti "Prodotti" come da bolla di accompagnamento merci o fattura).',
  },
  { bold: true, text: "2. Disciplina degli ordini d'acquisto" },
  {
    text:
      "2.1 Il Rivenditore potrà inoltrare ordini d'acquisto per schede SIM e/o carte di ricarica secondo i termini e le condizioni qui esposte e la bolla di accompagnamento rilasciata al Rivenditore.",
  },
  {
    text:
      "2.2 Nessun ordine d'acquisto sarà legalmente vincolante fino a quando il Fornitore lo accetterà debitamente per iscritto.",
  },
  { bold: true, text: "3. Termini e condizioni di pagamento" },
  {
    text:
      "3.1 Il Rivenditore sarà debitamente informato di volta in volta del prezzo corrente delle schede SIM e carte di ricarica.",
  },
  {
    text:
      "3.2 Il Fornitore si riserva il diritto di modificare i suddetti prezzi con previa notifica per iscritto di 30 giorni.",
  },
  {
    text:
      "3.3 Il Rivenditore avrà diritto a percepire una commissione per ciascuna attivazione di ricarica regolarmente valida per ogni scheda SIM venduta e attivata. Le attivazioni saranno determinate ad esclusiva discrezione del Fornitore.",
  },
  {
    text:
      "3.4 Il Fornitore potrà emettere un estratto mensile delle commissioni dovute al Rivenditore entro 2 settimane dalla fine del mese civile oppure secondo la scadenza periodica accordata per iscritto.",
  },
  {
    text:
      "3.5 Il Fornitore si riserva il diritto di pagare le commissioni al Rivenditore sotto forma di schede SIM oppure carte di ricarica che il Rivenditore potrà rivendere ai suoi clienti essendo utenti finali dei servizi forniti da Lycamobile, ai termini e condizioni vigenti delle schede SIM e schede di ricarica, comprese eventuali promozioni. Le commissioni saranno percepibili su registrazioni regolarmente valide di schede SIM e su loro relativa identificazione.",
  },
  {
    text:
      "3.6 Per quanto riguarda la Commissione dovuta al Rivenditore, quest'ultimo dovrà comunicare al Fornitore tutti i dati ragionevolmente e periodicamente da esso richiesti, compresi ma non limitatamente ad essi, i dati di registrazione del cliente.",
  },
  { bold: true, text: "4. Rischio e titolarità" },
  {
    text:
      "4.1 Un eventuale rischio nel Prodotto viene trasmesso alla consegna. La titolarità delle schede SIM rimarrà del Fornitore in qualsiasi momento. La titolarità della carta di ricarica sarà ceduta alla consegna o a completamento di tutti gli obblighi di pagamento della stessa, se quest'ultimo si verifica successivamente alla consegna. Il Fornitore rimarrà in qualsiasi momento l'unico titolare dei diritti di proprietà intellettuale relativi a tutti i Prodotti e servizi.",
  },
  { bold: true, text: "4. Registrazione della sottoscrizione e Protezione Dati" },
  {
    text:
      "4.1 Laddove applicabile, il Rivenditore si impegna a soddisfare tutti i requisiti relativi al processo di",
  },
]

export const page2Body = [
  {
    text:
      "registrazione e a raccogliere o verificare ogni dato o informazione identificativa, ad esempio i dati relativi all'accesso per cellulare.",
  },
  {
    text:
      "4.2 Il Rivenditore si impegna a soddisfare tutti gli obblighi e requisiti applicabili relativi al trattamento e protezione dei dati.",
  },
  {
    text:
      '4.3 Laddove applicabile, il Rivenditore sarà tenuto a richiedere al Fornitore un Log-in per accedere al Sistema di back office del Fornitore per il Rivenditore ("R BOS") e la pagina web Punto Vendita del Fornitore ("POS"), dove il Rivenditore potrà inserire le informazioni fornitegli dall\'utente finale affinché il Fornitore possa convalidarle.',
  },
  {
    text:
      "4.4 Laddove applicabile, il Rivenditore riconosce e concorda che la sua regolare registrazione di un utente finale è una disposizione determinante del presente Contratto e che non gli spetterà alcuna commissione fino a che una scheda SIM è stata debitamente registrata e regolarmente attivata. Le attivazioni saranno determinate ad esclusiva discrezione di Lycamobile.",
  },
  { bold: true, text: "5. Obblighi del Rivenditore" },
  {
    text:
      "5.1 Il Rivenditore non potrà utilizzare alcun materiale informativo o documentazione né rilasciare alcuna dichiarazione riguardante i Prodotti ad eccezione di quelli approvati e offerti dal Fornitore.",
  },
  {
    text:
      "5.2 In caso di perdita o furto di un Prodotto, il Rivenditore sarà tenuto ad avvisare immediatamente il Fornitore, così da bloccarne ogni eventuale uso improprio.",
  },
  {
    text: "5.3 Il Rivenditore dovrà attenersi a tutte le disposizioni di legge applicabili.",
  },
  {
    text:
      "5.4 Il Rivenditore è tenuto a mantenere strettamente riservate le disposizioni del presente Contratto.",
  },
  {
    text:
      "5.5 Il Rivenditore non potrà in nessun modo modificare alcun marchio, logo o diritto di proprietà intellettuale del Fornitore.",
  },
  { bold: true, text: "6. Durata e cessazione del Contratto" },
  {
    text:
      "6.1 La durata del presente Contratto è di 1 anno dalla data di inizio del rapporto commerciale e dopodiché potrà essere rinnovato annualmente su mutuo accordo delle parti.",
  },
  {
    text:
      "6.2 Il Fornitore ha il diritto di cessare il presente Contratto per propria convenienza in qualsiasi momento previo avviso scritto di 1 mese senza alcun ulteriore obbligo da parte del Rivenditore.",
  },
  { bold: true, text: "7. Limitazione di responsabilità" },
  {
    text:
      "7.1 Per qualsiasi problema tecnico, Lycamobile (i) predisporrà un servizio di assistenza clienti e (ii) sarà responsabile nei confronti degli Utenti Finali in conformità a quanto stabilito dai termini e delle condizioni generali di Lycamobile di volta in volta in vigore con gli Utenti Finali.",
  },
  {
    text:
      "7.2 Lycamobile non sarà in nessun caso responsabile per perdite, mancato guadagno, svalutazione o riduzione di avviamento commerciale e/o perdite simili, ovvero per perdite puramente commerciali né per qualsiasi danno, costo, spesa, onere speciale, diretto o consequenziale sostenuto dal Distributore, dall'Utente Finale o dall'Acquirente.",
  },
  {
    text:
      "7.3 La responsabilità di ciascuna delle Parti per i danni che dovessero comunque verificarsi ai sensi del presente Contratto, salvo ove diversamente previsto nel presente Contratto, è limitata all'importo complessivo massimo di €5.000 (Euro cinquemila) ovvero al valore dei Prodotti acquistati dal Distributore ai sensi del presente Contratto, se inferiore. I valori contrattuali saranno determinati dagli ordini di acquisto presentati e accettati da Lycamobile ai sensi del presente Contratto.",
  },
  {
    text:
      "7.4 Nulla nel presente Contratto limiterà o escluderà, né potrà essere inteso o interpretato in maniera da escludere o limitare, l'obbligo delle Parti per responsabilità determinate da norme inderogabili di legge, responsabilità in caso di morte, lesioni personali o danni alla salute, responsabilità per negligenza ovvero per truffa, violazione di norme di ordine pubblico o altri tipi di responsabilità qualora tali limitazioni o esclusioni non siano valide ai sensi delle disposizioni inderogabili di legge.",
  },
  { bold: true, text: "8. Legge applicabile e Foro competente" },
  {
    text:
      "Il presente Contratto sarà disciplinato e interpretato in lingua italiana, salvo diversa disposizione concordata da entrambe le parti, e in conformità della Leggi della Repubblica Italiana e tutte le controversie saranno di esclusiva competenza del Foro di Roma.",
  },
  { bold: true, text: "9. Notifiche" },
  {
    text:
      "Ogni notifica formale dovrà essere inoltrata per iscritto in almeno 2 forme di comunicazione e di cui una all'indirizzo riportato sul retro della pagina.",
  },
  { bold: true, text: "10. Cessione" },
  {
    text:
      "Il Fornitore si riserva il diritto di cedere il presente Contratto a qualsiasi società affiliata ed in qualsiasi momento.",
  },
]

export const page3Body = [
  { bold: true, text: "11. Interezza del Contratto" },
  {
    text:
      "Il listino prezzi e il prospetto delle condizioni di vendita costituiscono parte integrante del presente Contratto. In caso di conflitto fra le condizioni del prospetto di vendita e del presente Contratto o di qualsiasi ordine d'acquisto per iscritto, la precedenza disciplinante sarà assegnata innanzitutto alle condizioni previste dall'ordine d'acquisto, poi a quelle del prospetto delle condizioni di vendita e infine alle principali disposizioni del presente Contratto.",
  },
  { bold: true, text: "12. Clausola di scindibilità" },
  {
    text:
      "Qualora una qualsiasi disposizione o condizione del presente Contratto dovesse essere ritenuta illegale, nulla o non applicabile, del tutto o in parte, per qualsiasi motivo, tale disposizione verrà considerata ad effetto limitato sulla legalità, applicabilità e validità ai sensi di legge. In caso di mancato effetto, tale disposizione o condizione sarà considerata scindibile dai presenti termini e condizioni e non altererà in alcun modo la validità ed applicabilità delle disposizioni rimanenti del presente Contratto.",
  },
  {
    bold: true,
    align: "center" as const,
    text: "PROSPETTO DELLE CONDIZIONI DI VENDITA E LISTINO PREZZI",
  },
  { bold: true, text: "1. Condizioni generali" },
  {
    text:
      "1.1 Le schede SIM e/o le carte di ricarica saranno ritenute regolarmente attive a seguito dell'attivazione da parte del Fornitore conseguente alla registrazione, laddove applicabile. Ai fini delle commissioni percepibili sull'attivazione delle schede SIM, l'attivazione s'intende avvenuta solo quando è stata effettuata una ricarica su una scheda SIM di Lycamobile, che non includerà comunque ogni eventuale ammontare di credito telefonico promozionale.",
  },
  { text: "1.2 Salvo diversamente indicato, tutti i prezzi si intendono IVA esclusa." },
  {
    text:
      "1.3 Le commissioni sono soggette a modifiche previo avviso scritto di 14 giorni da parte del Fornitore e con effetto a partire dal susseguente periodo di fatturazione.",
  },
  { bold: true, text: "2. Prezzi - Carte SIM" },
]

export const page3Outro = [
  { bold: true, text: "Firma e accettazione" },
  {
    text:
      "Il presente Prospetto delle condizioni di vendita e Listino Prezzi costituiscono parte integrante del presente Contratto stipulato fra il Fornitore e il Rivenditore.",
  },
]

export const page5Body = (f: ContractFields) => [
  {
    text: `[[B]]Allegato al PRESENTE CONTRATTO DI DISTRIBUZIONE è stipulato in data [[B]]${f.date}`,
  },
  { text: "TRA:" },
  {
    text:
      '1. Universal Service Collection 2006 S.r.l, società debitamente costituita ai sensi del diritto italiano, numero di iscrizione al Registro delle Imprese IT 09037721009 e con sede legale in Via Genzano 195, 00179, Roma, rappresentata ai fini del presente contratto da Deivendran Subramanium, munito dei necessari poteri nella sua qualità di Amministratore ("Fornitore")',
  },
  { text: "E", align: "center" as const },
  {
    text: `2. Rivenditore, una società o impresa [[B]]${f.companyName}[[B]] costituita e operante secondo le Leggi della Repubblica Italiana numero Registro Imprese [[B]]${f.vatNumber}[[B]] con sede in [[B]]${f.address}[[B]].`,
  },
  { text: "Le parti hanno un accordo tra le parti per regolare gli affari tra le parti." },
  { text: "Questa modifica viene apportata ai sensi di tale Accordo e tutti i termini definiti seguono l'Accordo." },
  { bold: true, text: "IL PRESENTE CONTRATTO È ORA MODIFICATO COME SEGUE:" },
  { bold: true, text: "Regole Commissioni" },
  { text: "Per maggiore chiarezza, non saranno dovute ulteriori commissioni su qualsiasi ricarica o attivazione oltre a quelle sopra indicate." },
  { bold: true, text: "Prevenzione delle frodi" },
  {
    text:
      "Le seguenti condizioni hanno lo scopo di prevenire le frodi e reati in materia di commissioni. Queste condizioni sono implementate per proteggere l'attività di Lycamobile, Fornitore del distributore e dei loro rispettivi dipendenti.",
  },
  { bold: true, text: "USO IMPROPRIO" },
  {
    text:
      "1. Il Distributore emetterà linee guida rigorose, disposizioni back to back coerenti con il presente Accordo ed è responsabile per i propri rivenditori di garantire il rispetto dell'obbligo legale di registrazione e attivazione di una SIM.",
  },
  {
    text:
      "2. È possibile registrare un massimo di 4 SIM per un utente finale come limite massimo. La quantità di SIM registrate deve essere documentata sul modulo di registrazione firmato dall'Utente Finale.",
  },
  {
    text:
      "3. Nessuna SIM registrata o dati personali o documentazione possono essere rilasciati o ceduti ad altre persone. Il Distributore deve garantire la massima riservatezza e misure di sicurezza per il controllo efficace dei dati personali in modo che i rivenditori o qualsiasi altra persona non possano abusare di tali dati.",
  },
  {
    text:
      "4. Il Distributore comprende che le violazioni delle norme sulla protezione dei dati sono un reato penale e punibili con sanzioni severe, incluso il GDPR, che applica una multa fino a 20 milioni di euro o 4% del fatturato globale annuo. Inoltre il Garante può applicare una sanzione per ogni SIM illegalmente registrata compresa tra 10.000 e 120.000 Euro per SIM non registrata correttamente. Queste sanzioni saranno imputabili al Distributore e ai suoi Rivenditori che hanno registrato la SIM in caso di violazioni derivanti da qualsiasi uso improprio dei dati personali derivanti da o in connessione con la loro catena di fornitura di distribuzione che è gestita in modo indipendente dal Distributore.",
  },
  {
    text:
      "5. In aggiunta a quanto sopra, Fornitore può, a sua assoluta discrezione, applicare una commissione amministrativa fino a Euro 30 per l'applicazione di misure correttive e la gestione di eventuali problemi derivanti da eventuali indagini di polizia o autorità di regolamentazione relative a casi di uso improprio registrati sotto il controllo e responsabilità del distributore. Oltre a questa commissione, il Distributore e il suo Rivenditore dovranno indennizzare e tenere indenne Fornitore & Lycamobile e saranno completamente responsabili per eventuali costi legali ragionevoli più eventuali multe e sanzioni imposte e qualsiasi responsabilità di risarcimento a seguito delle azioni o inazioni del Distributore o altrimenti fallimento per adempiere ai propri obblighi ai sensi del presente Contratto o altrimenti applicabile per legge. Tali importi saranno separati e in aggiunta a qualsiasi limitazione di responsabilità ai sensi del presente Contratto.",
  },
]

export const page6Body = [
  {
    text:
      "6. Il Fornitore non sarà tenuto a pagare alcuna commissione al Distributore ai sensi delle vigenti Regole antifrode applicabili al calcolo della commissione richiesta dal Distributore.",
  },
  {
    text:
      "7. Nel caso in cui le SIM registrate dal Distributore non vengano utilizzate per effettuare un utilizzo effettivo a pagamento entro l'intero mese solare successivo al mese in cui sono state registrate, verrà effettuato un calcolo di ritenzione e le SIM non utilizzate saranno considerate come SIM usate in modo improprio. Di conseguenza, il Fornitore dovrà calcolare la percentuale di abbandono delle SIM non utilizzate (abbandono per il mese corrispondente) e nel caso in cui l'abbandono sia inferiore al target del 65% (SIM trattenute) sarà applicata una detrazione incrementale dell'FCA e del 1° incentivo di ricarica per le corrispondenti incentivi FCA e 1° ricarica maturati integralmente nello stesso mese fino all'importo percentuale dello sfasamento del tasso di abbandono target del 65% e del tasso di abbandono effettivo.",
  },
  {
    text:
      "8. Il Distributore emetterà linee guida e disposizioni rigorose e coerenti con queste disposizioni ed è responsabile della gestione efficace dei propri rivenditori, impiegati e PoS al fine di garantire che le SIM non siano registrate e trasferite immediatamente o subito dopo senza FCA (attivazione della prima chiamata), senza evento di ricarica e senza alcun ragionevole utilizzo continuativo a pagamento dei servizi Lycamobile sulla SIM corrispondente. In tali casi di Uso improprio, il Fornitore avrà il diritto di detrarre la commissione o applicare un addebito di Euro 30 per qualsiasi SIM utilizzata in modo improprio.",
  },
  {
    text:
      "9. Il Distributore e il suo rivenditore saranno responsabili per qualsiasi risarcimento dovuto in caso di eventuali violazioni della protezione dei dati, reclami da parte degli interessati, multe o sanzioni applicate da qualsiasi autorità, Garante e qualsiasi danni negativi ai supporti causati.",
  },
  {
    text:
      "10. In casi specifici Lycamobile può ragionevolmente richiedere l'interruzione del rapporto con il Distributore e quindi non permettere accesso a PoS o ad altri sistemi Lyca e richiedere la restituzione delle scorte di Prodotti Lycamobile e qualsiasi altro Materiale. Il Distributore sarà inoltre responsabile per qualsiasi indagine e risultato di tali indagini derivanti da o in connessione con il loro mancato rispetto di questi obblighi.",
  },
  {
    text:
      "11. Il Distributore non lavorerà con i rivenditori che intenzionalmente o persistentemente abusano delle SIM Lycamobile e non rispettano nessuno degli obblighi di cui sopra o altri obblighi applicati nell'Accordo principale o altrimenti applicabili per legge.",
  },
  {
    text:
      "12. Il Distributore indennizzerà Lycamobile per qualsiasi media negativo e media negativo pubblicizzato in qualsiasi forma che degradi o neghi in altro modo la registrazione della SIM e / o i controlli di identità richiesti da Lycamobile che sorgono in connessione con le SIM sotto il controllo del Distributore. Resta inteso dalle Parti che Lycamobile è un operatore virtuale con zero punti vendita controllati e si affida esclusivamente a Distributori con lotti di SIM specificati con controlli di stock su ciascuna SIM corrispondente a ciascun Distributore per tracciare la responsabilità dei controlli SIM e applicare ai rispettivi Distributore.",
  },
  {
    text:
      "13. Se più di 1 operazione di ricarica è stata effettuata entro 48 ore sulla stessa SIM, allora tutte le transazioni saranno considerate, a livello commissionale, come un'unica ricarica. Per esempio se un utente finale ricarica fino a 5 € due o più volte entro 48 ore Fornitore calcolerà questo come una unica ricarica di 5€.",
  },
  {
    text:
      "14. Se la SIM è stata ricaricata una seconda volta con meno del 30% del precedente importo di ricarica, allora entrambe le ricariche saranno considerate come una unica ricarica al fine di calcolo della commissione.",
  },
  {
    text:
      "15. Nessun incentivo verrà riconosciuto se la SIM non utilizza alcun servizio a pagamento (traffico voce, SMS, dati) nei 60 giorni successivi alla registrazione. Fornitore avrà il diritto di trattenere dunque l'incentivo non riconosciuto sulla prima fattura utile emessa dal Distributore (attivazione, ricarica, bonus etc).",
  },
  {
    text:
      "16. Al fine di calcolo della commissione, é fissato a 4 il numero massimo di schede SIM che possono essere state utilizzate nello stesso IMEI.",
  },
  {
    text:
      "17. Se una SIM dispone di una transazione che si traduce in un chargeback (rimborso) in relazione alla vendita della scheda SIM, allora nessuna commissione potrà essere versata, soggetta alla verifica della natura del rimborso.",
  },
  {
    text:
      "18. Se Lycamobile rileva una qualsiasi attività fraudolenta in relazione all'attivazione delle SIM, allora Lycamobile attraverso il Fornitore avrà il diritto di indagare tutte le operazioni del distributore e i suoi rivenditori e recuperare le commissioni precedenti pagate o da pagare nei precedenti 12 mesi dalla data di attività fraudolente.",
  },
]

export const page7Body = [
  {
    text:
      "19. Se su una SIM viene identificato un utilizzo considerato inappropriato o fraudolento (ad esempio uso in una SIM box, Wangiri ecc) o se i dati di registrazione dei clienti risultano essere inappropriati o fraudolenti, allora TUTTE le commissioni pagate negli ultimi 12 mesi su quella SIM verranno di conseguenza recuperate. In caso di eventuali indagini su attività criminali, correlate all'uso o abuso di carte SIM, Lycamobile collaborerà con le autorità giudiziaria, così come previsto dalla legge vigente.",
  },
  {
    text:
      "20. Fornitore è autorizzata a recuperare i costi dal Distributore, per i casi di uso improprio di MNP in cui il Distributore ha consentito il port in senza un documento di identità e una registrazione validi e anche per i casi in cui il Distributore ha consentito il port out nei casi in cui gli utenti finali ha effettuato la registrazione e immediatamente eseguito il port out o in casi in cui il port out avviene poco dopo l'attivazione della SIM. Questi sono considerati tentativi fraudolenti effettuati da qualsiasi persona nella catena di fornitura, dal Distributore, dal Rivenditore o anche dall'utente finale.",
  },
  {
    text:
      "21. Il Distributore rimborserà integralmente tutti i costi associati alla gestione dei casi di abuso di dati personali o documenti di identità ID nei casi registrazione e portabilità, in entrata e in uscita, effettuato dal PoS del Distributore. Resta inteso dalle parti che Lycamobile può essere soggetta al risarcimento di qualsiasi persona che abbia utilizzato in modo improprio i propri dati o ID e i costi associati alla rettifica di tali casi da parte dei rivenditori del Distributore. Il Distributore è tenuto a pagare tali costi a Fornitore e tenuto a intraprendere tali azioni nei confronti di tutti i rivenditori nel suo PoS che agiscono in modo tale da danneggiare l'immagine di Lycamobile.",
  },
  {
    text:
      "22. In caso di ogni utilizzo del servizio di portabilità non autorizzato, e in particolare nei casi in cui la portabilità del numero ad altro Operatore è richiesta in contemporanea o nell'immediato prossimo alla registrazione della SIM, il distributore, il retailer, il responsabile o l'utilizzatore del PoS è tenuto a pagare a Supplier una penalità di €30 per ogni SIM.",
  },
  { text: "Esempi di utilizzo del servizio di portabilità non autorizzato sono:" },
  {
    text:
      "•  Illegittime Registrazioni (proprietario o utilizzatore della SIM differente dall'intestatario)",
  },
  {
    text:
      "•  Assenza di addebiti nella SIM nel periodo compreso tra la registrazione della SIM e la data in cui la commissione per l'attivazione della stessa diviene esigibile",
  },
  { text: "•  Assenza di traffico addebitato per i 7 giorni successivi all'attivazione." },
  { text: "•  Utilizzo di multiple SIM (4+)" },
  {
    text:
      "In caso di portabilità del numero ad altro Operatore L si riserva il diritto e l'esclusiva discrezione di applicare i criteri sopra menzionati e qualunque altro criterio necessario a determinare se vi è stato un abuso nell'utilizzo della SIM finalizzata alla portabilità ad altro Operatore (sia se questo consente al rivenditore di ottenere un maggiore incentivo dall'operatore Recipient o meno).",
  },
  { text: "Non vengono apportate altre modifiche in base a questo emendamento." },
  {
    text:
      "Tutte le altre disposizioni dell'Accordo principale tra le Parti prevalgono, comprese eventuali modifiche precedenti concordate e firmate tra le parti.",
  },
]
