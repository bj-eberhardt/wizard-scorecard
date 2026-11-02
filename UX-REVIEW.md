# UX- & Design-Review: Wizard Punkteblock

> Stand: Version 0.0.38 · Analysiert am laufenden Dev-Server (`vite dev`, Chromium/Playwright)
> Screenshots im Ordner [`ux-shots/`](./ux-shots) (mit Playwright erzeugt, Desktop 1280×800 und Mobile 390×844)

---

## 1. Vorgehen und Kontext

Untersucht wurden:

- ** Quellcode**: `src/App.tsx`, alle Komponenten unter `src/components/`, `src/store/gameStore.ts`, `src/store/settingsStore.ts`, `src/i18n/`, `index.html`, `index.css`
- ** Laufendes UI**: kompletter Spiel-Workflow (Konfiguration → Schätzen → Ergebnisse → Scoreboard → nächste Runden) auf Desktop und Mobile, inkl. Tooltip, Bestätigungsdialog und Validierungsfallen

Das Produkt richtet sich an eine klare Kernsituation: **Wizard-Runde am Tisch, ein Smartphone liegt in der Mitte, mehrere Personen tippen Eingaben.** Diese Situation bestimmt, was gut und schlecht ist: Geschwindigkeit der Eingabe, Ablesbarkeit aus Distanz und Fehlertoleranz stehen über visueller Feinarbeit.

**Was bereits gut ist** (bitte nicht wegoptimieren):

- Spielzustand wird in `localStorage` persistiert → Abbruch/F5 kostet keine Daten
- Startspieler-Rotation wird berechnet und in den Overlays korrekt nach oben sortiert
- Punkteberechnung inkl. Wolke-Regel korrekt implementiert und im Tooltip explainiert
- i18n-Grundgerüst (DE/EN) vorhanden (die Pulse-Animation des Scoreboards und damit die
  einzige `prefers-reduced-motion`-Rücksicht ist mit F5 entfallen)
- Bestätigungsdialog vor dem destruktiven "Neues Spiel"

---

## 2. Findings-Übersicht

| # | Finding | Bereich | Schwere |
|---|---------|---------|---------|
| F1 | Native Browser-Validierung blockiert Eingaben > Runde – eigene Fehlermeldungen sind toter Code, Bubble zudem unlokalisiert | Bedienung | 🔴 Hoch |
| F2 | Scoreboard-Spalten nicht beschriftet; erzielte Stiche nur im Tooltip versteckt | UX/Design | 🔴 Hoch |
| F3 | 20-Runden-Tabelle auf Mobile: Buttons und aktueller Stand unter dem Fold | Bedienung | 🔴 Hoch |
| F4 | 2-Sekunden-Submit-Sperre im Ergebnis-Overlay ohne Erklärung | Bedienung | 🔴 Hoch |
| F5 | Pulse-Animation auf allen Vorhersage-Zellen feuert bei jedem Render neu | Design | 🟠 Mittel · ✅ |
| F6 | Touch-Targets zu klein (Zahleneingaben ~36 px, Checkboxen, ×-Button) | Bedienung | 🟠 Mittel |
| F7 | Modal auf Mobile top-bündig mit großer schwarzer Fläche; Vollbild-Button überlagert Logo | Design | 🟠 Mittel |
| F8 | Startspieler-Rotation im Overlay ohne Kennzeichnung ("wer ist dran") | UX | 🟠 Mittel · ✅ |
| F9 | Konfiguration: 6 freie Eingabefelder + "Anzahl Runden: 0 / Standard: 0" vor Spielstart | UX | 🟠 Mittel · ✅ |
| F10 | Kein Rückschritt/Korrektur einer bereits beendeten Runde | Bedienung | 🟠 Mittel |
| F11 | "Neues Spiel" (rot) dauerhaft neben Haupt-Action knopfgleich erreichbar | Bedienung | 🟠 Mittel · ✅ |
| F12 | Bestätigungsdialog ohne Fokus-Handling/Escape (Tooltip-Teil entfiel mit F2) | A11y | 🟠 Mittel · ✅ |
| F23 | Schätz- und Ergebnis-Overlay ohne Dialog-Semantik (Fokus, Escape, `aria-modal`) | A11y | 🟡 Gering |
| F13 | `lang="de"` fix im HTML, aber Sprache wird per Browser-Detector gewählt → gemischte Sprachen | i18n | 🟡 Gering · ✅ |
| F14 | Kein Sprachumschalter im UI, obwohl EN vorhanden | i18n | 🟡 Gering · ✅ |
| F15 | Design ohne eigene Sprache: weißer Hintergrund, harte schwarze Rahmen, Standard-Tailwind-Farben | Design | 🟡 Gering |
| F16 | Winner-View ist ein gelber Textkasten – kein Abschluss-Moment, keine Rangliste | Design | 🟡 Gering · ✅ |
| F17 | Info-Icon zeigt "!" obwohl Titel eine Frage ist; doppelte `id` im Modal | A11y/Design | 🟡 Gering · ✅ |
| F18 | `visibilitychange`-Listener wird in jedem Render neu angelegt (Wake-Lock leak) | Code/Robustheit | 🟡 Gering |
| F19 | Wolke-Historie zeigt im Tooltip die korrigierten statt der eingetragenen Stiche (Label sagt "Eingetragene Stiche") | Korrektheit | 🟡 Gering |
| F20 | 2 s Lade-Splash bei jedem Start, auch bei Fortsetzen eines gespeicherten Spiels | UX | 🟡 Gering |
| F21 | Mobile-Breite: Gesamt-Punkte ausblenden, dafür eine "Punkte"-Zeile am Tabellenende | UX/Design | 🟠 Mittel |
| F22 | Spieler-Reihenfolge in der Konfiguration nicht anpassbar (kein Drag & Drop) | UX | 🟠 Mittel |
| F24 | Gemischte Ausrichtung auf Desktop: Brett linksbündig, Primäraktion links, Ghost-Link mittig, Winner-Balken vollbreit | Design | 🟡 Gering · ✅ |
| F25 | Spielerstatistik expandable (Trefferquote, beste/schlechteste Runde, Rückstand, Wolke) | UX | 🟡 Gering · ✅ |
| F26 | Ergebnis-Export als PNG-Bild und als Text in die Zwischenablage | UX | 🟡 Gering · ✅ |
| F27 | Spielübergreifende Statistik und Siegesserien (eigene Persistenz nötig) | UX | 🟡 Gering · zurückgestellt |

---

## 3. Findings im Detail

### F1 · Native Validierung blockiert und ist unlokalisiert 🔴

**Beobachtung:** In `PredictionOverlay` und `ResultOverlay` haben die Number-Inputs `min={0} max={currentRound}`. In Runde 1 ist `max=1`. Gibt jemand versehentlich 2 ein, zeigt der Browser die native Bubble — **auf Englisch** ("Value must be less than or equal to 1."), während die ganze App Deutsch spricht:

![Native Validierungs-Bubble](./ux-shots/04-desktop-prediction-filled.png)

**Warum das stört:**

1. Die eigene, lokalisierte Validierung (`errors.predictionTooLarge`, `errors.valueTooLarge` in `translation.json`) wird **nie erreicht** — der Browser blockiert die Formular-Submit vorher. Beide Meldungen sind toter Code.
2. Die Bubble-Sprache hängt am `lang`-Attribut des `<html>`-Elements (fix `"de"` in `index.html`), die App-Sprache am Browser-Detector → inkonsistente Welt.
3. Am Tisch tippt man schnell und korrigiert; ein Blocker-Popup ohne Feldfokus-Korrektur unterbricht den Fluss.

**Änderung im Detail:**

- Formularen `noValidate` geben (`<form noValidate ...>` in beiden Overlays), damit die App-Validierung (bereits vorhanden und besser formuliert) allein entscheidet.
- Alternativ/zusätzlich: `max`-Attribut entfernen und nur per App-Logik validieren; `min={0}` kann bleiben.
- `document.documentElement.lang` auf die aktive i18n-Sprache setzen (in `i18n.ts` nach `init` + bei `languageChanged`-Event), dann wären auch verbleibende native Meldungen korrekt lokalisiert.
- Für Touch: statt freier Number-Inputs **Stepper-Zellen** (− / Wert / +) pro Spieler; damit sind Werte außerhalb des Bereichs garnicht erst eingebar und die Eingabe dauert < 1 s (siehe F6).

**Aufwand:** S (~1 h inkl. Doku der Fehlerpfade). **Risiko:** gering — Validierungslogik existiert bereits und wird nur wieder erreicht.

---

### F2 · Scoreboard: Spalten ohne Beschriftung, Stiche fehlen 🔴 ✅ umgesetzt

