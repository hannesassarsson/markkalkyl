# Markkalkyl

Offert- och kalkylverktyg för mark- och schaktentreprenörer. Målet är att ta bort handräkningen i offertarbetet: mängder, lass, tippavgifter, maskintimmar, moms och ROT räknas ut medan du skriver.

## Vad den gör idag

- **Schakt:** yta × djup ger m³ fast, m³ löst (svällning) och ton. Ton ger antal lass och lastbilstimmar till tipp, och tippavgiften räknas per masstyp.
- **Fyllnad:** yta × tjocklek × densitet i packat lager ger ton material, med frakt och materialpåslag. Maskintid för utläggning och packning räknas fram.
- **Material, maskintid, handarbete och fria rader.**
- **Paket för vanliga jobb** (dränering runt hus, grusad uppfart) som blir vanliga, redigerbara rader.
- **Moms och ROT efter kundtyp:**
  - Privatperson: 25 % moms och ROT 30 % på arbetskostnaden inkl. moms, max 50 000 kr per person.
  - Företag: 25 % moms.
  - Byggföretag: omvänd byggmoms.
- **Förarens del av maskintimpriset** räknas som arbetskostnad, så att ROT-underlaget blir rätt.
- **Prislistan låses per offert.** Senare prisändringar flyttar inte en skickad offert.
- **Offertdokument** att skriva ut eller spara som PDF.
- **Statusar** (utkast, skickad, accepterad, förlorad) och vunnet belopp.
- **Säkerhetskopia** som JSON.

All data sparas i webbläsaren (localStorage). Någon server eller inloggning finns inte än.

Priserna i standardprislistan är exempel och ska ersättas med företagets egna.

## Kom igång

```sh
npm install
npm run dev      # utvecklingsserver
npm test         # kalkyltester
npm run build    # produktionsbygge
```

## Struktur

- `src/lib/calc.ts` – all kalkyllogik som rena funktioner, testad i `calc.test.ts`
- `src/lib/defaults.ts` – standardprislista och paket
- `src/lib/store.ts` – lagring i webbläsaren
- `src/views/` – offertlista, kalkyl, offertdokument, prislista och företagsuppgifter

## Nästa steg

1. Inloggning och databas (Supabase) så att flera i företaget delar offerter och prislista.
2. Skicka offert via e-post med länk där kunden kan godkänna digitalt.
3. Accepterad offert blir ett projekt: tidrapport och material per maskin och förare i mobilen.
4. Efterkalkyl: kalkylerat mot verkligt utfall per jobb.
5. Fakturaunderlag till Fortnox eller Visma, med ROT och omvänd moms rätt från början.
