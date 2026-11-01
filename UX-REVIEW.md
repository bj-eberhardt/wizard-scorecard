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
- i18n-Grundgerüst (DE/EN) vorhanden, `prefers-reduced-motion` wird respektiert
- Bestätigungsdialog vor dem destruktiven "Neues Spiel"

---

## 2. Findings-Übersicht

| # | Finding | Bereich | Schwere |
|---|---------|---------|---------|
| F1 | Native Browser-Validierung blockiert Eingaben > Runde – eigene Fehlermeldungen sind toter Code, Bubble zudem unlokalisiert | Bedienung | 🔴 Hoch |
| F2 | Scoreboard-Spalten nicht beschriftet; erzielte Stiche nur im Tooltip versteckt | UX/Design | 🔴 Hoch |
| F3 | 20-Runden-Tabelle auf Mobile: Buttons und aktueller Stand unter dem Fold | Bedienung | 🔴 Hoch |
| F4 | 2-Sekunden-Submit-Sperre im Ergebnis-Overlay ohne Erklärung | Bedienung | 🔴 Hoch |
| F5 | Pulse-Animation auf allen Vorhersage-Zellen feuert bei jedem Render neu | Design | 🟠 Mittel |
| F6 | Touch-Targets zu klein (Zahleneingaben ~36 px, Checkboxen, ×-Button) | Bedienung | 🟠 Mittel |
| F7 | Modal auf Mobile top-bündig mit großer schwarzer Fläche; Vollbild-Button überlagert Logo | Design | 🟠 Mittel |
| F8 | Startspieler-Rotation im Overlay ohne Kennzeichnung ("wer ist dran") | UX | 🟠 Mittel |
| F9 | Konfiguration: 6 freie Eingabefelder + "Anzahl Runden: 0 / Standard: 0" vor Spielstart | UX | 🟠 Mittel |
| F10 | Kein Rückschritt/Korrektur einer bereits beendeten Runde | Bedienung | 🟠 Mittel |
| F11 | "Neues Spiel" (rot) dauerhaft neben Haupt-Action knopfgleich erreichbar | Bedienung | 🟠 Mittel |
| F12 | Tooltip nicht tastaturbedienbar; Bestätigungsdialog ohne Fokus-Handling/Escape | A11y | 🟠 Mittel |
| F13 | `lang="de"` fix im HTML, aber Sprache wird per Browser-Detector gewählt → gemischte Sprachen | i18n | 🟡 Gering |
| F14 | Kein Sprachumschalter im UI, obwohl EN vorhanden | i18n | 🟡 Gering |
| F15 | Design ohne eigene Sprache: weißer Hintergrund, harte schwarze Rahmen, Standard-Tailwind-Farben | Design | 🟡 Gering |
| F16 | Winner-View ist ein gelber Textkasten – kein Abschluss-Moment, keine Rangliste | Design | 🟡 Gering |
| F17 | Info-Icon zeigt "!" obwohl Titel eine Frage ist; doppelte `id` im Modal | A11y/Design | 🟡 Gering |
| F18 | `visibilitychange`-Listener wird in jedem Render neu angelegt (Wake-Lock leak) | Code/Robustheit | 🟡 Gering |
| F19 | Wolke-Historie zeigt im Tooltip die korrigierten statt der eingetragenen Stiche (Label sagt "Eingetragene Stiche") | Korrektheit | 🟡 Gering |
| F20 | 2 s Lade-Splash bei jedem Start, auch bei Fortsetzen eines gespeicherten Spiels | UX | 🟡 Gering |

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

### F2 · Scoreboard: Spalten ohne Beschriftung, Stiche fehlen 🔴

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

### F5 · Pulse-Highlight feuert zu breit und zu oft 🟠

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

### F8 · Startspieler-Rotation ist unsichtbar 🟠

**Beobachtung:** Beide Overlays sortieren Spieler nach Startspieler (korrekt!), aber die Reihenfolge ändert sich ohne Kennzeichnung. Wer den Wizard-Kontext nicht im Kopf, irritiert die "springende" Reihenfolge Runde für Runde.

**Änderung im Detail:**

- Den Startspieler im Overlay markieren: Badge "Startet" bzw. Pfeil-Icon + i18n-Key; Sortierung optional per Toggle abschaltbar.
- Im Scoreboard-Header pro Runde winzig anzeigen, wer Startspieler war (Daten sind über `getStartPlayerIndex` bereits ableitbar).

**Aufwand:** S (~1 h). **Risiko:** gering.

---