> **Status:** umgesetzt. Zweizeilige Kopfzeile (Name `colSpan=3`, darunter **Tipp · Stiche · Punkte**,
> en `Bid · Tricks · Points`), die Stiche-Spalte ist jetzt sichtbar im Brett und zeigt bei einer
> Wolke-Runde `eingetragen→gewertet ☁` (z. B. `4→2 ☁`). Die Punkte-Spalte ist hellgrau
> hinterlegt, alle drei Unter-Spalten haben eine **feste Einheitsbreite** (`w-12` = 48 px,
> `px-0.5 text-xs`) — eine Spielergruppe ist damit 144 px statt ~166 px breit, auf dem
> 390-px-Screen passen zwei Gruppen statt gut einer. Der Hover-/Long-Press-Tooltip des
> Scoreboards ist entfallen — damit ist auch F19 gegenstandslos. Offene Folge der
> kompakteren Dichte: siehe F21.
>
> **Hintergrund:** das ursprünglich lange Header-Wort "Vorhersage" (en
> "Prediction") machte die Tipp-Spalte ~1,7× so breit wie ihre Nachbarn, weil die Tabelle in
> Auto-Layout läuft und der längste Zelleninhalt die Spaltenbreite bestimmt. Fix: kurzes Label
> plus feste Breite; die Gleichmäßigkeit wird jetzt von einer `boundingBox`-Assertion in
> `e2e/scoreboard.spec.ts` bewacht (Toleranz 1 px). Zusätzlich hat die Tabelle kein `w-full`
> mehr — sonst hätte die einzige flexible Spalte ("Runde") den gesamten Rest der Bildschirmbreite
> bekommen und wäre als leerer Block stehen geblieben.

**Beobachtung:** Jeder Spieler hat zwei gleich aussehende Spalten — links kumulierte Punkte, rechts die Vorhersage. Es gibt keine Spaltenüberschrift, und die **erzielten Stiche** (das eigentliche Rundenergebnis) sind nur im Hover-/Long-Press-Tooltip sichtbar:

![Scoreboard Desktop](./ux-shots/09-desktop-scoreboard-several.png)

**Warum das stört:**

- Ein papierhafter Spielblock hat drei Spalten pro Spieler: Tipp / Stiche / Punkte. Wer am Tisch gegenprüft, muss für jede Runde den Tooltip öffnen — auf Mobile per Long-Press, was dort niemand macht.
- Die zweispaltige Struktur ist ohne Beschriftung nicht selbst erklärt; neue Spieler:innen verstehen das Brett in den ersten Runden nicht.
- Der Punktesprung (z. B. 30 → −10) ist ohne die Stiche dahinter nicht nachvollziehbar.

**Änderung im Detail:**

- **Kopfzeile zweizeilig** machen: Zeile 1 = Spielername (colSpan 3), Zeile 2 = "Tipp · Stiche · Punkte" (bzw. i18n-Keys `labels.prediction/result/points` — existieren bereits und werden nie verwendet!).
- Die Stiche-Zelle (`p.results[roundIndex]` bzw. `receivedResults`) als dritte Spalte aufnehmen; bei Wolke ein ☁-Symbol anhängen statt es nur im Tooltip zu verstecken.
- Punktespalte visuell absetzen (hellerer Hintergrund oder dünne Trennlinie), damit "Punkte" nicht wie eine weitere Runde wirkt.
- Optional für Mobile: Modus "nur gespielte Runden + aktuelle" (siehe F3).

**Aufwand:** M (~2–4 h). **Risiko:** gering; `Scoreboard.tsx` ist lokal gekapselt, Tooltip-Logik bleibt unverändert.

---

### F3 · Langes Board auf Mobile: Actions und Status unter dem Fold 🔴

**Beobachtung:** Bei 3 Spielern werden 20 Rundenzeilen gerendert. Auf dem 390-px-Screen ist nach Logo + Kopfzeile bereits der Fill; "Nächste Runde starten" und der aktuelle Stand liegen weit unter dem Fold:

![Mobile Scoreboard](./ux-shots/13-mobile-scoreboard.png)

**Änderung im Detail:**

- **Sticky-Action-Bar** am unteren Screenrand (die grüne Schaltfläche ist schon `sticky bottom-2`, wird aber durch die Tabellenhöhe wirkungslos, weil der Button im Dokumentfluss nach einer 20-zeiligen Tabelle liegt): Action-Bar als festes Element außerhalb des Table-Flusses, Tabelle erhält `padding-bottom` in Bar-Höhe.
- **Vergangenheit/ Zukunft trennen:** nur gespielte Runden + aktuelle Runde voll rendern; künftige Runden als kompakte Zeile "Runden 7–20 · offen" oder per "Alle Runden zeigen"-Toggle.
- **Aktuelle Runde hervorheben** (hinterlegte Zeile + Rahmen) und nach Abschluss automatisch die Tabelle zum Fortschritt scrollen lassen.
- Runde/Fortschritt zusätzlich **in den Header** holen ("Runde 6/15" + Fortschrittsbalken), damit Status immer sichtbar ist (siehe auch F16).

**Aufwand:** M (~3–5 h). **Risiko:** mittel — Scroll-/Sticky-Interaktionen auf iOS Safari testen.

---

### F4 · 2-Sekunden-Submit-Sperre ohne Erklärung 🔴

**Beobachtung:** Im Ergebnis-Overlay ist "Runde beenden" 2 s lang deaktiviert, graust aus und heißt identisch weiter — ohne Grund, ohne Countdown:

![Deaktivierte Submit-Schaltfläche](./ux-shots/05-desktop-result.png)

**Warum das stört:** Der Nutzer hat seine Eingaben gemacht und wird ohne erkennbaren Grund blockiert. Das wirkt wie ein Bug, führt zu erneutem Tippen auf den Button und zu Verunsicherung — genau das Gegenteil von Flows am Tisch. (Der mutmaßliche Grund — Verhindern, dass Ergebnisse eingetragen werden, bevor die Runde gespielt wurde — ist legitim, aber die Umsetzung bestraft den korrekten Nutzer.)

**Änderung im Detail:**

- Sperre **sichtbar begründen**: Button-Text "Noch 2 s …" mit Countdown, oder Spin-Indikator + Tooltip "Bitte erst die Runde spielen".
- Besser: Sperre **abschaffen** und stattdessen die bestehende All-Null-Bestätigung (`confirmZero`) zur Pflicht machen, wenn alle Ergebnisse 0 sind — diese fängt den eigentlichen Fehlfall (zu früh bestätigt) bereits ab.
- Mindestens: `aria-disabled` + `title`/erklärender Text, damit Screenreader und Nutzer den Grund erkennen.

**Aufwand:** S (~1 h). **Risiko:** gering.

---

### F5 · Pulse-Highlight feuert zu breit und zu oft 🟠 ✅ umgesetzt

> **Status:** umgesetzt, aber anders als vorgeschlagen: der Puls wurde **vollständig
> entfernt** statt auf einmalig + kommende Runde reduziert. Der Hinweis richtete sich auf
> die abgeschlossene Runde, klickbar ist aber die kommende — er war also auch in der
> entschärften Form nicht als Affordanz brauchbar, sondern lediglich ein Blinken, das nach
> jedem Render (und nach F5) neu anfing. Weg ist er, wenn die Klickbarkeit ohnehin anderweitig
> erkennbar wird; der Rest (dauerhafte Affordanz der Zellen) bleibt bei F12 angesiedelt.
> `Scoreboard.tsx` hat damit keinen Animationseffekt, keinen Timer und keine
> `matchMedia`-Prüfung mehr; die Vorhersage-Zelle ist ein statisches `<span>`. Bewacht wird
> das von einem Schritt in `e2e/scoreboard.spec.ts`, der **alle** Zellen der Matrix auf
> Animations-/Ring-/Scale-Klassen prüft (der frühere `reducedMotion`-Test ist damit gegenstandslos).

**Beobachtung:** Die Vorhersage-Zellen der letzten gespielten Runde pulsieren gelb (`animate-pulse`, `ring-4`, `scale-105`) — gedacht als einmaliger Hinweis auf die Klickbarkeit. In Screenshots 10+ Sekunden nach Rundende sind sie noch gelb markiert, und zwar **bei allen Spielern gleichzeitig**:

![Pulse auf allen Vorhersage-Zellen](./ux-shots/06-desktop-scoreboard-round2.png)

**Ursache im Code:** `useEffect` in `Scoreboard.tsx` hängt an `[currentRound]`, setzt aber `showPulse` bei **jedem** Render mit `currentRound > 1` neu — auch nach F5/Re-Mount und nach jedem Store-Update, nicht "once". Zudem markiert der Selektor `roundIndex === lastPlayedIndex` die *abgeschlossene* Runde; interaktiv ist aber die *kommende* (leere) Runde.

**Änderung im Detail:**

- Puls **einmalig pro Rundabschluss** machen (Flag im Store z. B. `lastRoundHintShownFor` oder `sessionStorage`).
- Nur die **kommende** Runde andeuten, und nur eine dezente Farbe (heller Hintergrund, kein `scale`/`ring-4`).
- Grundproblem der fehlenden Affordanz lösen: Klickbarkeit dauerhaft erkennbar machen (Hover-Underline bzw. Stift-Icon, Fokus-Ring für Tastatur — siehe F12), dann ist der Puls verzichtbar.

**Aufwand:** S (~1–2 h). **Risiko:** gering.

---

### F6 · Touch-Targets unter 44 px 🟠

**Beobachtung:** Number-Inputs sind `w-16 p-1` (~36 px hoch), die ×-Buttons zum Entfernen von Namen sind reine Text-Buttons, Wolke-Checkboxen ~16 px. Auf dem Mobile-Screenshot ist zu sehen, wie wenig Platz die Eingaben bieten:

