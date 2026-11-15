# NXT | Vergütung & Benefits – Interactive Experience

Interaktive NXT-Lehrveranstaltung für **Thema 6: Vergütung und Benefits** an der Reutlingen University.

## Website

Nach Aktivierung von GitHub Pages unter **Settings → Pages → Build and deployment → GitHub Actions**:
https://hennerdesma-art.github.io/Arbeitsrecht/

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

## Admin

Mit dem Admin-Button oben rechts öffnen. Das Passwort wird **serverseitig** als bcrypt-Hash geprüft, nicht im öffentlichen Code gespeichert. Aus Sicherheitsgründen gibt es in diesem öffentlichen Repository kein Admin-Passwort. Zugangsdaten liegen beim Projektverantwortlichen.

## Technische Architektur

- Hosting: GitHub Pages, statische HTML/CSS/JS
- Backend: **getrennte arb_-Tabellen im vorhandenen Supabase-Projekt NXT Netzwerkforschung**
- Datenbanktabellen: arb_session, arb_votes, arb_admin_auth
- Nur genau definierte RPC-Aufrufe dürfen aus dem Browser angesprochen werden: arb_status, arb_vote, arb_admin_status, arb_admin_results, arb_admin_control
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
