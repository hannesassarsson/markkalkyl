# Markkalkyl – roadmap

Research oktober 2026. Målgrupp: mark- och schaktföretag med 5–30 anställda, till exempel J&L Schakt och Entreprenad (Gärsnäs, cirka 19 anställda, 59 MSEK, både privatkunder, kommuner och byggföretag).

Prioriteringen bygger på tre frågor: hur många kontorstimmar funktionen sparar, om den hjälper företaget att vinna fler jobb, och om den behövs för att få jobba åt Trafikverket och de stora byggbolagen.

## Det konkurrenterna redan har

| System | Fokus | Pris |
|---|---|---|
| SmartDok | Anläggning: tid, maskintimmar, bränsle, dagbok, egenkontroller, KMA, Fortnox | från 449 kr/mån |
| Bygglet | Hantverkare: offert, ÄTA, ROT, fakturering, Fortnox | 1 049–2 289 kr/mån |
| Infobric (Ease) | Personalliggare, maskinuppföljning, arbetsorder | offert |
| Struqtur, Fieldly, Next | Projekt, tid, egenkontroller | varierar |

Inget av dem gör det Markkalkyl gör: räknar fram m³, ton, lass, tipp och ROT ur yta och djup. Där ligger vår styrka. Det som saknas är det som händer efter att offerten är skickad.

SmartDoks kunder beskriver samma problem: papper och Excel som inte skalar, timmar som aldrig blir fakturerade och ingen koll på kostnad per maskin och projekt. De funktioner som värderas högst är automatiskt fakturaunderlag, projektuppföljning, material- och bränslerapportering och foton med GPS.

## Fas 1 – vinn fler jobb (bygger vidare på offerten)

1. **Skicka offerten som länk och låt kunden godkänna med BankID.**
   - Kunden öppnar en snygg webbsida, godkänner eller ställer en fråga.
   - Vi ser när offerten öppnas. En påminnelse går ut automatiskt efter 3–5 dagar.
   - Varför: 70 % av kunderna väljer den första kompletta offerten, och systematisk uppföljning ökar acceptansen med upp till 20 %.
   - BankID-signering via Zigned kostar cirka 19 kr plus 5 kr per part.
2. **Mät på karta.** Rita ytan eller sträckan på en flygbild och få m² och omkrets direkt in i schakt- och fyllnadsraderna. Det sparar platsbesök eller måttband för de flesta privatjobb.
3. **Fler paket och egna mallar.** Till exempel:
   - enskilt avlopp
   - VA-anslutning
   - platta på mark
   - plattsättning och uteplats
   - stödmur
   - poolschakt
   - rivning

   Plus "Spara som mall" från en befintlig offert.
4. **Riktiga tippavgifter.**
   - Prislistan ska ha mottagare med verkliga priser, till exempel Sysav (Spillepeng, Hedeskoga). Sysav tar över avfallshanteringen i Simrishamn och Tomelilla från 2026.
   - Varning när massor går till deponi: avfallsskatten är 750 kr/ton 2026. Rena massor som återanvänds slipper skatten.
   - Standardpriserna i appen (120–260 kr/t) kan vara för låga för deponi i Skåne.
5. **ÄTA direkt på projektet.**
   - Ändringsorder med foto och pris som kunden godkänner via länk.
   - Skäl: ÄTA ska beställas skriftligt enligt AB 04 och ABT 06. Annars kan beställaren vägra betala, och entreprenören bär bevisbördan.

## Fas 2 – från fält till faktura

6. **Dagrapport i mobilen (PWA) för förarna.**
   - Rapporteras per projekt och dag: timmar per maskin och person, diesel och material.
   - Foto på vågsedlar och följesedlar.
   - Fri text och foton med GPS och tid.
7. **Fakturaunderlag till Fortnox via API.**
   - Accepterad offert plus dagrapporter och ÄTA blir faktura. Delfakturering och a conto ingår.
   - ROT-rader skickas korrekt: `HouseWork`, `HouseWorkType: CONSTRUCTION`, `HouseWorkHoursToReport`. Materialrader markeras som `OTHERCOSTS` eller `EMPTYHOUSEWORK`.
   - Omvänd byggmoms sätts automatiskt för byggföretag.
8. **ROT-ansökan som fil** för den som inte fakturerar i Fortnox. Det görs som XML enligt Skatteverkets schema (version 3) och laddas upp i e-tjänsten.
9. **Efterkalkyl.**
   - Jämför kalkyl med utfall per projekt och moment.
   - Föreslå nya kapaciteter (m³/h) och tider från verkliga dagrapporter, så att kalkylerna blir bättre över tid.

## Fas 3 – krav från Trafikverket och storbolagen (affärsmöjlighet)

10. **Digitala följesedlar enligt BEAst Supply 4.0 (Peppol T120).**
    - Vem kräver det: Trafikverket sedan mars 2024 i nya upphandlingar. Från årsskiftet 2023/2024 har NCC, Peab och Skanska successivt infört kravet för leverantörer och underentreprenörer.
    - Vad det gäller (Trafikverkets krav, version 3, 2025-03-15):
      - maskiner över en viss vikt, till exempel hjulgrävare över 15 ton, bandgrävare över 19 ton, hjullastare över 10 ton och lastbilar över 3,5 ton
      - anläggningstransporter av schaktmassor som lämnar arbetsområdet
    - Hur ofta: en följesedel per dygn, senast påföljande dygn.
    - Innehåll: köparens ordernummer och orderrad, ett projektnummer, maskin- eller fordons-id samt drivmedelstyp och liter.
    - Hur det skickas: via Peppol (kräver en accesspunkt). Trafikverkets webbtjänst stöddes bara till och med 2025.
    - Varför: små företag saknar ofta system för detta och riskerar att tappa jobb som underentreprenör. Dagrapporten i fas 2 har redan nästan all data som behövs.