![Kleine Inputs im Mobile-Overlay](./ux-shots/11-mobile-prediction.png)

**Änderung im Detail:**

- Alle interaktiven Elemente auf **mindestens 44×44 px** (Tailwind: `min-h-11 min-w-11`), Inputs auf `text-base` (verhindert zudem den iOS-Zoom-on-Focus).
- In den Overlays statt Number-Keyboard **große Stepper-Buttons** (− / +) mit Wert in der Mitte; bei Wizard liegen Werte fast immer in 0–Runden, ein Stepper ist schneller und fehlerfreier als Tippen.
- `inputMode="numeric"` ergänzen, falls Tippen bleibt.

**Aufwand:** M (~2–3 h für Stepper-Komponente, wiederverwendbar in beiden Overlays). **Risiko:** gering.

---

### F7 · Mobile-Overlay-Layout & Vollbild-Button-Kollision 🟠

**Beobachtung:** Die Overlays nutzen `xs:items-[normal]` (ab 400 px viewport) → das Modal klebt am oberen Rand, dahinter große schwarze Fläche; der Vollbild-Button (weiß, rund) schwebt über dem Blackout und kollidiert auf Mobile mit dem Logo:

![Top-bündiges Mobile-Overlay](./ux-shots/12-mobile-result.png)
![Vollbild-Button über Logo](./ux-shots/10-mobile-config.png)

**Änderung im Detail:**

- Mobile als **Bottom-Sheet** gestalten (`items-end`, `rounded-t-2xl`, volle Breite, `max-h-[85vh] overflow-auto`): Daumen-Reachability + natürlicher "Tastatur schiebt das Sheet"-Flow.
- `xs:items-[normal]` durch bewusste Breakpoint-Logik ersetzen; bei vielen Spielern Scrollbarkeit sicherstellen (6 Spieler + Buttons überschreiten 844 px Höhe).
- Vollbild-Button aus dem absoluten Overlay in eine **Header-Zeile** (Logo links, Button rechts) integrieren; auf Mobile das Logo verkleinern (siehe F15).

**Aufwand:** S–M (~2 h). **Risiko:** gering.

---

### F8 · Startspieler-Rotation ist unsichtbar 🟠 ✅ umgesetzt (bewusst teilumgesetzt)

> **Status:** umgesetzt im **Schätz-Overlay** — und dort nicht als Badge an der Zeile, sondern als
> **ein Info-Kasten direkt unter dem Titel**, in dem beide Rollen zu **einem Fließtext** laufen:
> die Handlungsaufforderung an den Geber („{{name}} mischt und verteilt {{cards}} Karten an jeden
> Spieler“), dann ein Punkt-Trenner, dann die Feststellung („Startspieler: {{name}}“). Es bleiben
> **zwei i18n-Keys** (`dealerInfo*`, `startPlayerInfo`), die erst in der Komponente zusammengesetzt
> werden — ein kombinierter Key hätte beide Sprachen in dieselbe Reihenfolge gezwungen. Der
> Trenner ist Interpunktion, kein lokalisierter String (§7). `{{cards}}` ist die **Rundenzahl pro Spieler** (Wizard-Regel:
> Runde n = n Karten auf jeder Hand), nicht die Gesamtzahl — das steht so im Satz, weil die
> Kurzform „x Karten an alle Spieler“ als Gesamtmenge lesbar wäre. Weil genau diese Zahl im
> ersten Satz **grammatikalisch** zählt, liegt der Text als `dealerInfo_one|_other` vor
> (i18next-`count`): mit einem einzigen Key hätte Runde 1 „1 Karten“ ergeben — der Fehler ist
> erst im Screenshot aufgefallen, die Tests sehen ihn nicht (sie asserten bewusst keinen Text).
> Belege: [16a](./ux-shots/16a-round1-singular.png) (de, Einzahl),
> [16b](./ux-shots/16b-round5-plural.png) (de, Mehrzahl, Runde 5 → Geber = Index 0),
> [16c](./ux-shots/16c-round1-english.png) (en),
> [16d](./ux-shots/16d-mobile-6-player-roles.png) (Mobile 390 px, 6 Spieler).
>
> **Neu im Modell — der Geber:** `getDealerIndex(round, playerCount) = (startIndex - 1 +
> playerCount) % playerCount`, also der Sitz **links neben dem Startspieler**. Die Regel war
> vorher nirgends abgebildet (kein Store-Feld, kein Key, keine Doku) und ist jetzt **nur
> abgeleitet**, nie persistiert — kein neuer Zustand, keine Storage-Migration. Zwei unabhängige
> Stellen im Bestand stützen sie: die Rotationsformel und `errors.predictionNotEqualLast`, das
> bereits „den zuletzt vorhersagenden Spieler“ benennt — das ist indexgleich genau dieser Geber
> (letzte Zeile der Rotation).
>
> **Bewusst nicht gebaut:** (1) **Scoreboard-Header-Historie** („wer war in Runde 9 Startspieler“) —
> abgelehnt, weil die feste 48-px-Zelle aus F2 keinen weiteren Marker zulässt; die Information ist
> rechnerisch über `(round-1) % spieler` ermittelbar. (2) **Kennzeichnung im Ergebnis-Overlay** —
> abgelehnt, die Rotation ist dort bereits durch die Schätz-Reihenfolge erklärt, und ein zweiter
> Ort für dieselbe Rolle erhöht nur das Raten, welcher Marker gerade gilt. (3) **Toggle „Sortierung
> abschaltbar“** aus dem ursprünglichen Vorschlag — nicht gebaut; die Sortierung *ist* die Regel,
> sie wegzulassen würde den Startspieler unkenntlicher machen, als der Findungstext erlaubt.
> (4) **Hausregel-Toggle** für die Geber-Rolle („Geber startet selbst statt linker Nachbar“) — wäre
> nötig, falls an einem Tisch die andere Variante gilt; bewusst eigenes Finding, nicht Teil von F8.
>
> **Mobile-Höhe:** der Text steht über den Spieler-Rows und ist an jedem Breakpoint sichtbar.
> Ursprünglich waren es **zwei Kästchen mit je einer Zeile**; doppelte Padding-/Margin-Zone plus
> ein unnötiger harter Umbruch schoben die Eingaben auf dem 390-px-Screen weit nach unten. Jetzt
> ein Kasten, zwei Inline-Spans, natürlicher Umbruch — die zwei Testids und `data-*`-Attribute
> sitzen an den Spans, die Tests haben sich dadurch nicht verändert. Eine versteckte
> Mobil-Variante wurde verworfen, weil sie ausgerechnet die neue
> Erklärung entfernen würde — das Layout-Problem gehört in F7 (Bottom-Sheet) und nicht in eine
> Sonderlogik pro Inhalt.

**Beobachtung:** Beide Overlays sortieren Spieler nach Startspieler (korrekt!), aber die Reihenfolge ändert sich ohne Kennzeichnung. Wer den Wizard-Kontext nicht im Kopf, irritiert die "springende" Reihenfolge Runde für Runde.

**Änderung im Detail:**

- Den Startspieler im Overlay markieren: Badge "Startet" bzw. Pfeil-Icon + i18n-Key; Sortierung optional per Toggle abschaltbar.
- Im Scoreboard-Header pro Runde winzig anzeigen, wer Startspieler war (Daten sind über `getStartPlayerIndex` bereits ableitbar).

**Aufwand:** S (~1 h). **Risiko:** gering.

---

### F9 · Konfigurations-Screen: 6 offene Felder und "Runden: 0" 🟠 ✅ umgesetzt

> **Status:** umgesetzt. Der Screen startet mit **3 Feldern** (vorbelegt aus den gemerkten
> Namen, min 3 / max 6) plus einem **"Spieler hinzufügen"**-Button (`Plus`-Icon, lucide) bis 6;
> Entfernen per **`X`-Icon** rückt die folgenden Zeilen nach, sodass die Lücken-Validierung
> (`gapInNames`, Key + Test entfernt) ersatzlos entfällt. Bei genau 3 Zeilen ist kein ×
> sichtbar, unter 3 Spieler ist also nie erreichbar; `minPlayers` bleibt als Sicherheitsnetz am
> Start. Jedes Feld trägt ein **Nummern-Badge** (`playerBadge`) statt nur eines Placeholder.
> Das Runden-Feld erscheint **erst ab ≥3 Spielern** als **Segmented Control** "Standard (n)" /
> "Eigene" — das Standard-Segment trägt `data-default-rounds` (E2E-Assert, kein Text), das
> manuelle Number-Input (`config-rounds`) gibt es nur im "Eigene"-Modus. Ein "Runden: 0 /
> Standard: 0" vor Spielstart ist damit nicht mehr darstellbar. Neue Test-Ids: `addPlayer`,
> `roundsModeStandard`, `roundsModeCustom`. **Bewusst nicht gebaut:** der optionale
> "Letzte Runde laden"-Chip — die gemerkten Namen werden direkt vorbelegt. **Neues Feature
> (nicht Teil von F9):** Spieler-Reihenfolge per Drag & Drop ändern.
>
> **Gliederung:** Der Screen ist in drei leicht gerundete, umrandete Feldgruppen
> (`<section>` mit `rounded-lg border`) geteilt — **Spieler**, **Runden**, **Optionen** — je mit
> einheitlichem `<h2>`-Heading (Key `sectionPlayers|sectionRounds|sectionOptions`). Der
> alte zentrierte Instructions-Text ist zur Unterzeile unter dem "Spieler"-Heading geworden
> (einheitliche Formatierung statt Mischstil); die "Spiel starten"-Aktion ist volle Breite.
>
> **Belege:** [17-desktop](./ux-shots/17-config-desktop.png) (1280 px, Regel-Icons aligniert und
> nicht am Rand), [17-mobile](./ux-shots/17-config-mobile.png) (390 px, beide blauen Icons
> untereinander). Nachfolger F22 (Drag & Drop) ergänzt die Zeilen um einen Greif-Griff.