### F9 · Konfigurations-Screen: 6 offene Felder und "Runden: 0" 🟠

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

### F11 · Destruktiver Button in Hauptaktionnähe 🟠

**Beobachtung:** "Neues Spiel starten" (rot) sitzt direkt unter "Nächste Runde starten" (grün), gleiche Größe, gleicher Abstand — ein Tap mit dem Daumen entscheidet versehentlich "rot". Der Confirm-Dialog fängt es ab, aber die Situation erzwingt ihn ständig.

**Änderung im Detail:**

- Primäraktion (Runde) hervorheben (volle Breite in der Sticky-Bar), "Neues Spiel" in ein ⋮-Menü oder als dezenten Textlink am Zeilenende.
- Im Confirm-Dialog die **sichere** Handlung betonen: "Abbrechen" als Default-Fokus, destruktive Aktion rechts und inoutline statt solid (heutige Reihenfolge: Ja-links/Abbrechen-rechts ist für DE-Muskelmemory ok, aber Fokus sollte auf "Abbrechen" liegen — siehe F12).

**Aufwand:** S (~1 h). **Risiko:** gering.

---

### F12 · Tastatur & Screenreader: Tooltip und Dialoge 🟠

**Beobachtung:**

- Scoreboard-Tooltip nur per `mouseenter`/Long-Press; keine Fokuspfade, Zellen sind nicht fokussierbar.
- Confirm-Dialog: kein Fokus-Trap, Escape schließt ihn nicht, kein `role="dialog"`/`aria-modal` (InfoTooltip hat es dagegen korrekt).
- `InfoTooltip` setzt die `id="info-modal-title"` hart — bei zwei Instanzen duplizierte ID.

**Änderung im Detail:**

- Tooltip-Inhalt in die Zelle als `aria-describedby`/visuell versteckter Text oder per `focus`-Event auslösen; Zellen als `<button>`-artige fokussierbare Elemente.
- Confirm-Dialog aufwerten: `role="dialog"`, `aria-modal="true"`, Fokus in Dialog + Trap, Escape = Abbrechen, Rückgabe des Fokus an den Auslöser.
- Duplizierte ID entfernen (auf `aria-labelledby` mit generierter ID umstellen).

**Aufwand:** M (~3 h). **Risiko:** gering.

---

### F13/F14 · Sprache: kein Umschalter, `lang`-Attribut fix 🟡

**Beobachtung:** `index.html` hat fest `lang="de"`, `i18n.ts` detektiert per Browser (fallback `de`), aber es gibt **keinen** sichtbaren Sprachumschalter — EN ist faktisch nur erreichbar, wenn der Browser Englisch meldet. Kombiniert mit F1 (englische Native-Bubble in deutscher UI) entsteht ein inkonsistenter Eindruck.

**Änderung im Detail:**

- DEEN-Umschalter (Flaggen/Länderkürzel) im Header oder Footer; Auswahl in `settingsStore` persistieren.
- `document.documentElement.lang = i18n.language` bei Init + `languageChanged`.

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

### F16 · Winner-View ohne Abschluss-Moment 🟡

**Beobachtung:** Nach der letzten Runde erscheint ein gelber Kasten mit Textzeile über dem Tabellenrest; kein Ranking, keine Hervorhebung, kein Teilen:

![Winner-View (unten auf dem Board)](./ux-shots/09-desktop-scoreboard-several.png)

**Änderung im Detail:**

- Vollflächige Abschluss-Sicht: Podest/Rangliste (Platz, Name, Punkte, Trefferquote "5× Tipp korrekt"), Sieger gold hervorgehoben, dezente Confetti-Animation (respektiert `prefers-reduced-motion`).
- "Ergebnis teilen"-Aktion: Ergebnis als Bild (Canvas/copy) oder Text in Zwischenablage — typischer Wunsch nach der letzten Runde.
- "Revanche starten"-Button (gleiche Spieler, neues Spiel) — direkter Next-Best-Action.

**Aufwand:** M (~3–4 h). **Risiko:** gering.

---

### F17–F20 · Weitere Beobachtungen (kurz)