11. **Maskindata automatiskt.** Hämta motortimmar, bränsle och position från maskinernas telematik via ISO 15143-3 (AEMP 2.0), som Liebherr, Volvo och Cat stöder. Då behöver föraren inte skriva in timmar och diesel för hand.
12. **Maskinregister.** Service, besiktningar, daglig tillsyn och kostnad per maskintimme. Det kan även driva timpriset i kalkylen, jämför Maskinentreprenörernas MEminicalc.

## Fas 4 – säkerhet, miljö och kontroll

13. **Ledningsanvisning per projekt.**
    - Påminnelse om att beställa via Ledningskollen 5–15 arbetsdagar före schakt.
    - Varning när anvisningen är äldre än 30 dagar.
14. **Egenkontroller och riskbedömning.**
    - Checklistor för schakt enligt AFS 2023:13: släntning eller stöttning vid schakt djupare än 1 m, och kartlagda ledningar.
    - Mall för arbetsmiljöplan och avvikelser med foto.
15. **Masshantering.**
    - Dokumentera mottagare, vågsedel och klassning per lass.
    - Påminnelse om att anmälan för återanvändning av massor (ringa föroreningsrisk) ska in till kommunen minst 6 veckor innan.
16. **Personalliggare.**
    - Krävs på byggarbetsplatser där kostnaden överstiger fyra prisbasbelopp.
    - Kontrollavgiften är 12 500 kr plus 2 500 kr per person som saknas.
    - Hellre integrera med befintlig ID06-lösning än bygga egen.
17. **Bevakning av upphandlingar.** Tomelilla och Simrishamn annonserar i Mercell/TendSign. Kan ge en daglig lista över mark- och anläggningsupphandlingar i närområdet.

## Frågor att stämma av med J&L innan fas 2

- Hur stor andel av omsättningen kommer från privatkunder, kommuner respektive byggföretag?
- Får de redan krav på digitala följesedlar från NCC, Peab, Skanska eller Trafikverket?
- Vilket ekonomisystem använder de (Fortnox, Visma)? Vem fakturerar och hur ofta?
- Hur rapporterar förarna i dag: papper, sms eller app?
- Vilka maskiner har de, med märke och vikt, och har de telematik aktiverad?
- Vilka tre jobbtyper offererar de oftast?

## Källor

- SmartDok, maskin och anläggning: https://smartdok.se/branscher/maskin-anlagg/
- SmartDok, kundcase maskinentreprenörer: https://smartdok.se/kunderfarenheter/kunderfarenheter-maskinentreprenorer/
- Bygglet, priser: https://systemguiden.org/leverantor/bygglet
- Trafikverket, Krav avseende digitala följesedlar (v3, 2025-03-15): https://bransch.trafikverket.se/contentassets/4fd0fa1122aa470380283ee1f7f17d36/krav-avseende-digitala-foljesedlar-v.3-2025-03-15.pdf
- Maskinentreprenören, Krav på digitala följesedlar drar igång: https://www.maskinentreprenoren.se/krav-pa-digitala-foljesedlar-drar-igang
- Peab, klimatdatarapportering via digitala följesedlar: https://peab.se/om-peab/for-leverantorer/klimatdatarapportering-digitala-foljesedlar/
- Pinpointer, BEAst T120 för maskintjänster: https://pinpointer.se/guide/beast-t120-maskintjanster
- Fortnox API: https://api.fortnox.se/apidocs
- Skatteverket, XML-schema för rot och rut: https://www.skatteverket.se/foretag/etjansterochblanketter/allaetjanster/schemalagerxml/rotochrutforetag.4.71004e4c133e23bf6db800063583.html
- Vasa Advokatbyrå, ÄTA-arbeten: https://www.vasaadvokat.se/ata-arbeten-vi-forklarar/
- Arbetsmiljöverket, AFS 2023:13: https://www.av.se/arbetsmiljoarbete-och-inspektioner/publikationer/foreskrifter/afs-202313
- Ledningskoll innan du gräver: https://www.gravarbete.se/guider/schakt-och-grundlaggning/ledningskoll-innan-du-graver/
- Skatteverket, personalliggare byggbranschen: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarebyggbranschen.4.7be5268414bea0646949797.html
- Pinpointer, Vad kostar det att lämna schaktmassor (avfallsskatt 2026): https://pinpointer.se/vad-kostar-schaktmassor
- Sysav, prislistor: https://www.sysav.se/foretag/priser-betalning/prislistor/
- Sysav tar över i Tomelilla och Simrishamn 2026: https://www.sysav.se/om-oss/press-och-media/nyheter/sysav-tar-over-ansvaret-for-avfallshanteringen-i-tomelilla-och-simrishamn-2026/
- Zigned, priser: https://www.zigned.se/priser
- Klaroffert, effektiv offerthantering: https://klaroffert.se/blogg/effektiv-offerthantering-2026-din-guide-till-fler-jobb
- ISO 15143-3 (AEMP 2.0): https://digital.cat.com/knowledge-hub/faq/iso-15143-3-aemp-20-api-faqs
- Volvo CE, Machine data API: https://www.volvoce.com/united-states/en-us/volvo-services/machine-data-api/
- Lantmäteriet, öppna data: https://opendata.lantmateriet.se/
- Tomelilla kommun i Mercell: https://app.mercell.com/org/tomelilla_kommun/