**Beobachtung:** Beim Start stehen 6 leere Eingabefelder, "Anzahl Runden" zeigt `0` mit "Standard: 0", und der Hilfetext dazu erscheint erst nach Spielernamen:

![Konfiguration leer](./ux-shots/01-desktop-config.png)

**Warum das stört:** Der häufigste Fall (3–5 Spieler) sieht aus wie eine leere Groß-Tabelle; die runde-0-Anzeige wirkt wie ein Fehler; die Lücken-Validierung ("Namen müssen lückenlos von oben nach unten") ist ein heuristischer Fremdkörper, den ein "+"-Button überflüssig macht.

**Änderung im Detail:**

- Mit **3 Feldern + "Spieler hinzufügen"**-Button starten (max 6); Entfernen über × am Ende, damit die Lücken-Validierung entfällt.
- Runden-Feld erst ab ≥3 Spielern anzeigen, Default-Wert korrekt vorbelegen (4 Spieler → 15) und als **Segmented Control** (Standard / eigen) statt Number-Input — weniger Eingabe, keine unplausible 0.
- Spielernamen mit Nummern-Badge (Spieler 1 …) statt Placeholder allein, damit der Screen auch ohne Eingabe erklärt ist.
- Namen als `settingsStore`-Vorbelegung nutzen (existiert bereits) — das Wiedervorlegen nach "Neues Spiel" ist schon drin, darf aber sichtbar als "Letzte Runde laden"-Chip angeboten werden.

**Aufwand:** M (~3 h). **Risiko:** gering.

---

### F10 · Keine Korrektur einer beendeten Runde 🟠

**Beobachtung:** Nach "Runde beenden" gibt es keinen Weg, einen falsch eingetragenen Wert zu korrigieren. Der ↶-Button im Ergebnis-Overlay führt zurück zur **Schätzung** (überschreibt also den aktuellen Spielzug), nicht zur Ergebnis-Korrektur. Eine bereits gespeicherte Runde ist nur per "Neues Spiel" (alles weg) oder localStorage-Manipulation änderbar.

**Warum das stört:** Eingabefehler am Tisch (verschrieben, Stich vergessen) sind der Normalfall. Ohne Korrekturpfad wird das Tool misstrauisch behandelt.

**Änderung im Detail:**

- Im Scoreboard pro gespielter Runde eine "Bearbeiten"-Aktion (Icon-Spalte oder Long-Press → Bottom-Sheet mit den Werten der Runde; Store-Funktion `updateRoundResult(playerIndex, roundIndex, value, meta)` analog `setResult` mit Neu-Berechnung der Punktekette).
- Punktekette muss ab der geänderten Runde neu berechnet werden (`setResult` addiert nur auf `lastPoints` auf) — am einfachsten: Helper `recalcPoints(player)` aus `predictions`/`results` rebuilden.
- Alternativ als Minimum: "Runde zurücknehmen"-Button (letzter Schritt) direkt nach Rundende, mit Undo-Toast.

**Aufwand:** L (~5–8 h inkl. Punkterneuberechnung + Tests). **Risiko:** mittel — Store-Logik berührt Persistenz; Migration des Storage-Keys beachten.

---

### F11 · Destruktiven Button aus der Hauptaktion nehmen 🟠 ✅ umgesetzt

> **Status:** umgesetzt — bewusst **ohne** das vorgeschlagene ⋮-Menü und **ohne** volle Breite der
> Primäraktion. Ein Menü mit genau einem Eintrag wäre toter UI-Platz für eine Aktion, die pro
> Spielabend einmal gebraucht wird; und ein sticky über der Tabelle schwebender Knopf soll nicht
> breiter sein als nötig. Erreicht wird die Trennung stattdessen über Raum **und** Form:
>
> - **Räumlich:** "Neues Spiel" verlässt die Action-Bar und sitzt jetzt als rechtsbündige Zeile
>   über der Tabelle ([`App.tsx`](./src/App.tsx)) — anderes Screen-Ende, andere Daumenposition.
> - **Form:** Ghost-Link (kein Hintergrund, kein Rahmen, `text-sm text-gray-500`, lucide
>   `RotateCcw` 14 px) statt Flächen-Button; Rot erscheint erst als Reaktion (`hover:text-red-600`).
>   Das Touch-Ziel bleibt dank `min-h-11` ≥ 44 px.
> - Die Primäraktion bleibt in der Form, die sie hat: grün, **Inhaltsbreite**, `sticky bottom-2`,
>   zusätzlich `min-h-11` + `shadow-lg` (liest sich als schwebend über der Tabelle) und
>   `cursor-pointer` (Tailwind v4 hat keinen Default mehr).
> - **Bestätigungs-Dialog:** die sichere Handlung ist die laute — `autoFocus` plus Flächenfüllung
>   auf "Abbrechen", "Ja, beenden" nur noch outline. Die Reihenfolge bleibt Ja-links /
>   Abbrechen-rechts (DE-Muskelmemory). Fokus-Trap, Escape und `role="dialog"` bleiben bei F12.
> - **Winner-View:** dort ist "Neues Spiel" die intendierte Next-Best-Action (Runde vorbei, kein
>   Versehens-Risiko) → Primär-Stil grün, weiterhin ohne Confirm-Dialog.
>
> Bewacht wird die Trennung von einem Schritt in [`e2e/game-flow.spec.ts`](./e2e/game-flow.spec.ts),
> der die Bounding-Boxes von `T.app.nextRound` und `T.app.newGame` vergleicht (der Link muss
> ≥ 24 px über dem Knopf enden) — damit wandert der destruktive Button nicht in zwei Monaten
> zurück in die Action-Bar. Screenshots (Mid-Game, 4 Spieler, Runde 5/15, Wolke in Runde 3;
> erzeugt mit [`ux-shots/capture-f11.mjs`](./ux-shots/capture-f11.mjs)):
>
> ![F11 Desktop](./ux-shots/18-f11-scoreboard-desktop.png)
> ![F11 Mobile](./ux-shots/18-f11-scoreboard-mobile.png)
> ![F11 Confirm-Dialog](./ux-shots/18-f11-confirm-mobile.png)
>
> Offen über F11 hinaus: der Fokus-Ring selbst ist weiterhin unsichtbar (programmiertes
> `autoFocus` zeigt Chromium keinen `:focus-visible`-Ring) — Sichtbarkeit von Fokus gehört
> in F12, zusammen mit `role="dialog"`, Escape und Fokus-Trap.

**Beobachtung:** "Neues Spiel starten" (rot) sitzt direkt unter "Nächste Runde starten" (grün), gleiche Größe, gleicher Abstand — ein Tap mit dem Daumen entscheidet versehentlich "rot". Der Confirm-Dialog fängt es ab, aber die Situation erzwingt ihn ständig.

**Änderung im Detail** (Ursprungsvorschlag; Menü und volle Breite wurden bewusst verworfen, siehe Status):

- Primäraktion (Runde) hervorheben (volle Breite in der Sticky-Bar), "Neues Spiel" in ein ⋮-Menü oder als dezenten Textlink am Zeilenende.
- Im Confirm-Dialog die **sichere** Handlung betonen: "Abbrechen" als Default-Fokus, destruktive Aktion rechts und inoutline statt solid (heutige Reihenfolge: Ja-links/Abbrechen-rechts ist für DE-Muskelmemory ok, aber Fokus sollte auf "Abbrechen" liegen — siehe F12).

**Aufwand:** S (~1 h). **Risiko:** gering.

---

### F12 · Tastatur & Screenreader: Dialoge 🟠 ✅ umgesetzt

