## Neu: Ebene 1 + 2 als vollständiger Workshop (November 2026)

**Spielseite:** https://hennerdesma-art.github.io/Arbeitsrecht/workshop.html

Die bestehenden sieben Spiele bleiben auf der Startseite erhalten. Die neue Seite ist über die Einstiegsseite verlinkt.

### Die Aufgaben

- **01 | HR-Rechtscheck:** sechs anspruchsvolle Richtig/Falsch-Fragen zu Orientierungspraktikum (§ 22 MiLoG), Minijob und Mindestlohn (§ 1 MiLoG, MiLoV5), Feiertag (§ 2 EntgFG), Wartezeit, Wiedererkrankung (§ 3 EntgFG) und eAU (§ 5 EntgFG).
- **02 | Du bist der Gehaltsmanager:** drei individuelle Gehaltsentscheidungen (Junior Business Analyst, Projektmanagerin, tarifliche Vergütung), danach drei Richtig/Falsch-Fragen zu mündlichem Arbeitsvertrag (§§ 611a, 612 BGB), Fälligkeit (§ 614 BGB) und Entgeltabrechnung (§ 108 GewO).

Die Gehaltsfragen nutzen Touch-Slider, Schritt-Tasten und direkte Zahleneingabe. Eine gültige Antwort kann bis zur Schließung ersetzt werden, ohne die Anzahl der Stimmen zu erhöhen.

### Moderation

Öffne auf der neuen Spielseite **Admin** mit dem bereits vorhandenen Admin-Passwort. Unter **Spielsteuerung** kann die Moderation:

- Eine neue Live- oder Demo-Session anlegen bzw. die Session wechseln
- Fragen aus Ebene 1 oder 2 direkt starten und überspringen
- Abstimmungen schließen und Lösungen nachträglich freigeben
- Die anonyme Verteilung optional ohne Antwortschlüssel einblenden
- Eine Session abschließen und Demo-Session-Daten nach Bestätigung zurücksetzen
- Aggregierte Ergebnisse als CSV exportieren und ein Beamer-Dashboard öffnen