- **F17 · Info-Icon passt nicht zur Frage:** Der Titel lautet "Was bedeutet 'Nicht Gleich'?" — das Icon zeigt ein "Ausrufezeichen" (SVG-Pfad `M11.5 6h1v7h-1z` + Punkt = "!"). Für Fragen ein "?" rendern; desgleichen fehlt im Tooltip-Titel ein Fragezeichen am Ende nicht, aber das Icon sollte die Absicht spiegeln.
- **F18 · Wake-Lock-Listener im Render:** In `App.tsx` wird `document.addEventListener('visibilitychange', …)` direkt im Komponentenrumpf ausgeführt → bei jedem Render ein neuer Listener (Leak). In ein `useEffect` mit Cleanup verlagern; leeren `useEffect` (Zeile 52–54) entfernen. Zusätzlich: Wake-Lock nur bei `gameStarted` halten und bei Spielende releasen.
- **F19 · Wolke-Tooltip zeigt falsche Zahl fürs Label:** In `Scoreboard.getTooltipContent` wird für `receivedTricksLabel` `p.results[roundIndex]` (der **korrigierte** Wert) statt `p.receivedResults[roundIndex]` (der **eingetragene** Wert) eingesetzt — die Variable `received` wird nur auf Existenz geprüft, nicht verwendet. Besser: "Eingetragen: 3 → gewertet: 2 (Wolke)".
- **F20 · 2-Sekunden-Splash bei jedem Start:** `LoadingScreen` blockiert fix 2 s + 1 s Fade — auch beim Fortsetzen eines gespeicherten Spiels. Splash nur beim ersten Laden der Session zeigen (`sessionStorage`-Flag) oder auf < 800 ms reduzieren; der Splash ist zudem `z-[1000]` und überlagert alles ohne Fortschrittsinformation.

---

## 4. Priorisierte Roadmap

**P0 — Fehler & Blocker (ohne Designarbeit, maximaler Effekt):**

1. F1 — `noValidate` + funktionsfähige lokalisierte Validierung (S)
2. F4 — Submit-Sperre erklären oder entfernen (S)
3. F2 — Spaltenüberschriften + Stiche-Spalte im Scoreboard (M)
4. F3 — Sticky-Action-Bar + aktuelle Runde hervorheben (M)
5. F10 — Mindestens "Runde zurücknehmen" (L für Vollversion, S für Undo des letzten Schritts)

**P1 — Bedienqualität am Tisch:**

6. F6 — 44-px-Targets, Stepper-Inputs (M)
7. F7 — Bottom-Sheet-Overlays, Header-Zeile für Vollbild-Button (S–M)
8. F9 — Spieler-Hinzufügen-Flow statt 6 leerer Felder (M)
9. F5 — Pulse auf einmalig + kommende Runde reduzieren (S)
10. F8 — Startspieler-Kennzeichnung (S)
11. F11 — Destruktiven Button aus der Hauptaktion nehmen (S)

**P2 — Politur & Identität:**

12. F15 — Design-Tokens/Dark-Theme schrittweise (M)
13. F16 — Winner-View mit Rangliste & Teilen (M)
14. F12/F17 — A11y: Dialoge, Fokus, Tooltip-Tastatur (M)
15. F13/F14 — Sprachumschalter + `lang`-Synchronisation (S)
16. F18/F19/F20 — Code-Hygiene & Kleinigkeiten (S)

---

## 5. Methodik & Belege

- Alle Screenshots wurden mit Playwright (Chromium 156, headless) im Frame `ux-screens.mjs` erzeugt: Desktop 1280×800, Mobile 390×844 mit Touch. Der kompletter Flow (4 Spieler, 6 Runden bzw. 3 Spieler, 2 Runden) wurde durchgespielt.
- Code-Belege verlinken direkt in die Dateien:
  - Native-Validierung: [`PredictionOverlay.tsx`](./src/components/PredictionOverlay.tsx) (`max={currentRound}`), [`ResultOverlay.tsx`](./src/components/ResultOverlay.tsx)
  - Submit-Sperre (2 s): [`ResultOverlay.tsx` L25–36](./src/components/ResultOverlay.tsx)
  - Pulse-Logik: [`Scoreboard.tsx` L13–39](./src/components/Scoreboard.tsx)
  - Punktekette/`setResult`: [`gameStore.ts` L134–153](./src/store/gameStore.ts)
  - Wolke-Tooltip-Label: [`Scoreboard.tsx` L61–68](./src/components/Scoreboard.tsx)
  - Wake-Lock im Render: [`App.tsx` L56–77](./src/App.tsx)
  - Splash: [`LoadingScreen.tsx` L8–14](./src/components/LoadingScreen.tsx)
  - `lang="de"` fix: [`index.html` L2](./index.html)

> Hinweis: `ux-shots/` und `ux-screens.mjs` sind Analyse-Artefakte. Wenn sie nicht ins Repository sollen, können sie nach der Durchsicht gelöscht oder zu `.gitignore` hinzugefügt werden.