> **Status:** umgesetzt. Zwei der drei Beobachtungen waren schon vorher gegenstandslos: der
> Scoreboard-Zellen-Tooltip ist mit F2 entfernt worden (seine Zellen müssen damit nicht
> fokussierbar werden, `aria-describedby` entfällt), und die duplizierte Modal-`id` des
> `InfoTooltip` war mit `useId()` bereits behoben (F17). Übrig blieb der Fokus-Pfad — und der
> ist jetzt für **beide** echten Dialoge identisch:
>
> - Gemeinsame Logik in [`src/hooks/useDialogA11y.ts`](./src/hooks/useDialogA11y.ts):
>   beim Öffnen wandert der Fokus in den Dialog (auf das Element mit `data-autofocus`, sonst auf
>   das erste fokussierbare), Tab/Shift-Tab zyklisieren darin, ein entkommener Fokus wird
>   zurückgeholt, Escape ruft den **sicheren** Schlusspfad auf, und beim Schließen bekommt der
>   Auslöser den Fokus zurück — aber nur, wenn er noch im Dokument hängt (nach "Ja, beenden"
>   folgt die Konfigurationsansicht, der Link existiert dann nicht mehr).
> - Confirm-Dialog: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` mit `useId()`-ID,
>   `data-autofocus` auf "Abbrechen".
> - `InfoTooltip`: sein bisheriges Escape-only-`useEffect` ist durch dieselbe Hook ersetzt
>   (damit erstmals Fokus-Trap + Fokus-Rückgabe), `data-autofocus` auf "Schließen".
> - Sichtbarer Fokus-Ring (`focus-visible:ring-2 ring-blue-500 ring-offset-2`) auf den
>   Dialog-Buttons und dem "Neues Spiel"-Link.
>
> **Sichtbarkeit des Anfangsfokus:** `data-autofocus` fokussiert programmatisch, und Chromium
> zeigt darauf **keinen** Ring — der Browser weiß, dass die letzte Interaktion ein Mausklick
> war, und `:focus-visible` greift erst ab der ersten Tastaturbewegung. Das ist Standard-
> Verhalten (dasselbe macht ein natives `<dialog>`), deshalb ist der Beweis-Screenshot mit
> Tastatur-Navigation erzeugt ([`ux-shots/capture-f12.mjs`](./ux-shots/capture-f12.mjs)):
>
> ![F12 Confirm-Dialog per Tastatur, Ring auf "Abbrechen"](./ux-shots/19-f12-confirm-keyboard.png)
> ![F12 Regel-erklaerung per Tastatur, Ring auf "Schließen"](./ux-shots/19-f12-info-keyboard.png)
>
> **Abgesichert** in [`e2e/game-flow.spec.ts`](./e2e/game-flow.spec.ts) (Dialog-Attribute,
> Anfangsfokus auf der sicheren Aktion, Tab-Zyklus inklusive Wrap an beiden Enden, Escape =
> Abbrechen + Fokus zurück auf den Link) und
> [`e2e/configure-game.spec.ts`](./e2e/configure-game.spec.ts) (derselbe Pfad für den
> Regel-Dialog). Assertet wird über `role`/`aria-*`-Attribute und `toBeFocused()`, nie über Text.
>
> **Nicht Teil von F12:** die Schätz- und Ergebnis-Overlays sind weiterhin einfache
> Vollflächen-Overlays ohne Dialog-Semantik — siehe neu angelegtes F23.

**Beobachtung:**

- Scoreboard-Tooltip nur per `mouseenter`/Long-Press; keine Fokuspfade, Zellen sind nicht fokussierbar. *(entfällt mit F2)*
- Confirm-Dialog: kein Fokus-Trap, Escape schließt ihn nicht, kein `role="dialog"`/`aria-modal` (InfoTooltip hat es dagegen korrekt).
- `InfoTooltip` setzt die `id="info-modal-title"` hart — bei zwei Instanzen duplizierte ID. *(war schon vor F12 mit `useId()` behoben, F17)*

**Änderung im Detail:**

- Tooltip-Inhalt in die Zelle als `aria-describedby`/visuell versteckter Text oder per `focus`-Event auslösen; Zellen als `<button>`-artige fokussierbare Elemente.
- Confirm-Dialog aufwerten: `role="dialog"`, `aria-modal="true"`, Fokus in Dialog + Trap, Escape = Abbrechen, Rückgabe des Fokus an den Auslöser.
- Duplizierte ID entfernen (auf `aria-labelledby` mit generierter ID umstellen).

**Aufwand:** M (~3 h). **Risiko:** gering.

---

### F13/F14 · Sprache: kein Umschalter, `lang`-Attribut fix 🟡 · ✅ umgesetzt

> **Status:** umgesetzt. Sprachumschalter im **Footer mittig** als zwei Flaggen-Buttons
> (🇩🇪 / 🇬🇧, `aria-label` + `aria-pressed`, `role="group"` mit lokalisiertem Group-Label,
> 44-px-Touch-Targets, aktive Flagge umrandet). Die Flaggen sind **Inline-SVG**, kein Flaggen-Emoji:
> lucide führt keine Länder-Symbole, und Windows rendert Regional-Indicator-Emoji als Buchstaben
> „DE"/"GB" (Beleg: `ux-shots/_emoji-probe.png`). Die Wahl wird als `language` in `settingsStore`
> (`wizard_settings_v1`) persistiert und **überschreibt beim Boot den Browser-Detector**
> (`i18n.ts` liest den persistierten Wert direkt aus localStorage und setzt `lng`).
> Ohne explizite Wahl entscheidet wie bisher der Detector (fallback `de`).
> F13: `document.documentElement.lang` wird nach `init` und bei jedem `languageChanged`
> auf die aktive Sprache gesetzt — `index.html` bleibt nur der Startwert.
> **Nachschub (Sichtbarkeit):** Der Footer ist **responsive platziert**. Auf dem **Desktop**
> (`md:`) ist er eine **immer sichtbare, fixierte Leiste** (`md:fixed md:bottom-0 md:z-30`, über
> den Runden-Overlays, unter Modal/Splash), damit die Sprache auch mitten in einer Runde erreichbar
> ist. Auf **Mobil** ist er **nicht** angeheftet: er steht als normaler Fluss-Block (`mt-8`)
> **unterhalb des Inhalts** (nach der Runden-Tabelle) und scrollt mit — eine dauerhaft fixierte
> Leiste würde der Tabelle für ein nur gelegentlich genutztes Steuer ständig Höhe wegnehmen.
> **Mobil** (unterhalb des `md`-Breaks) ist er zudem bewusst reduziert: Flaggen-Zeile und Copyright
> entfallen, stattdessen **ein einziger kompakter Chip** (lucide `Globe` + aktueller Code), der per
> Antippen direkt `de`↔`en` umschaltet. Nur wo der Footer fixiert ist (Desktop), reservieren die
> Container seine Höhe: `App.tsx`-Wrapper und Overlays `md:pb-28` (mobil keine Bottom-Reserve),
> Sticky-Button `bottom-2 md:bottom-24`. Das mobile Layout ersetzt die früheren Mobil-Screenshots
> [22]; das Verhalten deckt der `@mobile`-Test in `e2e/i18n.spec.ts` ab (Chip sichtbar, Flaggen +
> Copyright versteckt, `position: static`, Höhe < 70 px, ein Tap kippt die Sprache); ein
> Desktop-Schritt desselben Tests sichert `position: fixed`.
> Belege: `e2e/i18n.spec.ts` (Umschalten, Persistenz über Reload, Override gegen den
> Detector, `lang`-Attribut) und `ux-shots/capture-lang.mjs` →
> [20](./ux-shots/20-lang-footer-desktop-de.png) (de, persistiert gegen einen en-US-Browser),
> [21](./ux-shots/21-lang-footer-desktop-en.png) (en nach einem Klick),
> [22](./ux-shots/22-lang-footer-mobile-de.png) (Mobile 390 px, Fokus-Ring sichtbar).

**Beobachtung:** `index.html` hat fest `lang="de"`, `i18n.ts` detektiert per Browser (fallback `de`), aber es gibt **keinen** sichtbaren Sprachumschalter — EN ist faktisch nur erreichbar, wenn der Browser Englisch meldet. Kombiniert mit F1 (englische Native-Bubble in deutscher UI) entsteht ein inkonsistenter Eindruck.

**Änderung im Detail:**

- DEEN-Umschalter (Flaggen/Länderkürzel) im Header oder Footer; Auswahl in `settingsStore` persistieren. ✅
- `document.documentElement.lang = i18n.language` bei Init + `languageChanged`. ✅

**Aufwand:** S (~1–2 h). **Risiko:** gering.

---

### F15 · Design ohne eigene Sprache 🟡

**Beobachtung:** Weißer Hintergrund, durchgehend 2 px schwarze Rahmen, Standard-Tailwind-Blau/Grün/Rot, großes WIZARD-Logo mit hartem Shadow. Das funktioniert, wirkt aber wie ein Funktions-Prototyp und verschenkt Identität — obwohl das Wizard-Branding (Gold/Schwarz, mystisch) eine fertige Designsprache mitbringt:

![Desktop Konfiguration](./ux-shots/02-desktop-config-filled.png)

**Änderung im Detail (konkreter Stilvorschlag):**

- **Theme:** dunkler Hintergrund (Slate-900 / tiefes Violett), Karten in Anthrazit, Akzente in Wizard-Gold (#D4AF37-Familie) — passt zum Logo und verbessert Ablesbarkeit am Tisch (weniger Blendung, mehr Kontrast).
- **Tabellenrahmen** von 2 px schwarz auf 1 px `border-white/10` + Zebrastreifen; Spielergruppen nur noch durch eine dünne Senkrechte trennen.
- **Button-System** definieren: Primär (Gold/Füllung, abgerundet, Icon + Text), Sekundär (Ghost), Destruktiv (nur im Dialog outline). Aktuell mischen alle Buttons Tailwind-Rohfarben.
- Logo auf Mobile auf ~40 px Höhe reduzieren bzw. als Wortmarke; der Punkteblock-Screen braucht den Platz.
- Schrift: tabular numbers für Punkte/Stiche (`font-variant-numeric: tabular-nums`), damit Spalten fluchten.

**Aufwand:** M für Token-System + Tailwind-Theme (4–6 h), kann schrittweise (erst Buttons/Tabelle, dann Dark Mode) laufen. **Risiko:** mittel — Screenshots/Doku aktualisieren.

---

### F16 · Winner-View ohne Abschluss-Moment 🟡 ✅ umgesetzt

> **Status:** umgesetzt. Rangliste mit Wettbewerbs-Rängen (Gleichstand teilt sich den Rang, nächste
> Position skippt), Siegerzeile gold mit `Trophy`-Icon, CSS-Confetti (respektiert
> `prefers-reduced-motion`), expandierbares Statistik-Panel (→ F25), Ergebnis-Export als PNG
> (→ F26) und als Text, sowie Revanche-Button mit Roster-Rotation.
>
> **Revanche-Rotation:** `rematch()` in `gameStore.ts` rotiert das Roster so, dass der letzte
> Spieler neuer Spieler 1 wird: `[P_n, P_1, …, P_{n-1}]`. Damit wandert die Mischpflicht eine
> Sitzposition weiter (der alte Spieler n-1 mischt in der neuen Runde 1). Die Rotation wird
> zusätzlich auf `settingsStore.playerNames` angewendet, damit "Neues Spiel" dieselbe
> Sitzordnung vorbelegt. Revanche öffnet sofort das Schätz-Overlay Runde 1.
>
> **Confetti:** CSS-only (`.confetti-container` in `index.css`), `pointer-events-none`,
> z-index 10 (unter Footer 30, Dialogen 50). Läuft genau einmal pro Mount (~2.5 s,
> `animation-fill-mode: forwards` blendet aus). Bei `prefers-reduced-motion: reduce` rendert
> die Komponente keinen sichtbaren Container. E2E-Haken: `T.winner.confetti` +
> `data-reduced-motion="true|false"`.
>
> **Aktionen im Winner-Screen:** Revanche (grün, Primär, volle Breite) · Ergebnis speichern
> (umrandet) · Als Text kopieren (umrandet) · Neues Spiel (Ghost-Link, ohne Confirm —
> Begründung bleibt wie in F11: kein Versehens-Risiko am Spielende).
>
> **Abgesichert** in `e2e/winner.spec.ts`: Rangfolge, Gleichstand-Rank, `data-*`-Attribute der
> Statistik-Zeilen, Revanche-Rotation (Header-Name-Assertion), Download-Event mit
> Dateiname-Regex, Confetti-Container.

**Beobachtung:** Nach der letzten Runde erscheint ein gelber Kasten mit Textzeile über dem Tabellenrest; kein Ranking, keine Hervorhebung, kein Teilen:

![Winner-View (unten auf dem Board)](./ux-shots/09-desktop-scoreboard-several.png)

**Änderung im Detail:**

- Vollflächige Abschluss-Sicht: Podest/Rangliste (Platz, Name, Punkte, Trefferquote "5× Tipp korrekt"), Sieger gold hervorgehoben, dezente Confetti-Animation (respektiert `prefers-reduced-motion`).
- "Ergebnis teilen"-Aktion: Ergebnis als Bild (Canvas/copy) oder Text in Zwischenablage — typischer Wunsch nach der letzten Runde.
- "Revanche starten"-Button (gleiche Spieler, neues Spiel) — direkter Next-Best-Action.

**Aufwand:** M (~3–4 h). **Risiko:** gering.

---

### F25 · Spielerstatistik expandable (nur aktuelles Spiel) 🟡 ✅ umgesetzt

> **Status:** umgesetzt. Ein Panel für alle Spieler (Default zu, `data-stats-open="false"`).
> Immer sichtbar: Rang, Name, Punkte, Trefferquote in %. Aufgeklappt pro Spieler: Tipps korrekt
> n/m, beste Runde +X, schlechteste Runde −X, Rückstand auf Platz 1, Wolke n×.
> Nenner: `points.length` (tatsächlich gespielte Runden), bei 0 rendiert `–` statt `NaN`.
> Bewertet wird `results` (gewertete Stiche). Reines Modul `src/store/stats.ts`
> (`computePlayerStats`, `rankPlayers`) ohne React, genutzt von WinnerView und resultImage.
> Keine spielübergreifende Statistik — das wäre F27.

**Aufwand:** ~2 h. **Risiko:** gering — reine Berechnung auf vorhandenem Store.

---

### F26 · Ergebnis-Export als PNG und Text 🟡 ✅ umgesetzt

> **Status:** umgesetzt. PNG via eigene Canvas-2D-Zeichnung (`src/components/resultImage.ts`),
> 1080×1350 logical (Scale 2), dunkler Hintergrund mit Gold-Akzent für den Sieger.
> Download über Blob → `URL.createObjectURL` → `<a download>`.
> Dateiname: `wizard-<ISO-Datum>-<Sieger>.png`, Unicode-bereinigt, Tie → `geteilt`.
> Text-Export: `navigator.clipboard.writeText` mit zusammengefasster Rangliste,
> Status über `data-copied="true|false"`. Kein `navigator.share`-Pfad.
> E2E: `page.waitForEvent('download')` mit Regex auf Dateiname-Präfix.

**Aufwand:** ~2 h. **Risiko:** gering — kein DOM-Capture, keine neue Abhängigkeit.

---

### F27 · Spielübergreifende Statistik und Siegesserien 🟡 · zurückgestellt

**Beobachtung:** "Siege in Folge", "Siege gesamt" und vergleichbare Serien-Statistiken
erfordern eine spielüberschreitende Persistenz (`wizard_history_v1`), da `wizard_state_v1`
mit `resetGame()` gelöscht wird und den Abschluss eines Spiels nicht überdauert.

**Warum zurückgestellt:** Eigener localStorage-Key, Kappe, Lösch-Option, idempotenter
Schreibzeitpunkt in `advanceRound`, E2E-Seeding via `seedHistory` — erhöht den Scope
deutlich über das eigentliche F16/F25 hinaus. Bewusst als eigenes Finding dokumentiert,
damit die Entscheidung nachvollziehbar bleibt.

**Vorgeschlagene Umsetzung (wann immer gebaut):**
- Key `wizard_history_v1`, Array von Einträgen `{ finishedAt, playerCount, totalRounds, ranking, winnerNames }`.
- Schreibort: `advanceRound()` beim Übergang `currentRound > totalRounds` (Reload im Winner-Screen
  ruft das nicht erneut auf → keine Duplikate).
- Serie pro Name: aufeinanderfolgende Einträge mit Sieg; Tie zählt für alle Sieger.
- Kappe: letzte 50 Einträge, ältester fliegt.
- `resetGame()` löscht die Historie NICHT.
- E2E: neuer Helper `seedHistory(page, entries)`, ein echter 5-Runden-Durchlauf als
  Schreibbeweis.

**Aufwand:** M (~3 h inkl. Fixture + Tests). **Risiko:** mittel — neuer Store-Key,
Interaktion mit `resetGame`, History-Tests brauchen Seeding.

---

### F19 · Wolke-Tooltip zeigt falsche Zahl fürs Label 🟡 · erledigt (entfällt)

**Ursprüngliche Beobachtung:** In `Scoreboard.getTooltipContent` wurde für `receivedTricksLabel` `p.results[roundIndex]` (der **korrigierte** Wert) statt `p.receivedResults[roundIndex]` (der **eingetragene** Wert) eingesetzt — die Variable `received` wurde nur auf Existenz geprüft, nicht verwendet.

**Auflösung:** Mit dem Wegfall des Scoreboard-Tooltips (F2) ist die fehlerhafte Funktion samt ihrer i18n-Keys (`scoreboard.tooltip`, `scoreboard.wolkeNote`, `scoreboard.receivedTricksLabel`, `scoreboard.originalPredictionLabel`) entfernt. Die Unterscheidung eingetragen vs. gewertet leistet jetzt die Stiche-Zelle selbst (`4→2 ☁`), abgesichert durch die Zell-Matrix in `e2e/scoreboard.spec.ts` und den Wolke-Test in `e2e/result.spec.ts`.

---

### F21 · Mobile-Breite: Punkte-Spalte ausblenden, "Punkte"-Zeile ans Tabellenende 🟠

**Beobachtung:** F2 hat die Dichte pro Spieler von zwei auf drei Spalten erhöht. Auf dem 390-px-Screen passt damit gut eine Spielergruppe sichtbar nebeneinander; der Rest liegt im Horizontal-Scroll (`overflow-x-auto`). Die kumulierten Punkte sind pro Spieler die **letzte** Spalte einer Gruppe und damit diejenige, die am weitesten rechts (also am ehesten außerhalb des sichtbaren Bereichs) liegt.

**Warum das stört:** Die häufigste Frage am Tisch ist "wer führt?". Genau die Antwort steht auf Mobile am rechten Rand einer scrollenden Tabelle.

**Änderung im Detail (Option, bewusst noch nicht gebaut):**

- Auf Mobile (`< md`) die **Punkte-Zellen ausblenden** (`hidden md:table-cell`) und stattdessen ganz unten in der Tabelle eine eigene **"Punkte"-Zeile** rendern, die pro Spieler den aktuellen Stand zeigt. Damit ist die Summe ohne Horizontal-Scroll erreichbar, weil sie am Zeilenende steht, nicht am Spaltenende.
- Die Runden-Spalte bleibt sticky links; die Punkte-Zeile würde entsprechend sticky unterhalb des Tabellenkörpers laufen (oder als feste Action-Bar über dem Rand, siehe F3).
- Kombination mit F3 (Sticky-Action-Bar) und F9 (weniger Felder) denken: beide wollen denselben unteren Screenrand.
- Kostenpflichtig: `data-testid`-Struktur bleibt pro Zelle erhalten, aber die Punkte-Zelle wäre auf Mobile doppelten Ursprungs (Zelle ausgeblendet, Zeile sichtbar) → die E2E-Matrix müsste pro Viewport unterscheiden.

**Aufwand:** M (~2–3 h inkl. Sticky-Verhalten auf iOS Safari). **Risiko:** mittel — doppelter Anzeigenort für dieselbe Zahl, Scroll-/Sticky-Interaktionen.

---

### F22 · Spieler-Reihenfolge per Drag & Drop anpassen 🟠

**Beobachtung:** Die Konfiguration (F9) legt Spieler in der Reihenfolge ihrer Zeilen fest. Einmal
falsch eingegeben oder in Tischreihenfolge (im Uhrzeigersinn) umsortieren ist nur möglich, indem
man Namen löscht und neu tippt — die Startspieler-/Geber-Rotation (§5) hängt an genau dieser
Reihenfolge, ist aber starr.

**Warum das stört:** Am Tisch setzt man sich in einer festen Rundum-Reihenfolge; weicht die
Roster-Reihenfolge davon ab, stimmt die rotierte Startspieler-Abbildung (§5) nicht mit der realen
Sitzordnung überein. Umsortieren muss deshalb direkt möglich sein.

**Änderung im Detail (bewusst noch nicht gebaut — neues Feature, Nachfolger von F9):**

- Pro Zeile einen Greif-Griff (lucide `GripVertical`) links; Ziehen verschiebt die Zeile.
- Umsetzung ohne neue Abhängigkeit denkbar (HTML5 Drag-and-Drop oder Pointer-Events); alternativ
  eine kleine Library — Entscheidung vor Umsetzung nötig (Bundle vs. Touch-Qualität).
- Touch: Long-Press-Grab + klare Einfüge-Markierung; reine Pfeil-Buttons (↑/↓) als mobile-
  taugliche Fallback-Option abwägen.
- Reihenfolge ist für `startGame`/E2E unsichtbar (Roster-Indices bleiben), aber `data-*`-Attribut
  am Greifer für einen neuen Sortier-Test erwägen.

**Aufwand:** M (~3–4 h inkl. Touch-Greiffall). **Risiko:** mittel — Drag & Drop auf Mobile ist
fehleranfällig; Fokus/Screenreader-Pfad mitsdenken.

---

### F23 · Schätz- und Ergebnis-Overlay ohne Dialog-Semantik 🟡

**Beobachtung:** F12 hat nur die beiden echten Dialoge (Bestätigung, Regel-Erklärung) erwischt.
`PredictionOverlay` und `ResultOverlay` sind Vollflächen-Overlays ohne `role="dialog"`, ohne
`aria-modal`, ohne Fokus-Trap und ohne Escape: wer mit Tastatur arbeitet, tabt durch das
verdeckte Scoreboard hindurch, und Escape tut nichts — obwohl das Overlay visuell alles andere
blockiert. Der ↶-Knopf ("Zurück") ist der einzige Ausweg.

**Warum das stört:** Auf dem geteilten Telefon am Tisch ist die Tastatur selten — aber ein
Screenreader-Nutzer oder jemand, der das Spiel auf dem Laptop nachträgt, bekommt nicht mit, dass
sich der Kontext geändert hat.

**Änderung im Detail (bewusst noch nicht gebaut — aus F12 herausgelöst):**

- Beide Overlays mit `ref` + `role="dialog"` + `aria-modal="true"` + `aria-labelledby` auf den
  bestehenden Titel; Fokus-Verhalten über dieselbe
  [`useDialogA11y`](./src/hooks/useDialogA11y.ts)-Hook, `data-autofocus` auf das erste Eingabefeld.
- Escape = der bestehende weiche Abbruch (zurück eine Stufe), **nicht** verwerfen: im
  Schätz-Overlay gibt es keinen Rückweg, dort müsste Escape also die Eingaben unverändert lassen
  und das Overlay nur schließen — das ist eine Produktentscheidung, keine Technikfrage.
- Kosten: die Overlays werden bei jedem Rundenschritt neu gemountet, der Fokus sprang dann
  automatisch ins Feld — erwünscht, aber die E2E-Suite füllt Felder aktuell per `fill()`, was den
  Fokus nicht braucht; beide Pfade bleiben also grün.

**Aufwand:** S–M (~2 h inkl. Escape-Entscheidung). **Risiko:** gering — dieselbe Hook, keine
Store-Logik.

---

### F24 · Ausrichtung der Seite gemischt (Desktop: halbe Fläche frei) 🟡 ✅ umgesetzt

> **Status:** umgesetzt. Alles liegt jetzt auf einer Mittellinie: Kopf, Konfigurationsspalte,
> Brett, Primär- und destruktive Aktion, Winner-Karte. Umgesetzt als **Zentrierung ohne
> Breite-Obergrenze** für das Brett (eine `max-width`-Spalte hätte das 6-Spieler-Board auf
> Desktop horizontal scrollbar gemacht), nur die schmalen Textspalten (Konfiguration, Winner,
> Tooltip) behalten ihre bewusste Inhaltsbreite `max-w-md`.

**Beobachtung:** Auf dem Desktop (1280 px) endet die Nutzung nach gut einem Drittel der Breite:
die Scoreboard-Tabelle stand linksbündig in einem vollbreiten Scroll-Container, der grüne
"Nächste Runde starten"-Knopf lag im Fluss ebenfalls links, der "Neues Spiel starten"-Ghost-Link
war schon mittig, und die Winner-Ausgabe war ein vollbreiter gelber Balken — vier verschiedene
Ausrichtungen auf einem Screen.

**Warum das stört:** Die halbe Bildfläche ist freies Weiß, der Blick springt zwischen links und
mitte, und die Zerstörungs-Aktion wirkt wie ein anderes Element als die Hauptaktion, obwohl beide
dieselbe Spalte bedienen.

**Änderung im Detail:**

- **Brett:** der Scroll-Container verliert `w-full` und bekommt `max-w-full` im bestehenden
  `flex justify-center`-Wrapper — er schrumpft auf die Tabellenbreite (zentriert) und bleibt vom
  Viewport begrenzt (auf dem Handy weiterhin Horizontal-Scroll). Die Tabelle selbst behält ihr
  `min-w-max` und kein `w-full` (siehe F2).
- **Primäraktion:** `mt-4 flex justify-center sticky bottom-2 z-[200]` auf einem Wrapper-`div`;
  der Knopf behält seine Inhaltsbreite (F11 unverändert).
- **Winner-Karte:** `mx-auto max-w-md text-center` statt Vollbreiten-Balken; der
  "Neues Spiel starten"-Knopf darunter wird ebenso zentriert.
- Bewacht von `e2e/scoreboard.spec.ts` (gleiche Links/Rechts-Abstände für Tabelle und Primärknopf,
  gemessen am `clientWidth`) und `e2e/responsive.spec.ts` (`@mobile`: 6-Spieler-Brett bleibt
  breiter als der Viewport und bleibt scrollbar — die Zentrierung darf den Container nicht
  aufblähen).

| 3 Spieler, Desktop (war linksbündig) | 6 Spieler, Desktop | 6 Spieler, Mobile (Scroll bleibt) |
|---|---|---|
| ![Zentriertes Brett, 3 Spieler](./ux-shots/23a-centre-3player-desktop.png) | ![Zentriertes Brett, 6 Spieler](./ux-shots/23b-centre-6player-desktop.png) | ![Mobiles Scroll-Brett](./ux-shots/23c-centre-6player-mobile.png) |

![Zentrierte Winner-Karte](./ux-shots/23d-centre-winner-desktop.png)

**Aufwand:** S (~30 min). **Risiko:** gering — reine Layout-Klassen; die Abstands-Assertion aus
F11 und die Spaltenbreiten-Assertion aus F2 bleiben grün.

---

### F17–F20 · Weitere Beobachtungen (kurz)

- **F17 · Info-Icon passt nicht zur Frage: ✅ umgesetzt.** Der Titel lautet "Was bedeutet 'Nicht Gleich'?" — das Icon zeigte ein "!" (SVG-Pfad `M11.5 6h1v7h-1z` + Punkt). Ersetzt durch das lucide-Icon **`CircleHelp`** ("?" im Kreis); die doppelte Modal-`id` war zuvor schon per `useId()` behoben.
- **F18 · Wake-Lock-Listener im Render:** In `App.tsx` wird `document.addEventListener('visibilitychange', …)` direkt im Komponentenrumpf ausgeführt → bei jedem Render ein neuer Listener (Leak). In ein `useEffect` mit Cleanup verlagern; leeren `useEffect` (Zeile 52–54) entfernen. Zusätzlich: Wake-Lock nur bei `gameStarted` halten und bei Spielende releasen.
- **F19 · Wolke-Tooltip zeigt falsche Zahl fürs Label:** Entfallen — der Scoreboard-Tooltip wurde mit F2 entfernt, die Unterscheidung eingetragen/gewertet zeigt die Stiche-Zelle (`4→2 ☁`). Siehe Detail-Abschnitt zu F19.
- **F20 · 2-Sekunden-Splash bei jedem Start:** `LoadingScreen` blockiert fix 2 s + 1 s Fade — auch beim Fortsetzen eines gespeicherten Spiels. Splash nur beim ersten Laden der Session zeigen (`sessionStorage`-Flag) oder auf < 800 ms reduzieren; der Splash ist zudem `z-[1000]` und überlagert alles ohne Fortschrittsinformation.

---

## 4. Priorisierte Roadmap

**P0 — Fehler & Blocker (ohne Designarbeit, maximaler Effekt):**

1. F1 — `noValidate` + funktionsfähige lokalisierte Validierung (S) ✅ umgesetzt
2. F4 — Submit-Sperre erklären oder entfernen (S)
3. F2 — Spaltenüberschriften + Stiche-Spalte im Scoreboard (M) ✅ umgesetzt
4. F3 — Sticky-Action-Bar + aktuelle Runde hervorheben (M)
5. F10 — Mindestens "Runde zurücknehmen" (L für Vollversion, S für Undo des letzten Schritts)

**P1 — Bedienqualität am Tisch:**

6. F6 — 44-px-Targets, Stepper-Inputs (M)
7. F7 — Bottom-Sheet-Overlays, Header-Zeile für Vollbild-Button (S–M)
8. F9 — Spieler-Hinzufügen-Flow statt 6 leerer Felder (M) ✅ umgesetzt
9. F5 — Pulse entfernen (S) ✅ umgesetzt (vollständig entfernt statt entschärft)
10. F8 — Startspieler-Kennzeichnung (S) ✅ umgesetzt (nur Schätz-Overlay, als Info-Zeilen inkl. Geber)
11. F11 — Destruktiven Button aus der Hauptaktion nehmen (S) ✅ umgesetzt (Ghost-Link oben statt ⋮-Menü, Primäraktion bleibt Inhaltsbreite)
12. F21 — Mobile: Punkte-Zeile am Tabellenende statt rechtspunktiger Punkte-Spalte (M)

**P2 — Politur & Identität:**

13. F15 — Design-Tokens/Dark-Theme schrittweise (M)
14. F16 — Winner-View mit Rangliste & Teilen (M) ✅ umgesetzt (Rangliste, Confetti, Revanche mit Rotation)
15. F25 — Spielerstatistik expandable (S) ✅ umgesetzt
16. F26 — Ergebnis-Export als PNG/Text (S) ✅ umgesetzt
17. F27 — Spielübergreifende Statistik / Siegesserien (M) — zurückgestellt
18. F12/F17 — A11y: Dialoge, Fokus (M) ✅ umgesetzt (beide Dialoge über `useDialogA11y`; der
    Tooltip-Teil entfiel mit F2) — F17 ✅ umgesetzt (Lucide `CircleHelp`)
19. F13/F14 — Sprachumschalter + `lang`-Synchronisation (S) ✅ umgesetzt (Flaggen im Footer mittig, Wahl persistiert und überschreibt den Detector, `<html lang>` synchron)
20. F22 — Spieler-Reihenfolge per Drag & Drop (M) — Nachfolger von F9
21. F23 — Overlay-Dialoge mit `role`/Fokus-Trap/Escape (S–M) — Folge von F12
22. F18/F20 — Code-Hygiene & Kleinigkeiten (S)
23. F24 — Zentrierung der ganzen Seite (S) ✅ umgesetzt (Brett, Primäraktion, Winner-Karte)

> F12 ist auf den Bestätigungs-Dialog und die Regel-Erklärung geschrumpft: der
> Scoreboard-Zellen-Tooltip war mit F2 schon entfernt, damit entfiel auch der dortige
> Tastatur-Pfad. Was von F12 offen blieb (die beiden Spiel-Overlays), steht jetzt als F23.

---

## 5. Methodik & Belege

- Alle Screenshots wurden mit Playwright (Chromium 156, headless) im Frame `ux-screens.mjs` erzeugt: Desktop 1280×800, Mobile 390×844 mit Touch. Der kompletter Flow (4 Spieler, 6 Runden bzw. 3 Spieler, 2 Runden) wurde durchgespielt.
- Code-Belege verlinken direkt in die Dateien:
  - Native-Validierung (F1, ✅ umgesetzt): [`PredictionOverlay.tsx`](./src/components/PredictionOverlay.tsx), [`ResultOverlay.tsx`](./src/components/ResultOverlay.tsx) — die Trick-Inputs haben kein `max`-Attribut mehr, die Bereichsprüfung liegt allein in den Submit-Handlern
  - Submit-Sperre (2 s): [`ResultOverlay.tsx` L25–36](./src/components/ResultOverlay.tsx)
  - Pulse-Logik (F5, ✅ entfernt): [`Scoreboard.tsx`](./src/components/Scoreboard.tsx) — der
    `showPulse`-Effekt samt Timer und `matchMedia`-Prüfung ist ersatzlos weg, die Vorhersage-Zelle
    rendert ein statisches `<span>`
  - Punktekette/`setResult`: [`gameStore.ts` L134–153](./src/store/gameStore.ts)
  - Wolke eingetragen/gewertet: [`Scoreboard.tsx`](./src/components/Scoreboard.tsx) (`tricksText()`) — der alte Tooltip samt F19-Fehlerzeile ist entfernt
  - Startspieler/Geber (F8, ✅ umgesetzt): [`PredictionOverlay.tsx`](./src/components/PredictionOverlay.tsx)
    (die zwei Info-Zeilen unter dem Titel) und [`gameStore.ts`](./src/store/gameStore.ts)
    (`getStartPlayerIndex` / `getDealerIndex`) — nur der Geber-Anteil ist neu, die Rotation selbst
    war schon vorher korrekt
  - Destruktiver Link + Primäraktion (F11, ✅ umgesetzt): [`App.tsx`](./src/App.tsx) — Ghost-Link
    über der Tabelle, grüner Knopf in Inhaltsbreite `sticky bottom-2`
  - Dialog-A11y (F12, ✅ umgesetzt): [`src/hooks/useDialogA11y.ts`](./src/hooks/useDialogA11y.ts)
    (Fokus-Falle, Escape, Fokus-Rückgabe) — genutzt vom Confirm-Dialog in
    [`App.tsx`](./src/App.tsx) und von [`InfoTooltip.tsx`](./src/components/InfoTooltip.tsx)
  - Wake-Lock im Render: [`App.tsx` L56–77](./src/App.tsx)
  - Splash: [`LoadingScreen.tsx` L8–14](./src/components/LoadingScreen.tsx)
  - `lang="de"` fix (F13, ✅ dynamisch synchronisiert): [`index.html` L2](./index.html) bleibt der
    Startwert; [`i18n.ts`](./src/i18n/i18n.ts) setzt `document.documentElement.lang` bei Init und
    bei `languageChanged`
  - Sprachumschalter (F14, ✅ umgesetzt): [`Footer.tsx`](./src/components/Footer.tsx) (Flaggen,
    `aria-pressed`), Persistenz in [`settingsStore.ts`](./src/store/settingsStore.ts)
    (`language`), Detector-Override in [`i18n.ts`](./src/i18n/i18n.ts)
  - Zentrierung (F24, ✅ umgesetzt): [`Scoreboard.tsx`](./src/components/Scoreboard.tsx)
    (`overflow-x-auto max-w-full` im `flex justify-center`-Wrapper), [`App.tsx`](./src/App.tsx)
    (Wrapper um die Primäraktion, `sticky` bleibt), [`WinnerView.tsx`](./src/components/WinnerView.tsx)
    (`mx-auto max-w-md text-center`); Beweise in `ux-shots/capture-centre.mjs`
  - Winner-View / Revanche (F16, ✅ umgesetzt): [`WinnerView.tsx`](./src/components/WinnerView.tsx)
    (Rangliste, Confetti, Aktionen), [`gameStore.ts`](./src/store/gameStore.ts) (`rematch()`),
    [`index.css`](./src/index.css) (`.confetti-container` Keyframes)
  - Statistik (F25, ✅ umgesetzt): [`src/store/stats.ts`](./src/store/stats.ts)
    (`computePlayerStats`, `rankPlayers`, `buildTextSummary`, `sanitizeNameForFile`)
  - Export (F26, ✅ umgesetzt): [`src/components/resultImage.ts`](./src/components/resultImage.ts)
    (`renderResultImage`, `downloadBlob`) — Canvas 2D, 1080×1350, Scale 2

> Hinweis: `ux-shots/` und `ux-screens.mjs` sind Analyse-Artefakte. Wenn sie nicht ins Repository sollen, können sie nach der Durchsicht gelöscht oder zu `.gitignore` hinzugefügt werden.