Die Lösungen werden **ausschließlich aus der gesperrten Datenbank** abgerufen und den Teilnehmenden erst bei \`revealed\` angezeigt. Im öffentlichen Repository befinden sich keine Antwortschlüssel.

### Dashboard

- **Executive:** Teilnehmerzahl, aktive Geräte (60-Sekunden-Fenster), Stimmen, Beteiligungsquote, Fortschritt
- **Rechtssicherheit:** je Frage Antwortverteilungen, Korrektheitsquoten nach Freigabe, Fehlerklassifikation, Heatmap nach Rechtsgebiet, schwierigste Fälle
- **Fixgehalt:** Histogramme, Mittelwert, Median, Minimum/Maximum, Quartile, Gehaltsbänder mit Entscheidungen, Tarifgrenze und rechtliche Bewertung
- **Vergleich:** Rechtsfragen der beiden Ebenen mit getrennten Stichproben; Gehaltswerte nicht künstlich als richtig/falsch klassifizieren
- **Live-Präsentation:** großformatige aktuelle Frage und bereits aufgelöste Ergebnisse

**Statistikhinweis:** Anwesenheit bezieht sich auf verbundene Browser innerhalb von 60 Sekunden, nicht auf verifizierte Personen. Bei Gehaltsfragen 1 und 2 ist eine Abweichung vom HR-Empfehlungsbereich nicht automatisch rechtswidrig. Fall 3 berücksichtigt dagegen eine tarifliche Mindestgrenze.

### Technische Umsetzung

- Wiederverwendung der bestehenden Browser-ID (\`nxt_device\`), Namen (\`nxt_name\`), Supabase-Verbindung und Passwortprüfung
- Bestehende Tabelle \`arb_votes\` um Sitzung/Frage/letzte Änderung ergänzt; Unique-Index auf \`(workshop_session,question_id,device_id)\`
- Isolierte Tabellen: \`arb_ws_sessions\`, \`arb_ws_questions\`, \`arb_ws_session_questions\`, \`arb_ws_participants\`, \`arb_ws_control\`
- Serverseitig validierte RPC-Aufrufe \`arb_ws_join\`, \`arb_ws_public\`, \`arb_ws_submit\`, \`arb_ws_admin\`
- RLS aktiviert, direkte Tabellenrechte für öffentliche Rollen entzogen
- Datenabfrage über 3,5-Sekunden-Aktualisierung (kein zusätzliches Backend)
- Bisherige Stimmen und Spiele wurden bei der Erweiterung nicht gelöscht
- Automatische statische Tests: \`node tests/workshop.test.mjs\`; der Pages-Workflow führt sie vor dem Deployment aus

Eine Browser-ID verhindert nur normale Doppelstimmen, nicht absichtliche Mehrfachteilnahmen über andere Browser. Namen dürfen Pseudonyme sein; vor der Lehrveranstaltung über Verarbeitung und Löschung informieren.

### Verbindliche Rechtsquellen

- MiLoG https://www.gesetze-im-internet.de/milog/
- MiLoV5 https://www.gesetze-im-internet.de/milov5/
- EntgFG https://www.gesetze-im-internet.de/entgfg/
- BGB https://www.gesetze-im-internet.de/bgb/
- TVG https://www.gesetze-im-internet.de/tvg/
- GewO https://www.gesetze-im-internet.de/gewo/
- NachwG https://www.gesetze-im-internet.de/nachwg/

Die Fragen bilden didaktisch vereinfachte, bewusst festgelegte Fallannahmen ab. Rechtsstand: November 2026. Bei praktischer Anwendung stets den aktuellen Gesetzestext und ggf. Sonder-/Tarifregelungen prüfen.


# NXT | Vergütung & Benefits – Interactive Experience

Interaktive NXT-Lehrveranstaltung für **Thema 6: Vergütung und Benefits** an der Reutlingen University.

## Website

Nach Aktivierung von GitHub Pages unter **Settings → Pages → Build and deployment → GitHub Actions**:
https://hennerdesma-art.github.io/Arbeitsrecht/

**Einmalige Freischaltung:** Unter Settings → Pages → Build and deployment muss als Quelle „GitHub Actions“ aktiviert werden. Ohne diesen Schritt schlägt der initiale Deploy-Workflow bei „Configure Pages“ fehl.

Die Web-App ist responsive für Smartphone, Tablet und Präsentationsbildschirm.

## Was funktioniert?

- Namenseingabe (ohne Konto, E-Mail oder personenbezogenen Login)
- Browser-ID als zufällige UUID, dauerhaft in localStorage
- **eine Stimme je Browser-ID und Runde**, serverseitig per UNIQUE-Constraint
- Gemeinsame Live-Abstimmung über zentralen Postgres-Datenspeicher (Supabase)
- sieben Runden: Eröffnung, Rechtssicherheit, Fixgehalt, Gerechtigkeit, variable Vergütung, Benefits, Abschluss
- Spielerisches Benefits-Budget (100 fiktive Punkte)
- Admin-Ansicht: Runde aktivieren, Abstimmung öffnen/schließen, Ergebnisse einblenden und groß präsentieren
- Wiederholung der identischen Einstiegsfrage am Ende

## Dashboard 2.0 – Ansichten für den Beamer

Nach dem Admin-Login stehen vier große Arbeitsbereiche bereit:

1. **Live-Dashboard:** aktive Frage öffnen, Stimmen annehmen, ausblenden oder freigeben, Live-Ergebnisse ansehen.
2. **Fragenübersicht:** alle sieben Runden als große Fragekacheln oder kompakte Liste; Runden lassen sich direkt starten.
3. **Alle Ergebnisse:** sieben Fragen nebeneinander als vollständiger Auswertungsüberblick (mit Stimmenzahlen).
4. **Vorher / Nachher:** identische Eröffnungs- und Schlussfrage mit vergleichbaren Verteilungen sowie einer aggregierten Veränderungskennzahl.

Für jede Ergebnisauswertung sind **Balken, Kreis, Kacheln und Tabelle** wählbar. Der Button **Präsentieren** öffnet ein großformatiges Beamer-Dashboard mit separaten Ansichten „Aktuelle Frage“, „Alle Fragen“ und „Vorher/Nachher“, Navigation durch die Fragen sowie optionalem Browser-Vollbild.

Teilnehmer-Fragen wurden ebenfalls vergrößert. Bei Fixgehalt und Bonus erscheinen die Antwortoptionen auf großen, responsiven Auswahlkarten.

Hinweise: Bei Benefits handelt es sich um Mehrfachauswahl – Kreisdiagramme zeigen Anteile an allen gewählten Benefits, Balken/Karten dagegen Anteile an den abstimmenden Geräten. Der Vorher/Nachher-Vergleich ist **aggregiert** und nicht personengenau.

## Admin

Mit dem Admin-Button oben rechts öffnen. Das Passwort wird **serverseitig** als bcrypt-Hash geprüft, nicht im öffentlichen Code gespeichert. Aus Sicherheitsgründen gibt es in diesem öffentlichen Repository kein Admin-Passwort. Zugangsdaten liegen beim Projektverantwortlichen.

## Technische Architektur

- Hosting: GitHub Pages, statische HTML/CSS/JS
- Backend: **getrennte arb_-Tabellen im vorhandenen Supabase-Projekt NXT Netzwerkforschung**
- Datenbanktabellen: arb_session, arb_votes, arb_admin_auth
- Nur genau definierte RPC-Aufrufe dürfen aus dem Browser angesprochen werden: arb_status, arb_vote, arb_voted_rounds, arb_admin_status, arb_admin_results, arb_admin_control, arb_admin_reset
- RLS für alle drei Tabellen aktiviert; direkter Tabellenzugriff für anon/authenticated entzogen
- Das für die Website verwendete Publishable API Key ist keine geheime Berechtigung. Serverseitige Berechtigungsregeln schützen die Daten.

## Datenschutz und technische Grenzen

Ein Name kann auch ein **Pseudonym** sein; keine echte Personenerkennung. Ein anderer Browser, Inkognito-Fenster oder gelöschter Speicher erzeugt eine neue Geräte-ID. Das Verfahren verhindert versehentliche Doppelabstimmungen desselben Browsers, aber keine absichtliche Mehrfachteilnahme. Namen sind nur im geschützten Admin-Dashboard sichtbar. Teilnahme sollte freiwillig sein; nach der Veranstaltung Daten löschen. Freigabe durch Lehrveranstaltung/Datenschutz prüfen.

## Didaktischer Hinweis

Fiktive Netto-/Arbeitgeberkosten sind **keine reale Lohnabrechnung**. Rechtliche Fragen sind für die Diskussion vereinfacht. Die Auflösung erfolgt durch die Referenten anhand aktueller amtlicher Gesetzestexte.

## Gestaltungsfarben

NXT Türkis: `#008B93`; zweite Türkisnuance: `#06AEB3`; dunkles Petrol: `#0D2832`; heller Hintergrund: `#F4F9F9`.

## Quellen für die Spielinhalte

- Mindestlohngesetz: https://www.gesetze-im-internet.de/milog/
- Entgeltfortzahlungsgesetz: https://www.gesetze-im-internet.de/entgfg/
- Entgelttransparenzgesetz: https://www.gesetze-im-internet.de/entgtranspg/
- Betriebsverfassungsgesetz: https://www.gesetze-im-internet.de/betrvg/
- Grundgesetz: https://www.gesetze-im-internet.de/gg/
