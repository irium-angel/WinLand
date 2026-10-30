'use strict';
// Language: the island in French (fr, default) or English (en). Settings → General → Language.
// The code is written in Dutch (where WinLand comes from) and is never shown in Dutch: every text goes
// Dutch → English (EXACT), and in French mode on to French (FR, keyed by the English text).
// Every text drawn on the canvas goes through text(), and every DOM page is watched, so all screens
// are translated in one place. Unknown texts (your own notes, Claude's messages, file names) stay as they are.
(function i18n() {
  const lang = () => (window.__winlandPrefs?.().lang === 'en' ? 'en' : 'fr');
  window.__winlandLang = lang;

  const EXACT = {
    "Je camera bekijken": "Check your camera",
    // System, Studio, break reminder, clipping alert
    "Systeem": "System", "Studio": "Studio", "Processor, grafische kaart": "Processor, graphics card", "Pauzeherinnering": "Break reminder", "Een seintje als je zo lang aan het gamen bent": "A ping when you have been gaming this long", "1 uur": "1 h", "1,5 uur": "1.5 h", "2 uur": "2 h", "Melding bij oversturing": "Clipping alert", "Waarschuwt als het geluid van je pc in het rood gaat, ook in je DAW (pagina Studio)": "Warns when your PC’s sound goes into the red, also in your DAW (Studio page)",
    "Bediening": "Controls", "Geluid, vergrendelen": "Sound, lock",
    // live: microphone/camera, screenshots, downloads, charging
    "Microfoon en camera": "Microphone and camera", "Een stipje op de island zolang een app je microfoon (oranje) of camera (groen) gebruikt": "A small dot on the island while an app uses your microphone (orange) or camera (green)", "Schermafbeeldingen in de lade": "Screenshots in the tray", "Een nieuwe schermafbeelding (Win+Shift+S) komt meteen in je lade, klaar om te slepen": "A new screenshot (Win+Shift+S) goes straight into your tray, ready to drag", "Downloads": "Downloads", "Een melding en het bestand in je lade zodra een download klaar is": "A message and the file in your tray as soon as a download is done", "Opladen": "Charging", "Het percentage als je de lader in- of uitplugt": "The percentage when you plug the charger in or out",
    // hiding behind big windows
    "Verstoppen achter grote vensters": "Hide behind big windows", "Bij een gemaximaliseerd of volledig scherm venster komt de island pas tevoorschijn als je de muis naar boven beweegt": "With a maximized or full-screen window, the island only comes out when you move the mouse to the top", "Discreet in een game": "Discreet in a game", "Verstopt de island helemaal en zet geluiden en meldingen uit zolang een game het scherm vult": "Hides the island completely and mutes its sounds and notifications while a game fills the screen",
    // Dev page
    "Melden als een dev-programma klaar is": "Tell me when a dev program finishes", "bun, node, python, cargo, dotnet… dat langer dan 10 seconden liep (pagina Dev)": "bun, node, python, cargo, dotnet… that ran longer than 10 seconds (Dev page)", "Claude Code en Dev (Git, servers) op het homescherm, melding als een build klaar is, waarschuwing bij 80% limiet": "Claude Code and Dev (Git, servers) on the home screen, a ping when a build finishes, warning at 80% of the limit",
    // profiles and game mode
    "Profiel": "Profile", "Eigen keuze": "Custom", "Kantoor": "Office", "Programmeren": "Development", "Gamen": "Gaming", "Muziekproductie": "Music production", "Jij kiest alles zelf, hieronder": "You choose everything yourself, below", "Notitie, klembord en focus voorop. Rustig: geen confetti, verstopt bij een presentatie": "Note, clipboard and focus up front. Calm: no confetti, hidden during a presentation", "Claude Code groot op het homescherm, Pip-chat en klembord bij de hand, waarschuwing bij 80% limiet": "Claude Code big on the home screen, Pip chat and clipboard at hand, warning at 80% of the limit", "Muziek voorop, geen geluiden of meldingen, en de island verstopt zich als een game het scherm vult": "Music up front, no sounds or notifications, and the island hides when a game fills the screen", "Muziek en lade voorop (sleep je samples erin). Geen eigen geluiden die je mix storen": "Music and tray up front (drop your samples in). No sounds of its own to disturb your mix", "Discreet bij volledig scherm": "Discreet in full screen", "Verstopt de island en zet geluiden en meldingen uit zolang een game, video of presentatie het hele scherm vult": "Hides the island and mutes its sounds and notifications while a game, video or presentation fills the screen",
    "Deze speler laat niet doorspoelen": "This player does not allow seeking",
    // Claude Code / Codex page
    "Bezig, een vraag, klaar of een fout: WinLand laat het zien, ook als je Claude Code vanaf je telefoon bestuurt.": "Working, a question, done or an error: WinLand shows it, even when you drive Claude Code from your phone.", "Bezig, een vraag, klaar of een fout: WinLand laat het zien, terwijl jij iets anders doet.": "Working, a question, done or an error: WinLand shows it while you do something else.", "Installeer Codex (de AI-programmeerhulp van OpenAI) en open hem één keer. Kom daarna hier terug om hem te koppelen.": "Install Codex (the OpenAI coding assistant) and open it once. Then come back here to connect it.",
    // texts that had no English yet
    "Het gesprek is niet meer leesbaar. Houd het open, herstel het venster als het geminimaliseerd is, of verbind opnieuw.": "The conversation can no longer be read. Keep it open, restore the window if it is minimized, or connect again.", "Open het gesprek om de situatie te controleren.": "Open the conversation to check what is going on.", "Wis alles": "Clear all", "Geluid van WinLand": "WinLand sound", "Klik nog eens om af te sluiten": "Click again to quit", "Titel, en dan je regels…": "Title, then your lines…", "Project kon niet worden geladen.": "The project could not be loaded.", "Projectchat kon niet worden geladen.": "The project chat could not be loaded.", "✓ Analyse klaar": "✓ Analysis done", "Kies map": "Choose folder", "Wat wil je veranderen?": "What do you want to change?", "Koppel je projectmap": "Link your project folder", "Beschrijf je idee. WinLand kiest zelf de juiste bestanden, opent ze in VS Code en voert je opdracht uit.": "Describe your idea. WinLand picks the right files, opens them in VS Code and carries out your request.", "Kies één lokale map. Daarna praat je met WinLand over het hele project.": "Choose one local folder. Then you talk to WinLand about the whole project.", "AI-instellingen konden niet worden opgeslagen.": "The AI settings could not be saved.", "Dit verzoek is mislukt.": "This request failed.", "Verbonden met ChatGPT": "Connected to ChatGPT", "Gebruik je ChatGPT-account": "Use your ChatGPT account", "Log in via de officiële pagina in je browser en kies je werkruimte.": "Sign in on the official page in your browser and pick your workspace.", "Inloggen met ChatGPT": "Sign in with ChatGPT", "Je key is veilig opgeslagen.": "Your key is stored safely.", "Gebruik je eigen key. Verbruik loopt via je API-account.": "Use your own key. Usage goes through your API account.", "Via je WinLand-account": "Through your WinLand account", "Je eigen API-key": "Your own API key", "ChatGPT is verbonden. Je kunt terug naar Project.": "ChatGPT is connected. You can go back to Project.", "Je bent uitgelogd.": "You are signed out.", "Vul eerst een key in.": "Enter a key first.", "Project kon niet geladen worden.": "The project could not be loaded.", "Project kon niet geopend worden.": "The project could not be opened.", "Project kon niet opnieuw gescand worden.": "The project could not be scanned again.", "Typ eerst wat je wilt zoeken.": "Type what you want to find first.", "Ik vond hier nog geen relevante code voor.": "I did not find relevant code for this yet.", "Zoeken in het project is mislukt.": "Searching the project failed.", "Bestand kon niet gelezen worden.": "The file could not be read.", "Nog geen project gekozen": "No project chosen yet", "Kies projectmap": "Choose project folder", "Dit is rechtstreeks uit je lokale project gelezen.": "This was read straight from your local project.", "Geen muziek actief": "No music playing", "AI-interface komt hier.": "The AI interface comes here.",
    // WinLand perso: theme and music from every app
    "Thema": "Theme", "Donker of licht, voor de island en de instellingen": "Dark or light, for the island and the settings", "Donker": "Dark", "Licht": "Light", "Start muziek in je muziek-app, of druk op afspelen.": "Start music in your music app, or press play.", "Meebewegen als er muziek speelt": "Moves along when music plays",
    // states and labels
    'Bezig': 'Working', 'Versturen': 'Sending', 'Vraag': 'Question', 'Fout': 'Error', 'Gestopt': 'Stopped', 'Niet beschikbaar': 'Unavailable',
    'Klaar': 'Done', 'Verbinden': 'Connecting', 'Niet verbonden': 'Not connected', 'Inloggen': 'Log in', 'Rustig': 'Idle', 'rustig': 'idle',
    'Wacht op jou': 'Waiting for you', '● Wacht op jou': '● Waiting for you', '✓ Klaar': '✓ Done', '✕ Gestopt met een fout': '✕ Stopped with an error',
    'Wacht op Claude Code': 'Waiting for Claude Code', 'Claude is bezig': 'Claude is working', 'Claude bezig': 'Claude working',
    'Wil toestemming': 'Needs permission', 'Plan klaar': 'Plan ready', 'Heeft een vraag voor jou': 'Has a question for you',
    'Claude heeft een vraag voor je': 'Claude has a question for you', 'Claude Code heeft je nodig.': 'Claude Code needs you.',
    'Claude heeft je nodig in de terminal.': 'Claude needs you in the terminal.', 'Toegestaan, gaat verder': 'Allowed, continuing',
    'Geweigerd': 'Denied', 'Gezien': 'Seen', 'Niet actief': 'Not active', 'Niet gekoppeld': 'Not connected', 'Nog niet gekoppeld': 'Not connected yet',
    'Je antwoord is verstuurd': 'Your answer was sent', 'Claude is overbelast': 'Claude is overloaded', 'niet ingelogd': 'not logged in',
    'antwoord te lang': 'answer too long', 'Voert een opdracht uit': 'Running a command', 'Zoekt in de code': 'Searching the code',
    'Zoekt op internet': 'Searching the web', 'Start een helper': 'Starting a helper', 'Claude vraagt iets': 'Claude asks something',
    'Plan klaar: goedkeuren?': 'Plan ready: approve?', 'Er ging iets mis': 'Something went wrong', 'Fout: limiet bereikt': 'Error: limit reached',
    // permission
    'Toestaan': 'Allow', 'Weigeren': 'Deny', 'Bekijk': 'View', 'Mag ik dit doen?': 'May I do this?',
    // header / home / widgets
    'Apps': 'Apps', 'Widgets': 'Widgets', 'Lade': 'Tray', 'Klembord': 'Clipboard', 'Notitie': 'Note', 'Instellingen': 'Settings',
    'Klok': 'Clock', 'Muziek': 'Music', 'Apparaten': 'Devices', '🔇 Geluid uit': '🔇 Sound off', 'Leeg': 'Empty', 'Opschrijven': 'Write it down', 'Laatste kopieën': 'Last copies', 'Kleuren, geluid': 'Colours, sound',
    'Kleuren, geluid en meer': 'Colours, sound and more', 'Je laatste kopieën': 'Your last copies', 'Snel iets opschrijven': 'Jot something down',
    'Niks aan het spelen': 'Nothing playing', 'opent WinLand overal': 'opens WinLand anywhere', 'TIP': 'TIP',
    'Alles wat WinLand voor je kan doen · Ctrl+Alt+1–6 = sneltoets': 'Everything WinLand can do · Ctrl+Alt+1–6 = shortcut',
    'Sleep om te verplaatsen  ·  + voor nieuwe widgets': 'Drag to move  ·  + for new widgets',
    'Kies een app en een maat, of pak een kant-en-klare indeling': 'Pick an app and a size, or a ready-made layout',
    'Standaard': 'Default', '8 klein': '8 small', '2 groot': '2 big', '4 breed': '4 wide', 'Klein': 'Small', 'Breed': 'Wide', 'Groot': 'Big',
    'Staat er al': 'Already there', 'Geen plek': 'No room', 'Toevoegen': 'Add', 'Maak klein': 'Make small', 'Maak breed': 'Make wide', 'Maak groot': 'Make big',
    'Haal eerst iets weg of maak iets kleiner': 'Remove something or make it smaller first', 'Geen plek om groter te maken': 'No room to make it bigger',
    'Focus loopt': 'Focus running', 'Blijf gefocust': 'Stay focused', 'Blijf gefocust, Pip let op': 'Stay focused, Pip is watching',
    'Klaar om te starten': 'Ready to start', 'Tik om iets op te schrijven': 'Tap to write something down', 'Kopieer iets, dan staat het hier': 'Copy something and it shows up here',
    'Snelkoppelingen': 'Shortcuts', 'Jouw favoriete apps': 'Your favourite apps', 'Aanpassen': 'Edit', '+ Lege plek': '+ Empty spot',
    'Tip: Ctrl + Alt + 1–6 opent apps ook met het toetsenbord': 'Tip: Ctrl + Alt + 1–6 also opens apps from the keyboard',
    'Max 4 · haal er eerst een uit': 'Max 4 · remove one first', 'Kies tot 4 apps · ze staan ook op je homescherm': 'Pick up to 4 apps · they are on your home screen too',
    // music
    'Er speelt nu niks': 'Nothing is playing', 'Start muziek in Spotify, of druk op afspelen.': 'Start music in Spotify, or press play.',
    'Spotify koppelen': 'Connect Spotify', 'Dan zie en bedien je je muziek hier.': 'Then you see and control your music here.', 'Koppel Spotify': 'Connect Spotify',
    '⏭  Volgend nummer': '⏭  Next song', '⏮  Vorig nummer': '⏮  Previous song',
    // tray, clipboard, note, focus
    'Laat los, ik vang hem!': "Let go, I'll catch it!", '🧺 Laat los, ik vang hem!': "🧺 Let go, I'll catch it!", 'Het bestand komt in je lade': 'The file goes into your tray',
    'Sleep een bestand eruit, of klik om het te openen': 'Drag a file out, or click to open it', 'Sleep bestanden op de island om ze even te bewaren': 'Drop files on the island to keep them for a bit',
    'Sleep hier een bestand heen om het toe te voegen': 'Drop a file here to add it', 'Sleep een bestand op de island om het even te bewaren': 'Drop a file on the island to keep it for a bit',
    'Uit de lade halen': 'Take out of the tray', 'Sleep een kaartje eruit, of klik om het te openen': 'Drag a card out, or click to open it', 'Bewaar bestanden even, en sleep ze er later weer uit': 'Keep files for a bit, and drag them out later',
    'Even checken voor je videogesprek · de camera stopt als je weggaat': 'A quick check before your video call · the camera stops when you leave',
    'Geen camera gevonden, of Windows geeft geen toegang (Instellingen → Privacy → Camera).': 'No camera found, or Windows gives no access (Settings → Privacy → Camera).',
    'Klik op een kaart om hem weer te kopiëren': 'Click a card to copy it again',
    'Sleep hierheen': 'Drop here', 'Wis geschiedenis': 'Clear history',
    'Je lade is leeg': 'Your tray is empty', 'Sleep een bestand op WinLand om het even te bewaren': 'Drop a file on WinLand to keep it for a bit',
    'Je laatst gekopieerde tekst · klik om opnieuw te kopiëren': 'Your last copied text · click to copy again', 'Wissen': 'Clear', 'Gekopieerd ✓': 'Copied ✓',
    'Nog niks gekopieerd': 'Nothing copied yet', 'Kopieer iets (Ctrl + C), dan verschijnt het hier.': 'Copy something (Ctrl + C) and it shows up here.',
    'Even iets opschrijven · wordt vanzelf bewaard': 'Jot something down · saved automatically', 'Typ hier…': 'Type here…',
    'Je bent aan het focussen. WinLand houdt de tijd bij.': 'You are focusing. WinLand keeps the time.', 'Kies hoe lang je wil focussen': 'Choose how long you want to focus',
    'Start focus': 'Start focus', 'Stoppen': 'Stop', 'Uren': 'Hours', 'Minuten': 'Minutes', 'Seconden': 'Seconds', 'Uren meer': 'More hours', 'Uren minder': 'Fewer hours',
    'Minuten meer': 'More minutes', 'Minuten minder': 'Fewer minutes', 'Seconden meer': 'More seconds', 'Seconden minder': 'Fewer seconds', '1 uur': '1 hour',
    'Focus klaar!': 'Focus done!', 'Muziek en Claude blijven gewoon zichtbaar in het kleine eiland.': 'Music and Claude stay visible in the small island.',
    // Claude Code page
    'Volgt al je Claude Code-sessies': 'Follows all your Claude Code sessions', 'Verbind jouw gesprek': 'Connect your conversation', 'Kies jouw venster': 'Choose your window',
    'Jouw antwoord…': 'Your answer…', 'Antwoord op de vraag': 'Answer the question', 'Typ iets voor Claude…': 'Type something for Claude…', 'Of typ je eigen antwoord…': 'Or type your own answer…',
    'Bewerkt': 'Edited', 'Voert uit': 'Runs', 'Helper bezig': 'Helper working', 'Gelezen': 'Read', 'Uitgevoerd': 'Ran', 'Gezocht': 'Searched', 'Online gezocht': 'Searched online',
    'Helper klaar': 'Helper done', 'Samenvatting': 'Summary', 'Geen bestanden aangeraakt': 'No files touched', 'Nog geen gesprek': 'No conversation yet',
    'Typ iets in Claude Code. Hier zie je het gesprek live meelopen.': 'Type something in Claude Code. You will see the conversation here, live.',
    'Claude werkt. Je krijgt een seintje als hij klaar is.': "Claude is working. You'll get a ping when it's done.", 'Verder praten? Typ in je terminal.': 'Want to keep going? Type in your terminal.',
    'Kijk in de terminal wat er misging.': 'Check the terminal to see what went wrong.', 'Wat moet er anders?': 'What should change?', 'Goedkeuren': 'Approve', 'Stuur': 'Send', 'Speelt nu': 'Playing now', 'Wacht op je AI': 'Waiting for your AI', '● Vraag': '● Question', 'Log eerst in': 'Sign in first', 'Volgt dit gesprek': 'Following this chat', 'Klaar · je antwoord staat klaar': 'Done · your answer is ready', 'Het antwoord komt eraan…': 'The answer is on its way…', 'Pip meldt het als je AI klaar is of iets vraagt.': 'Pip tells you when your AI is done or asks something.', 'Koppel je AI in WinLand → Verbindingen.': 'Connect your AI in WinLand → Connections.', 'Geen actieve sessie': 'No active session', 'Je antwoord staat klaar in het gesprek.': 'Your answer is ready in the chat.', 'Open Spotify op een ander apparaat, dan zie je het hier.': 'Open Spotify on another device to see it here.', 'Deze pc': 'This PC', 'Kon je apparaten niet ophalen.': "Couldn't load your devices.", 'Dat lukte niet.': "That didn't work.", '5-uurslimiet': '5-hour limit', 'AI is bezig': 'AI is working', 'Bericht aan Claude Code': 'Message to Claude Code', 'Speel af op': 'Play on', 'Open gesprek': 'Open chat', 'Open Verbindingen': 'Open Connections', 'Koppelen in WinLand': 'Connect in WinLand', 'Codex staat nog niet op deze pc': 'Codex is not on this PC yet', 'Eén schakelaar in WinLand → Verbindingen. Daarna doet WinLand de rest.': 'One switch in WinLand → Connections. WinLand does the rest.', 'Nog geen geschikt venster gevonden. Houd een websitegesprek in een eigen venster.': 'No suitable window found yet. Keep a website chat open in its own window.', 'Naar terminal': 'To terminal',
    'Breng het Claude Code-venster naar voren': 'Bring the Claude Code window to the front', 'Welk model gebruikt Claude?': 'Which model does Claude use?',
    'Kies welk Claude-model Claude Code gebruikt': 'Choose which Claude model Claude Code uses', 'Wat Claude Code zelf kiest': 'What Claude Code picks itself',
    'Het slimst, voor moeilijke klussen': 'The smartest, for hard jobs', 'Snel en slim, voor de meeste dingen': 'Fast and smart, for most things',
    'Supersnel, voor kleine dingen': 'Super fast, for small things', 'Opus plant, Sonnet bouwt': 'Opus plans, Sonnet builds', 'Opus plan': 'Opus plan',
    'Voor nieuwe sessies · in een lopend gesprek:': 'For new sessions · in a running conversation:', 'Koppel Claude Code': 'Connect Claude Code',
    'Daarna Claude Code één keer opnieuw starten.': 'Then restart Claude Code once.', 'Gekoppeld. Even wachten tot WinLand klaar is met starten.': 'Connected. Wait a moment until WinLand has started.',
    'Houd het gesprek open in een eigen venster terwijl je verder werkt.': 'Keep the conversation open in its own window while you keep working.',
    '(kies er meer)': '(pick several)', 'In je lade': 'In your tray', 'Bezig…': 'Working…', 'Gewijzigd': 'Changed', 'WinLand volgt het vanzelf': 'WinLand follows it by itself', 'Bezig ·': 'Working ·', 'Wat wil je vinden in dit project?': 'What do you want to find in this project?',
    'Gebruik de browser of desktopapp waarin je bent ingelogd. Log in op de originele site of app. Je wachtwoord blijft bij .': 'Use the browser or desktop app where you are logged in. Log in on the original site or app. Your password stays there.',
    // demo scenes (test mode / videos)
    'Maak de knop op de homepage blauw': 'Make the button on the homepage blue', 'Maak de knop mooier': 'Make the button look nicer',
    'Ik kan de knop blauw of groen maken. Welke kleur wil je?': 'I can make the button blue or green. Which colour do you want?',
    'Klaar! De knop is nu blauw en licht op als je eroverheen gaat. Alle tests slagen.': 'Done! The button is blue now and lights up when you hover it. All tests pass.',
    'Zet de website online': 'Put the website online', 'Fix de btw-berekening': 'Fix the VAT calculation',
    'Klaar! De btw is nu 21% en wordt netjes afgerond. Alle 48 tests slagen.': 'Done! VAT is now 21% and rounds correctly. All 48 tests pass.',
    // messages in the small island
    'Au! Te veel tikken… even bijkomen 😵': 'Ouch! Too many taps… need a sec 😵', 'Ik heb honger… maak een taak af 🍪': "I'm hungry… finish a task 🍪",
    'Doe het even rustig aan.': 'Take it easy for a bit.', 'Hoi!': 'Hi!',
    // settings
    'Maak WinLand helemaal van jou': 'Make WinLand completely yours', 'Algemeen': 'General', 'Karakter': 'Character', 'Aan': 'On', 'Uit': 'Off', 'Opslaan': 'Save', 'Herstel': 'Reset',
    'Taal': 'Language', 'Taal · Language': 'Language · Langue', 'De taal van de island': 'The language of the island',
    'Testen': 'Testing', 'Testmodus': 'Test mode', 'Knoppen om alles te bekijken zonder echte Claude of muziek': 'Buttons to try everything without real Claude or music',
    '👋 Opstarten': '👋 Start up', '😴 Afsluiten': '😴 Shut down', '🟠 Claude bezig': '🟠 Claude working', '❓ Claude vraagt': '❓ Claude asks', '🟢 Claude klaar': '🟢 Claude done',
    '🔴 Claude fout': '🔴 Claude error', '🎵 Nep-muziek': '🎵 Fake music', '⏱️ Focus 1 min': '⏱️ Focus 1 min', '🧹 Alles stoppen': '🧹 Stop everything',
    'Animaties': 'Animations', 'Snelheid': 'Speed', 'Hoe snel de island opent, sluit en reageert': 'How fast the island opens, closes and reacts', 'Snel': 'Fast', 'Normaal': 'Normal',
    'Starten met Windows': 'Start with Windows', 'WinLand start vanzelf als je je pc aanzet': 'WinLand starts by itself when you turn on your PC',
    'Opnieuw starten': 'Restart', 'Sluit WinLand en start hem meteen opnieuw': 'Closes WinLand and starts it again right away', 'Herstart': 'Restart',
    'Afsluiten': 'Quit', 'WinLand afsluiten?': 'Quit WinLand?', 'Ja, afsluiten': 'Yes, quit', 'Nee': 'No', 'Sluit WinLand helemaal af. Kan ook via Pip rechtsonder bij de klok.': 'Quits WinLand completely. Also possible via Pip next to the clock.',
    'App-animaties': 'App animations', 'Pip doet een kunstje als je een app opent': 'Pip does a little trick when you open an app', 'Confetti': 'Confetti', 'Dashboard': 'Dashboard', 'Automatisaties': 'Automations', 'Telefoon': 'Phone', 'Sessies en wachtrij': 'Sessions and queue', 'Als dit, dan dat': 'When this, then that', 'Op je wifi': 'On your Wi-Fi', 'Verre': 'Glass', 'Bois': 'Wood', 'Néon': 'Neon', 'Bulles': 'Bubbles', 'Programma\'s': 'Software', 'Je programma\'s': 'Your software', 'Bij lange taken en als een focus klaar is': 'For long tasks and when a focus is done', 'Focus & meldingen': 'Focus & notifications',
    'Stoplicht-geluiden': 'Traffic-light sounds', 'Ding bij klaar, pling bij een vraag, laag bij fout': 'Ding when done, pling for a question, low for an error',
    'Windows-meldingen': 'Windows notifications', 'Melding bij klaar, vraag, focus en limiet': 'Notification for done, question, focus and limit',
    'Waarschuw bij limiet': 'Warn at limit', 'Melding als je zoveel van je 5-uurslimiet gebruikt hebt': 'Notify when you used this much of your 5-hour limit', 'Nooit': 'Never',
    'Geluidspakket': 'Sound pack', 'Hoe de stoplicht-geluiden klinken (klik om te horen)': 'How the traffic-light sounds sound (click to hear)', 'Klassiek': 'Classic',
    'Zacht': 'Soft', 'Belletjes': 'Bells', 'Kleurenblind': 'Colour-blind', 'Island': 'Island', 'Weer': 'Weather', 'Typ je stad om het weer op het homescherm te zien': 'Type your city to see the weather on the home screen',
    'Bijv. Amsterdam': 'E.g. Amsterdam', 'Agenda': 'Calendar', 'Gekoppeld: je volgende afspraak staat op het homescherm': 'Connected: your next event is on the home screen',
    'Google Agenda: Instellingen → je agenda → "Geheim adres in iCal-indeling". Plak die link hier.': 'Google Calendar: Settings → your calendar → "Secret address in iCal format". Paste that link here.',
    'Volumebalk': 'Volume bar', 'Laat het volume zien in de island als je het verandert': 'Show the volume in the island when you change it',
    'Batterij-waarschuwing': 'Battery warning', 'Laptop en Bluetooth (koptelefoon, muis) bijna leeg': 'Laptop and Bluetooth (headphones, mouse) almost empty',
    'Alles terugzetten': 'Reset everything', 'Zet al deze keuzes terug naar standaard': 'Set all these choices back to default',
    'Naam': 'Name', 'Hoe heet hij?': "What's his name?", 'Hij zegt het als hij hoi zegt': 'He says it when he says hi', 'Uiterlijk': 'Look',
    'Kleur van de ogen': 'Eye colour', 'Als er niks aan de hand is': 'When nothing is going on', 'Kleur van het lijfje': 'Body colour', 'Kies wat bij hem past': 'Pick what suits him',
    'Outfit': 'Outfit', 'Beste': 'Best', 'Geen': 'None', 'Feesthoedje': 'Party hat', 'Zonnebril': 'Sunglasses', 'Kroon': 'Crown', 'Seizoensoutfits': 'Seasonal outfits',
    'Kerstmuts, heksenhoed, oranje kroon op Koningsdag': "Santa hat, witch hat, orange crown on King's Day", 'Stoplicht-ogen': 'Traffic-light eyes',
    'Kies zelf de kleur voor elke stand. Klik het blokje voor een test.': 'Pick the colour for each state. Click the block for a test.',
    'Bezig of een vraag': 'Working or a question', 'Aangepast': 'Custom', 'Gezichtjes': 'Faces', 'Emoties bekijken': 'See emotions', 'Klik er een aan om het te zien': 'Click one to see it',
    'Blij, verdrietig, nieuwsgierig, gefocust': 'Happy, sad, curious, focused', '😊 Blij': '😊 Happy', '😍 Verliefd': '😍 In love', '😮 Verrast': '😮 Surprised',
    '🤔 Nieuwsgierig': '🤔 Curious', '🧐 Gefocust': '🧐 Focused', '😉 Knipoog': '😉 Wink', '😢 Verdrietig': '😢 Sad', '😵 Duizelig': '😵 Dizzy', '😴 Slaperig': '😴 Sleepy',
    'Gedrag · klik een blokje voor een voorbeeld': 'Behaviour · click a block for an example', 'Knipperen': 'Blinking', 'Hij knippert af en toe met zijn ogen': 'He blinks now and then',
    'Dansen op muziek': 'Dancing to music', 'Meebewegen als Spotify speelt': 'Moves along when Spotify plays', 'Slaapeffect': 'Sleep effect',
    'Hij valt in slaap als er even niks gebeurt': 'He falls asleep when nothing happens for a while', 'In slaap vallen na': 'Fall asleep after',
    'Als er niks gebeurt (Slaapeffect moet aan staan)': 'When nothing happens (Sleep effect must be on)', 'Opstartanimatie': 'Startup animation',
    'Zwaaien en "hoi" zeggen bij het opstarten': 'Wave and say "hi" at startup', 'Honger': 'Hunger', 'Hij krijgt honger als je lang geen taak afmaakt': "He gets hungry when you don't finish a task for a long time",
    'Nog niet verdiend': 'Not earned yet', 'Alle outfits verdiend': 'All outfits earned', 'Eerste taak': 'First task', 'Tien taken': 'Ten tasks', 'Vijftig taken': 'Fifty tasks',
    'Nachtuil': 'Night owl', 'Vroege vogel': 'Early bird', 'Lange adem': 'Long haul', 'Lekker bezig': 'On a roll', 'Focusmeester': 'Focus master', 'Behulpzaam': 'Helpful',
    'Verzamelaar': 'Collector', 'Mode-icoon': 'Fashion icon', 'DJ': 'DJ', 'Claude Code maakt een taak af': 'Claude Code finishes a task', 'Een taak klaar na middernacht': 'A task done after midnight',
    'Een taak klaar voor 7 uur': 'A task done before 7 am', 'Een taak van meer dan 15 minuten': 'A task of more than 15 minutes', 'De spiegel gebruikt': 'Used the mirror',
    '10 taken klaar': '10 tasks done', '50 taken klaar': '50 tasks done', '5 focusblokken afgemaakt': '5 focus blocks finished', '5 bestanden in de lade': '5 files in the tray',
    '10 keer Spotify bediend vanuit de island': 'Controlled Spotify 10 times from the island', '10 keer antwoorden vanuit de island': 'Answered 10 times from the island',
    'wolk': 'cloud', 'munt': 'mint', 'lucht': 'sky', 'roos': 'rose', 'nacht': 'night', 'blauw': 'blue', 'geel': 'yellow', 'goud': 'gold', 'paars': 'purple', 'roze': 'pink',
    'wit': 'white', 'mint': 'mint', 'klassiek': 'classic'
  };
  // French, keyed by the English text (T('nl', 'en') pairs in the other files give English in French mode too)
  const FR = {
    "Check your camera": "Vérifier ta caméra",
    "System": "Système", "Studio": "Studio", "Processor, graphics card": "Processeur, carte graphique", "Break reminder": "Rappel de pause", "A ping when you have been gaming this long": "Une notification quand tu joues depuis aussi longtemps", "1 h": "1 h", "1.5 h": "1 h 30", "2 h": "2 h", "Clipping alert": "Alerte de saturation", "Warns when your PC’s sound goes into the red, also in your DAW (Studio page)": "Te prévient quand le son de ton PC passe dans le rouge, aussi dans ton DAW (page Studio)",
    "Controls": "Contrôles", "Sound, lock": "Son, verrouillage",
    "Microphone and camera": "Micro et caméra", "A small dot on the island while an app uses your microphone (orange) or camera (green)": "Un petit point sur l’island tant qu’une app utilise ton micro (orange) ou ta caméra (vert)", "Screenshots in the tray": "Captures d’écran dans le tiroir", "A new screenshot (Win+Shift+S) goes straight into your tray, ready to drag": "Une nouvelle capture (Win+Maj+S) arrive tout de suite dans ton tiroir, prête à glisser", "Downloads": "Téléchargements", "A message and the file in your tray as soon as a download is done": "Un message et le fichier dans ton tiroir dès qu’un téléchargement est fini", "Charging": "Charge", "The percentage when you plug the charger in or out": "Le pourcentage quand tu branches ou débranches le chargeur",
    "Hide behind big windows": "Se cacher derrière les grandes fenêtres", "With a maximized or full-screen window, the island only comes out when you move the mouse to the top": "Quand une fenêtre est agrandie ou en plein écran, l’island n’apparaît que si tu amènes la souris tout en haut", "Discreet in a game": "Discrète pendant un jeu", "Hides the island completely and mutes its sounds and notifications while a game fills the screen": "Cache complètement l’island et coupe ses sons et notifications tant qu’un jeu remplit l’écran",
    "Tell me when a dev program finishes": "Prévenir quand un programme de dev se termine", "bun, node, python, cargo, dotnet… that ran longer than 10 seconds (Dev page)": "bun, node, python, cargo, dotnet… qui a tourné plus de 10 secondes (page Dev)", "Claude Code and Dev (Git, servers) on the home screen, a ping when a build finishes, warning at 80% of the limit": "Claude Code et Dev (Git, serveurs) sur l’accueil, alerte quand un build se termine, alerte à 80 % de la limite",
    "Profile": "Profil", "Custom": "Personnalisé", "Office": "Bureautique", "Development": "Développement", "Gaming": "Gaming", "Music production": "Création musicale", "You choose everything yourself, below": "Tu choisis tout toi-même, ci-dessous", "Note, clipboard and focus up front. Calm: no confetti, hidden during a presentation": "Note, presse-papiers et focus en avant. Calme : pas de confettis, cachée pendant une présentation", "Claude Code big on the home screen, Pip chat and clipboard at hand, warning at 80% of the limit": "Claude Code en grand sur l’accueil, chat Pip et presse-papiers sous la main, alerte à 80 % de la limite", "Music up front, no sounds or notifications, and the island hides when a game fills the screen": "Musique en avant, ni sons ni notifications, et l’island se cache quand un jeu remplit l’écran", "Music and tray up front (drop your samples in). No sounds of its own to disturb your mix": "Musique et tiroir en avant (glisses-y tes samples). Aucun son de l’island pour ne pas gêner ton mix", "Discreet in full screen": "Discrète en plein écran", "Hides the island and mutes its sounds and notifications while a game, video or presentation fills the screen": "Cache l’island et coupe ses sons et notifications tant qu’un jeu, une vidéo ou une présentation remplit l’écran",
    "This player does not allow seeking": "Ce lecteur ne permet pas d’avancer dans le morceau",
    "Working, a question, done or an error: WinLand shows it, even when you drive Claude Code from your phone.": "En cours, une question, terminé ou une erreur : WinLand te le montre, même quand tu pilotes Claude Code depuis ton téléphone.", "Working, a question, done or an error: WinLand shows it while you do something else.": "En cours, une question, terminé ou une erreur : WinLand te le montre pendant que tu fais autre chose.", "Install Codex (the OpenAI coding assistant) and open it once. Then come back here to connect it.": "Installe Codex (l’assistant de code d’OpenAI) et ouvre-le une fois. Reviens ensuite ici pour le connecter.",
    "The conversation can no longer be read. Keep it open, restore the window if it is minimized, or connect again.": "La conversation n’est plus lisible. Garde-la ouverte, restaure la fenêtre si elle est réduite, ou reconnecte-toi.", "Open the conversation to check what is going on.": "Ouvre la conversation pour vérifier ce qui se passe.", "Clear all": "Tout effacer", "WinLand sound": "Son de WinLand", "Click again to quit": "Clique encore pour quitter", "Title, then your lines…": "Un titre, puis tes lignes…", "The project could not be loaded.": "Impossible de charger le projet.", "The project chat could not be loaded.": "Impossible de charger la discussion du projet.", "✓ Analysis done": "✓ Analyse terminée", "Choose folder": "Choisir un dossier", "What do you want to change?": "Que veux-tu changer ?", "Link your project folder": "Relie ton dossier de projet", "Describe your idea. WinLand picks the right files, opens them in VS Code and carries out your request.": "Décris ton idée. WinLand choisit les bons fichiers, les ouvre dans VS Code et exécute ta demande.", "Choose one local folder. Then you talk to WinLand about the whole project.": "Choisis un dossier local. Ensuite tu parles à WinLand de tout le projet.", "The AI settings could not be saved.": "Impossible d’enregistrer les réglages IA.", "This request failed.": "Cette demande a échoué.", "Connected to ChatGPT": "Connecté à ChatGPT", "Use your ChatGPT account": "Utilise ton compte ChatGPT", "Sign in on the official page in your browser and pick your workspace.": "Connecte-toi sur la page officielle dans ton navigateur et choisis ton espace de travail.", "Sign in with ChatGPT": "Se connecter avec ChatGPT", "Your key is stored safely.": "Ta clé est enregistrée en sécurité.", "Use your own key. Usage goes through your API account.": "Utilise ta propre clé. La consommation passe par ton compte API.", "Through your WinLand account": "Via ton compte WinLand", "Your own API key": "Ta propre clé API", "ChatGPT is connected. You can go back to Project.": "ChatGPT est connecté. Tu peux revenir au Projet.", "You are signed out.": "Tu es déconnecté.", "Enter a key first.": "Saisis d’abord une clé.", "The project could not be opened.": "Impossible d’ouvrir le projet.", "The project could not be scanned again.": "Impossible de réanalyser le projet.", "Type what you want to find first.": "Tape d’abord ce que tu veux chercher.", "I did not find relevant code for this yet.": "Je n’ai pas encore trouvé de code utile pour ça.", "Searching the project failed.": "La recherche dans le projet a échoué.", "The file could not be read.": "Impossible de lire le fichier.", "No project chosen yet": "Aucun projet choisi", "Choose project folder": "Choisir le dossier du projet", "This was read straight from your local project.": "Lu directement depuis ton projet local.", "No music playing": "Aucune musique en cours", "The AI interface comes here.": "L’interface IA arrive ici.",
    "Mirror": "Miroir", "Clear all": "Tout effacer", "Home": "Accueil", "Title, then your lines…": "Un titre, puis tes lignes…",
    "Working": "En cours", "Sending": "Envoi", "Question": "Question", "Error": "Erreur",
    "Stopped": "Arrêté", "Unavailable": "Indisponible", "Done": "Terminé", "Connecting": "Connexion",
    "Not connected": "Non connecté", "Log in": "Se connecter", "Idle": "Au repos", "idle": "au repos",
    "Waiting for you": "T'attend", "● Waiting for you": "● T'attend", "✓ Done": "✓ Terminé", "✕ Stopped with an error": "✕ Arrêté avec une erreur",
    "Waiting for Claude Code": "En attente de Claude Code", "Claude is working": "Claude travaille", "Claude working": "Claude travaille", "Needs permission": "Demande l'autorisation",
    "Plan ready": "Plan prêt", "Has a question for you": "A une question pour toi", "Claude has a question for you": "Claude a une question pour toi", "Claude Code needs you.": "Claude Code a besoin de toi.",
    "Claude needs you in the terminal.": "Claude a besoin de toi dans le terminal.", "Allowed, continuing": "Autorisé, ça continue", "Denied": "Refusé", "Seen": "Vu",
    "Not active": "Inactif", "Not connected yet": "Pas encore connecté", "Your answer was sent": "Ta réponse a été envoyée", "Claude is overloaded": "Claude est surchargé",
    "not logged in": "non connecté", "answer too long": "réponse trop longue", "Running a command": "Lance une commande", "Searching the code": "Cherche dans le code",
    "Searching the web": "Cherche sur internet", "Starting a helper": "Lance un assistant", "Claude asks something": "Claude demande quelque chose", "Plan ready: approve?": "Plan prêt : approuver ?",
    "Something went wrong": "Un problème est survenu", "Error: limit reached": "Erreur : limite atteinte", "Allow": "Autoriser", "Deny": "Refuser",
    "View": "Voir", "May I do this?": "Je peux faire ça ?", "Apps": "Apps", "Widgets": "Widgets",
    "Tray": "Tiroir", "Clipboard": "Presse-papiers", "Note": "Note", "Settings": "Paramètres",
    "Clock": "Horloge", "Music": "Musique", "Devices": "Appareils", "🔇 Sound off": "🔇 Son coupé",
    "Empty": "Vide", "Write it down": "Note-le", "Last copies": "Dernières copies", "Colours, sound": "Couleurs, son",
    "Colours, sound and more": "Couleurs, son et plus", "Your last copies": "Tes dernières copies", "Jot something down": "Note quelque chose vite fait", "Nothing playing": "Rien en lecture",
    "opens WinLand anywhere": "ouvre WinLand partout", "TIP": "ASTUCE", "Everything WinLand can do · Ctrl+Alt+1–6 = shortcut": "Tout ce que WinLand peut faire · Ctrl+Alt+1–6 = raccourci", "Drag to move  ·  + for new widgets": "Glisse pour déplacer  ·  + pour de nouveaux widgets",
    "Pick an app and a size, or a ready-made layout": "Choisis une app et une taille, ou une disposition toute prête", "Default": "Par défaut", "8 small": "8 petits", "2 big": "2 grands",
    "4 wide": "4 larges", "Small": "Petit", "Wide": "Large", "Big": "Grand",
    "Already there": "Déjà là", "No room": "Pas de place", "Add": "Ajouter", "Make small": "Rendre petit",
    "Make wide": "Rendre large", "Make big": "Rendre grand", "Remove something or make it smaller first": "Retire quelque chose ou rends-le plus petit d'abord", "No room to make it bigger": "Pas de place pour l'agrandir",
    "Focus running": "Focus en cours", "Stay focused": "Reste concentré", "Stay focused, Pip is watching": "Reste concentré, Pip surveille", "Ready to start": "Prêt à démarrer",
    "Tap to write something down": "Touche pour écrire quelque chose", "Copy something and it shows up here": "Copie quelque chose et ça apparaît ici", "Shortcuts": "Raccourcis", "Your favourite apps": "Tes apps préférées",
    "Edit": "Modifier", "+ Empty spot": "+ Emplacement vide", "Tip: Ctrl + Alt + 1–6 also opens apps from the keyboard": "Astuce : Ctrl + Alt + 1–6 ouvre aussi les apps au clavier", "Max 4 · remove one first": "Max 4 · retires-en une d'abord",
    "Pick up to 4 apps · they are on your home screen too": "Choisis jusqu'à 4 apps · elles sont aussi sur ton écran d'accueil", "Nothing is playing": "Rien ne joue en ce moment", "Start music in Spotify, or press play.": "Lance de la musique dans ton app, ou appuie sur lecture.", "Connect Spotify": "Connecter ta musique",
    "Then you see and control your music here.": "Tu verras et contrôleras ta musique ici.", "⏭  Next song": "⏭  Morceau suivant", "⏮  Previous song": "⏮  Morceau précédent", "Let go, I'll catch it!": "Lâche, je l'attrape !",
    "🧺 Let go, I'll catch it!": "🧺 Lâche, je l'attrape !", "The file goes into your tray": "Le fichier va dans ton tiroir", "Drag a file out, or click to open it": "Glisse un fichier dehors, ou clique pour l'ouvrir", "Drop files on the island to keep them for a bit": "Dépose des fichiers sur l'island pour les garder un moment",
    "Drop a file here to add it": "Dépose un fichier ici pour l'ajouter", "Drop a file on the island to keep it for a bit": "Dépose un fichier sur l'island pour le garder un moment", "Take out of the tray": "Retirer du tiroir", "Drag a card out, or click to open it": "Glisse une carte dehors, ou clique pour l'ouvrir",
    "Keep files for a bit, and drag them out later": "Garde des fichiers un moment, et glisse-les dehors plus tard", "A quick check before your video call · the camera stops when you leave": "Un petit coup d'œil avant ton appel vidéo · la caméra s'arrête quand tu pars", "No camera found, or Windows gives no access (Settings → Privacy → Camera).": "Aucune caméra trouvée, ou Windows refuse l'accès (Paramètres → Confidentialité → Caméra).", "Click a card to copy it again": "Clique sur une carte pour la recopier",
    "Drop here": "Dépose ici", "Clear history": "Effacer l'historique", "Your tray is empty": "Ton tiroir est vide", "Drop a file on WinLand to keep it for a bit": "Dépose un fichier sur WinLand pour le garder un moment",
    "Your last copied text · click to copy again": "Ton dernier texte copié · clique pour le recopier", "Clear": "Effacer", "Copied ✓": "Copié ✓", "Nothing copied yet": "Rien de copié pour l'instant",
    "Copy something (Ctrl + C) and it shows up here.": "Copie quelque chose (Ctrl + C) et ça apparaît ici.", "Jot something down · saved automatically": "Note quelque chose · enregistré automatiquement", "Type here…": "Écris ici…", "You are focusing. WinLand keeps the time.": "Tu es concentré. WinLand garde le temps.",
    "Choose how long you want to focus": "Choisis combien de temps tu veux te concentrer", "Start focus": "Lancer le focus", "Stop": "Arrêter", "Hours": "Heures",
    "Minutes": "Minutes", "Seconds": "Secondes", "More hours": "Plus d'heures", "Fewer hours": "Moins d'heures",
    "More minutes": "Plus de minutes", "Fewer minutes": "Moins de minutes", "More seconds": "Plus de secondes", "Fewer seconds": "Moins de secondes",
    "1 hour": "1 heure", "Focus done!": "Focus terminé !", "Music and Claude stay visible in the small island.": "La musique et Claude restent visibles dans la petite island.", "Follows all your Claude Code sessions": "Suit toutes tes sessions Claude Code",
    "Connect your conversation": "Connecter ta conversation", "Choose your window": "Choisir ta fenêtre", "Your answer…": "Ta réponse…", "Answer the question": "Répondre à la question",
    "Type something for Claude…": "Écris quelque chose pour Claude…", "Or type your own answer…": "Ou écris ta propre réponse…", "Edited": "Modifié", "Runs": "Lance",
    "Helper working": "Assistant au travail", "Read": "Lu", "Ran": "Lancé", "Searched": "Cherché",
    "Searched online": "Cherché en ligne", "Helper done": "Assistant terminé", "Summary": "Résumé", "No files touched": "Aucun fichier touché",
    "No conversation yet": "Pas encore de conversation", "Type something in Claude Code. You will see the conversation here, live.": "Écris quelque chose dans Claude Code. Tu verras la conversation ici, en direct.", "Claude is working. You'll get a ping when it's done.": "Claude travaille. Tu seras prévenu quand c'est fini.", "Want to keep going? Type in your terminal.": "Tu veux continuer ? Écris dans ton terminal.",
    "Check the terminal to see what went wrong.": "Regarde dans le terminal ce qui n'a pas marché.", "What should change?": "Qu'est-ce qu'il faut changer ?", "Approve": "Approuver", "Send": "Envoyer",
    "Playing now": "En lecture", "Waiting for your AI": "En attente de ton IA", "● Question": "● Question", "Sign in first": "Connecte-toi d'abord",
    "Following this chat": "Suit cette conversation", "Done · your answer is ready": "Terminé · ta réponse est prête", "The answer is on its way…": "La réponse arrive…", "Pip tells you when your AI is done or asks something.": "Pip te prévient quand ton IA a fini ou te demande quelque chose.",
    "Connect your AI in WinLand → Connections.": "Connecte ton IA dans WinLand → Connexions.", "No active session": "Aucune session active", "Your answer is ready in the chat.": "Ta réponse est prête dans la conversation.", "Open Spotify on another device to see it here.": "Ouvre Spotify sur un autre appareil pour le voir ici.",
    "This PC": "Ce PC", "Couldn't load your devices.": "Impossible de charger tes appareils.", "That didn't work.": "Ça n'a pas marché.", "5-hour limit": "Limite de 5 heures",
    "AI is working": "L'IA travaille", "Message to Claude Code": "Message à Claude Code", "Play on": "Lire sur", "Open chat": "Ouvrir la conversation",
    "Open Connections": "Ouvrir Connexions", "Connect in WinLand": "Connecter dans WinLand", "Codex is not on this PC yet": "Codex n'est pas encore sur ce PC", "One switch in WinLand → Connections. WinLand does the rest.": "Un seul interrupteur dans WinLand → Connexions. WinLand fait le reste.",
    "No suitable window found yet. Keep a website chat open in its own window.": "Aucune fenêtre adaptée trouvée. Garde une conversation web ouverte dans sa propre fenêtre.", "To terminal": "Vers le terminal", "Bring the Claude Code window to the front": "Mettre la fenêtre de Claude Code au premier plan", "Which model does Claude use?": "Quel modèle Claude utilise ?",
    "Choose which Claude model Claude Code uses": "Choisis le modèle que Claude Code utilise", "What Claude Code picks itself": "Ce que Claude Code choisit lui-même", "The smartest, for hard jobs": "Le plus intelligent, pour les tâches difficiles", "Fast and smart, for most things": "Rapide et intelligent, pour la plupart des choses",
    "Super fast, for small things": "Ultra rapide, pour les petites choses", "Opus plans, Sonnet builds": "Opus planifie, Sonnet construit", "Opus plan": "Plan Opus", "For new sessions · in a running conversation:": "Pour les nouvelles sessions · dans une conversation en cours :",
    "Connect Claude Code": "Connecter Claude Code", "Then restart Claude Code once.": "Puis redémarre Claude Code une fois.", "Connected. Wait a moment until WinLand has started.": "Connecté. Attends un instant que WinLand ait démarré.", "Keep the conversation open in its own window while you keep working.": "Garde la conversation ouverte dans sa propre fenêtre pendant que tu travailles.",
    "(pick several)": "(plusieurs choix)", "In your tray": "Dans ton tiroir", "Working…": "En cours…", "Changed": "Modifié",
    "WinLand follows it by itself": "WinLand le suit tout seul", "Working ·": "En cours ·", "What do you want to find in this project?": "Que veux-tu trouver dans ce projet ?", "Use the browser or desktop app where you are logged in. Log in on the original site or app. Your password stays there.": "Utilise le navigateur ou l'app où tu es connecté. Connecte-toi sur le site ou l'app d'origine. Ton mot de passe reste là-bas.",
    "Make the button on the homepage blue": "Rends le bouton de la page d'accueil bleu", "Make the button look nicer": "Rends le bouton plus joli", "I can make the button blue or green. Which colour do you want?": "Je peux rendre le bouton bleu ou vert. Quelle couleur veux-tu ?", "Done! The button is blue now and lights up when you hover it. All tests pass.": "Terminé ! Le bouton est bleu et s'allume au survol. Tous les tests passent.",
    "Put the website online": "Mets le site en ligne", "Fix the VAT calculation": "Corrige le calcul de la TVA", "Done! VAT is now 21% and rounds correctly. All 48 tests pass.": "Terminé ! La TVA est à 20 % et s'arrondit correctement. Les 48 tests passent.", "Ouch! Too many taps… need a sec 😵": "Aïe ! Trop de tapes… une seconde 😵",
    "I'm hungry… finish a task 🍪": "J'ai faim… termine une tâche 🍪", "Take it easy for a bit.": "Doucement un peu.", "Hi!": "Salut !", "Make WinLand completely yours": "Fais de WinLand le tien",
    "General": "Général", "Character": "Personnage", "On": "Activé", "Off": "Désactivé",
    "Save": "Enregistrer", "Reset": "Réinitialiser", "Language": "Langue", "Language · Taal": "Langue · Language",
    "The language of the island": "La langue de l'island", "Testing": "Tests", "Test mode": "Mode test", "Buttons to try everything without real Claude or music": "Des boutons pour tout essayer sans vrai Claude ni musique",
    "👋 Start up": "👋 Démarrage", "😴 Shut down": "😴 Arrêt", "🟠 Claude working": "🟠 Claude travaille", "❓ Claude asks": "❓ Claude demande",
    "🟢 Claude done": "🟢 Claude a fini", "🔴 Claude error": "🔴 Erreur de Claude", "🎵 Fake music": "🎵 Fausse musique", "⏱️ Focus 1 min": "⏱️ Focus 1 min",
    "🧹 Stop everything": "🧹 Tout arrêter", "Animations": "Animations", "Speed": "Vitesse", "How fast the island opens, closes and reacts": "La vitesse à laquelle l'island s'ouvre, se ferme et réagit",
    "Fast": "Rapide", "Normal": "Normale", "Start with Windows": "Démarrer avec Windows", "WinLand starts by itself when you turn on your PC": "WinLand se lance tout seul quand tu allumes ton PC",
    "Restart": "Redémarrer", "Closes WinLand and starts it again right away": "Ferme WinLand et le relance tout de suite", "Quit": "Quitter", "Quit WinLand?": "Quitter WinLand ?",
    "Yes, quit": "Oui, quitter", "No": "Non", "Quits WinLand completely. Also possible via Pip next to the clock.": "Ferme complètement WinLand. Aussi possible via Pip à côté de l'horloge.", "App animations": "Animations des apps",
    "Pip does a little trick when you open an app": "Pip fait un petit tour quand tu ouvres une app", "Confetti": "Confettis", "Dashboard": "Tableau de bord", "Automations": "Automatisations", "Phone": "Téléphone", "Sessions and queue": "Sessions et file", "When this, then that": "Quand ceci, alors cela", "On your Wi-Fi": "Sur ton Wi-Fi", "Notifications in the island": "Notifications dans l’island", "Discord, Outlook, Teams… show up in the island instead of the corner of the screen": "Discord, Outlook, Teams… s’affichent dans l’island au lieu du coin de l’écran", "Microphone button": "Bouton micro", "During a call: cut the microphone of the whole PC in one click (or Ctrl+Alt+M), with a red dot while it is off": "Pendant un appel : coupe le micro de tout le PC en un clic (ou Ctrl+Alt+M), avec un point rouge tant qu’il est coupé", "Text of screenshots": "Texte des captures", "The text in a new screenshot goes to the clipboard (Windows reads it on this PC)": "Le texte d’une nouvelle capture va dans le presse-papiers (Windows le lit sur ce PC)", "Smart clipboard": "Presse-papiers intelligent", "Suggests an action for what you copy: tidy JSON, see a colour, open a path, ask Pip about an error": "Propose une action pour ce que tu copies : ranger du JSON, voir une couleur, ouvrir un chemin, demander à Pip pour une erreur", "Island on the screen of your mouse": "Island sur l’écran de ta souris", "With several screens, the island follows your mouse": "Avec plusieurs écrans, l’island suit ta souris", "Pip takes care of you": "Pip prend soin de toi", "Rest your eyes": "Repose tes yeux", "Every 20 minutes: look far away for 20 seconds": "Toutes les 20 minutes : regarde au loin pendant 20 secondes", "Drink water": "Bois de l’eau", "A little reminder every 90 minutes": "Un petit rappel toutes les 90 minutes", "Sleepy Pip": "Pip a sommeil", "Pip on the desktop": "Pip sur le bureau", "Pip leaves the island and walks on your screen: on the taskbar and on the window in front. Click him to bring him back": "Pip sort de l’island et se balade sur ton écran : sur la barre des tâches et sur la fenêtre devant. Clique dessus pour le faire rentrer", "In the late evening Pip yawns and tells you it is late": "Tard le soir, Pip bâille et te dit qu’il est tard", "Glass": "Verre", "Wood": "Bois", "Neon": "Néon", "Bubbles": "Bulles", "Software": "Logiciels", "Your software": "Tes logiciels", "For long tasks and when a focus is done": "Pour les longues tâches et quand un focus est fini", "Focus & notifications": "Focus et notifications",
    "Traffic-light sounds": "Sons du feu tricolore", "Ding when done, pling for a question, low for an error": "Ding quand c'est fini, pling pour une question, grave pour une erreur", "Windows notifications": "Notifications Windows", "Notification for done, question, focus and limit": "Notification quand c'est fini, pour une question, le focus et la limite",
    "Warn at limit": "Prévenir à la limite", "Notify when you used this much of your 5-hour limit": "Notifie quand tu as utilisé autant de ta limite de 5 heures", "Never": "Jamais", "Sound pack": "Pack de sons",
    "How the traffic-light sounds sound (click to hear)": "Le son du feu tricolore (clique pour écouter)", "Classic": "Classique", "Soft": "Doux", "Bells": "Clochettes",
    "Colour-blind": "Daltonien", "Island": "Island", "Weather": "Météo", "Type your city to see the weather on the home screen": "Tape ta ville pour voir la météo sur l'écran d'accueil",
    "E.g. Amsterdam": "Ex. Paris", "Calendar": "Agenda", "Connected: your next event is on the home screen": "Connecté : ton prochain rendez-vous est sur l'écran d'accueil", "Google Calendar: Settings → your calendar → \"Secret address in iCal format\". Paste that link here.": "Google Agenda : Paramètres → ton agenda → « Adresse secrète au format iCal ». Colle ce lien ici.",
    "Volume bar": "Barre de volume", "Show the volume in the island when you change it": "Affiche le volume dans l'island quand tu le changes", "Battery warning": "Alerte batterie", "Laptop and Bluetooth (headphones, mouse) almost empty": "Portable et Bluetooth (casque, souris) presque vides",
    "Reset everything": "Tout réinitialiser", "Set all these choices back to default": "Remet tous ces choix par défaut", "Name": "Nom", "What's his name?": "Comment il s'appelle ?",
    "He says it when he says hi": "Il le dit quand il dit bonjour", "Look": "Apparence", "Eye colour": "Couleur des yeux", "When nothing is going on": "Quand il ne se passe rien",
    "Body colour": "Couleur du corps", "Pick what suits him": "Choisis ce qui lui va", "Outfit": "Tenue", "Best": "La meilleure",
    "None": "Aucune", "Party hat": "Chapeau de fête", "Sunglasses": "Lunettes de soleil", "Crown": "Couronne",
    "Seasonal outfits": "Tenues de saison", "Santa hat, witch hat, orange crown on King's Day": "Bonnet de Noël, chapeau de sorcière, couronne orange le jour du Roi", "Traffic-light eyes": "Yeux feu tricolore", "Pick the colour for each state. Click the block for a test.": "Choisis la couleur de chaque état. Clique sur le bloc pour tester.",
    "Working or a question": "En cours ou une question", "Custom": "Personnalisé", "Faces": "Visages", "See emotions": "Voir les émotions",
    "Click one to see it": "Clique sur une pour la voir", "Happy, sad, curious, focused": "Content, triste, curieux, concentré", "😊 Happy": "😊 Content", "😍 In love": "😍 Amoureux",
    "😮 Surprised": "😮 Surpris", "🤔 Curious": "🤔 Curieux", "🧐 Focused": "🧐 Concentré", "😉 Wink": "😉 Clin d'œil",
    "😢 Sad": "😢 Triste", "😵 Dizzy": "😵 Étourdi", "😴 Sleepy": "😴 Endormi", "Behaviour · click a block for an example": "Comportement · clique sur un bloc pour un exemple",
    "Blinking": "Clignement", "He blinks now and then": "Il cligne des yeux de temps en temps", "Dancing to music": "Danser sur la musique", "Moves along when Spotify plays": "Bouge quand de la musique joue",
    "Sleep effect": "Effet sommeil", "He falls asleep when nothing happens for a while": "Il s'endort quand rien ne se passe pendant un moment", "Fall asleep after": "S'endormir après", "When nothing happens (Sleep effect must be on)": "Quand rien ne se passe (l'effet sommeil doit être activé)",
    "Startup animation": "Animation de démarrage", "Wave and say \"hi\" at startup": "Faire coucou et dire « salut » au démarrage", "Hunger": "Faim", "He gets hungry when you don't finish a task for a long time": "Il a faim quand tu ne termines pas de tâche pendant longtemps",
    "Not earned yet": "Pas encore gagné", "All outfits earned": "Toutes les tenues gagnées", "First task": "Première tâche", "Ten tasks": "Dix tâches",
    "Fifty tasks": "Cinquante tâches", "Night owl": "Oiseau de nuit", "Early bird": "Lève-tôt", "Long haul": "Longue haleine",
    "On a roll": "Sur sa lancée", "Focus master": "Maître du focus", "Helpful": "Serviable", "Collector": "Collectionneur",
    "Fashion icon": "Icône de mode", "DJ": "DJ", "Claude Code finishes a task": "Claude Code termine une tâche", "A task done after midnight": "Une tâche terminée après minuit",
    "A task done before 7 am": "Une tâche terminée avant 7 h", "A task of more than 15 minutes": "Une tâche de plus de 15 minutes", "Used the mirror": "A utilisé le miroir", "10 tasks done": "10 tâches terminées",
    "50 tasks done": "50 tâches terminées", "5 focus blocks finished": "5 sessions de focus terminées", "5 files in the tray": "5 fichiers dans le tiroir", "Controlled Spotify 10 times from the island": "A contrôlé la musique 10 fois depuis l'island",
    "Answered 10 times from the island": "A répondu 10 fois depuis l'island", "cloud": "nuage", "mint": "menthe", "sky": "ciel",
    "rose": "rose", "night": "nuit", "blue": "bleu", "yellow": "jaune",
    "gold": "or", "purple": "violet", "pink": "rose vif", "white": "blanc",
    "classic": "classique", "being edited": "en cours de modification", "Running…": "En cours…", "May I?": "Je peux ?",
    "Claude wants to do something": "Claude veut faire quelque chose", "Claude has a plan": "Claude a un plan", "What should change? (optional)": "Qu'est-ce qu'il faut changer ? (facultatif)", "Change it": "Modifier",
    "Thinking": "Réfléchit", "Reading code": "Lit le code", "Making changes": "Fait des changements", "Running tests": "Lance les tests",
    "Recently": "Récemment", "Your turn": "À toi", "Claude is waiting for you": "Claude t'attend", "Done · every step": "Terminé · toutes les étapes",
    "Done. The answer is in the terminal.": "Terminé. La réponse est dans le terminal.", "Claude is thinking…": "Claude réfléchit…", "Test": "Test", "Send (Enter)": "Envoyer (Entrée)",
    "Bring the terminal to the front": "Mettre le terminal au premier plan", "pick one or more": "choisis-en une ou plusieurs", "Claude asks": "Claude demande", "Reading": "Lit",
    "Editing": "Modifie", "Last": "Dernier", "Connect": "Connecter", "in Settings": "dans les Paramètres",
    "Claude is waiting": "Claude attend", "Every step done": "Toutes les étapes terminées", "Quiet": "Calme", "Connect your music": "Connecte ta musique",
    "paused": "en pause", "Focus": "Focus", "Quick buttons": "Boutons rapides", "Tip: Ctrl + Alt + 1–6 opens apps with your keyboard too": "Astuce : Ctrl + Alt + 1–6 ouvre aussi les apps au clavier",
    "Max 4 · take one off first": "Max 4 · enlèves-en une d'abord", "Drop files here": "Dépose des fichiers ici", "Let go, I will catch it!": "Lâche, je l'attrape !", "Drag them out any time · click to open": "Glisse-les dehors quand tu veux · clique pour ouvrir",
    "Pip lets you know when time is up": "Pip te prévient quand le temps est écoulé", "hr": "h", "Done at ": "Fini à", "done at ": "fini à",
    "now": "maintenant", " h": " h", "Saved at ": "Enregistré à", "Saved by itself": "Enregistré tout seul",
    "Click to type": "Clique pour écrire", "[ ] makes a check circle": "[ ] crée une case à cocher", "Theme": "Thème", "Dark or light, for the island and the settings": "Sombre ou clair, pour l'island et les paramètres",
    "Dark": "Sombre", "Light": "Clair", "Start music in your music app, or press play.": "Lance de la musique dans ton app, ou appuie sur lecture.", "Moves along when music plays": "Bouge quand de la musique joue",
    "Language · Langue": "Langue · Language",
  };
  // [Dutch pattern, English, French]
  const PATTERNS = [
    // Claude Code / Codex page (a name in the middle)
    [/^Zie meteen wat (.+) doet$/, "See right away what $1 is doing", "Vois tout de suite ce que fait $1"], [/^Volgt al je (.+)-sessies$/, "Follows all your $1 sessions", "Suit toutes tes sessions $1"], [/^Volg (.+) met Pip$/, "Follow $1 with Pip", "Suis $1 avec Pip"], [/^(.+) komt binnenkort$/, "$1 is coming soon", "$1 arrive bientôt"], [/^Zet (.+) aan in WinLand → Verbindingen\. WinLand zoekt je gesprek zelf; je hoeft geen venster te kiezen\.$/, "Turn on $1 in WinLand → Connections. WinLand finds your conversation by itself; no window to pick.", "Active $1 dans WinLand → Connexions. WinLand trouve ta conversation tout seul : pas de fenêtre à choisir."], [/^Straks volgt Pip je (.+)-gesprekken met de WinLand-extensie voor Chrome\. Nu volgt hij Claude Code en Codex\.$/, "Soon Pip follows your $1 chats with the WinLand extension for Chrome. For now he follows Claude Code and Codex.", "Bientôt, Pip suivra tes conversations $1 avec l’extension WinLand pour Chrome. Pour l’instant, il suit Claude Code et Codex."], [/^Open (.+) in je browser of desktopapp en log daar in\. Laat het gesprek open in een eigen venster\. Kies daarna dat venster\.$/, "Open $1 in your browser or desktop app and sign in there. Keep the conversation open in its own window. Then pick that window.", "Ouvre $1 dans ton navigateur ou son app et connecte-toi. Garde la conversation ouverte dans sa propre fenêtre. Choisis ensuite cette fenêtre."],
    [/^Mag ik: (.+)\?$/, 'Allow: $1?', 'Autoriser : $1 ?'], [/^(\d+) bestanden…$/, '$1 files…', '$1 fichiers…'], [/^Limiet (\d+)%$/, 'Limit $1%', 'Limite $1 %'], [/^5-uurslimiet$/, '5-hour limit', 'Limite de 5 heures'],
    [/^Leest (een bestand)$/, 'Reading a file', 'Lit un fichier'], [/^Leest (.+)$/, 'Reading $1', 'Lit $1'], [/^Bewerkt (een bestand)$/, 'Editing a file', 'Modifie un fichier'], [/^Bewerkt (.+)$/, 'Editing $1', 'Modifie $1'], [/^Gebruikt (.+)$/, 'Using $1', 'Utilise $1'],
    [/^Nog (\d.*)$/, '$1 left', 'Encore $1'], [/^(\d+) min$/, '$1 min', '$1 min'], [/^(\d+) bestand$/, '$1 file', '$1 fichier'], [/^(\d+) bestanden$/, '$1 files', '$1 fichiers'],
    [/^(\d+) bestand bewerkt$/, '$1 file edited', '$1 fichier modifié'], [/^(\d+) bestanden bewerkt$/, '$1 files edited', '$1 fichiers modifiés'], [/^(\d+) bestand gelezen$/, '$1 file read', '$1 fichier lu'], [/^(\d+) bestanden gelezen$/, '$1 files read', '$1 fichiers lus'],
    [/^(\d+) keer gezocht$/, 'searched $1 times', '$1 recherches'], [/^(\d+) opdracht$/, '$1 command', '$1 commande'], [/^(\d+) opdrachten$/, '$1 commands', '$1 commandes'], [/^(\d+) sessies$/, '$1 sessions', '$1 sessions'],
    [/^(\d+)\/(\d+) gekozen$/, '$1/$2 picked', '$1/$2 choisies'], [/^Vol \((\d+)\/(\d+)\) · klik er een uit om te wisselen$/, 'Full ($1/$2) · click one off to swap', 'Plein ($1/$2) · retires-en une pour changer'],
    [/^(\d+) taken klaar$/, '$1 tasks done', '$1 tâches terminées'], [/^(\d+) taken klaar\. Verdien meer door taken af te ronden\.$/, '$1 tasks done. Earn more by finishing tasks.', '$1 tâches terminées. Gagnes-en plus en terminant des tâches.'],
    [/^Prestaties · (\d+)\/(\d+)$/, 'Achievements · $1/$2', 'Succès · $1/$2'], [/^(.+) is (\d+)% vol\. Elke taak geeft eten 🍪$/, '$1 is $2% full. Every task gives food 🍪', '$1 est rassasié à $2 %. Chaque tâche le nourrit 🍪'],
    [/^Klaar om (.+)$/, 'Done at $1', 'Fini à $1'], [/^van (.+)$/, 'of $1', 'sur $1'], [/^Nu: (.+)$/, 'Now: $1', 'Maintenant : $1'], [/^Nu in gebruik: (.+)$/, 'In use now: $1', 'Utilisé maintenant : $1'],
    [/^Haal (.+) uit de lade$/, 'Remove $1 from the tray', 'Retirer $1 du tiroir'], [/^(\d+) taken klaar: je hebt een (.+) verdiend\.$/, '$1 tasks done: you earned a $2.', '$1 tâches terminées : tu as gagné : $2.'],
    [/^(.+) gefocust\. Neem even pauze\.$/, '$1 focused. Take a short break.', '$1 de focus. Fais une petite pause.'], [/^Je hebt (\d+)% van je Claude-limiet gebruikt$/, "You've used $1% of your Claude limit", 'Tu as utilisé $1 % de ta limite Claude'],
    [/^Om (.+) is hij weer vol\.$/, "It's full again at $1.", 'Elle se recharge à $1.'], [/^Speelt op (.+)$/, 'Playing on $1', 'Joue sur $1'], [/^Wisselen naar (.+)…$/, 'Switching to $1…', 'Passage à $1…'],
    [/^Stel je vraag in (.+)\. Pip kijkt mee\.$/, 'Ask your question in $1. Pip is watching.', 'Pose ta question dans $1. Pip regarde.'], [/^(.+) vraagt iets$/, '$1 asks something', '$1 demande quelque chose'], [/^(.+) schrijft…$/, '$1 is writing…', '$1 écrit…'],
    [/^(\d+) bezig$/, '$1 working', '$1 en cours'], [/^(\d+) wachten op jou$/, '$1 waiting for you', "$1 t'attendent"], [/^(\d+) klaar$/, '$1 done', '$1 terminées'], [/^\+ nog (\d+)$/, '+ $1 more', '+ $1 de plus'],
    [/^(🪫|🔋) Nog (\d+)% batterij\. Sluit je lader aan!$/, '$1 $2% battery left. Plug in your charger!', '$1 Plus que $2 % de batterie. Branche ton chargeur !'],
    [/^Batterij bijna leeg: (\d+)%$/, 'Battery almost empty: $1%', 'Batterie presque vide : $1 %'], [/^Sluit je lader aan\.$/, 'Plug in your charger.', 'Branche ton chargeur.'],
    [/^(.+) is bijna leeg$/, '$1 is almost empty', '$1 est presque vide'], [/^Nog (\d+)% batterij\.$/, '$1% battery left.', 'Plus que $1 % de batterie.'],
    [/^🎧 (.+): nog (\d+)%$/, '🎧 $1: $2% left', '🎧 $1 : encore $2 %'], [/^📅 Over (\d+) min: (.+)$/, '📅 In $1 min: $2', '📅 Dans $1 min : $2'],
    [/^(Bezig of een vraag|Klaar|Fout): (#\w+)$/, (m, a, b) => `${tr(a)}: ${b}`]
  ];
  // French for English texts with a number or a name in them (from T('nl', 'en') pairs)
  const FR_PATTERNS = [
    [/^Done at (.+)$/, 'Fini à $1'], [/^done at (.+)$/, 'fini à $1'], [/^Saved at (.+)$/, 'Enregistré à $1'], [/^Playing on (.+)$/, 'Joue sur $1'],
    [/^step (\d+) of (\d+)$/, 'étape $1 sur $2'], [/^Pick (\d+) apps for your Home · (\d+) of (\d+)$/, 'Choisis $1 apps pour ton accueil · $2 sur $3'],
    [/^Give (.+) a job in your terminal\. You'll see what it does here, live: the code, the tests and its answer\.$/, 'Donne une tâche à $1 dans ton terminal. Tu verras ici en direct ce qu’il fait : le code, les tests et sa réponse.'],
    [/^(\d+) min left$/, 'Encore $1 min'], [/^(\d+) files?$/, '$1 fichier(s)'], [/^(\d+) tasks? done$/, '$1 tâche(s) terminée(s)']
  ];
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const toFr = e => (has(FR, e) ? FR[e] : e);
  // t: a text in Dutch (or English, in French mode); l: 'en' or 'fr'. Null when there is nothing to change.
  function translate(t, l) {
    if (has(EXACT, t)) return l === 'fr' ? toFr(EXACT[t]) : EXACT[t];
    if (l === 'fr' && has(FR, t)) return FR[t];
    for (const [re, en, fr] of PATTERNS) if (re.test(t)) return t.replace(re, l === 'fr' && fr ? fr : en);
    if (l === 'fr') for (const [re, fr] of FR_PATTERNS) if (re.test(t)) return t.replace(re, fr);
    // made of parts, like "Claude · Bezig" or "ChatGPT: Niet verbonden. Claude Code: Klaar"
    if (t.length > 120) return null; // long texts (Claude's messages, your notes) are never split up
    for (const sep of [' · ', '. ', ': ']) {
      if (!t.includes(sep)) continue;
      const parts = t.split(sep), out = parts.map(p => translate(p, l) ?? (sep === '. ' ? translate(p + '.', l)?.replace(/\.$/, '') : null));
      if (out.some((o, i) => o != null && o !== parts[i])) return out.map((o, i) => o ?? parts[i]).join(sep === ': ' && l === 'fr' ? ' : ' : sep);
    }
    return null;
  }
  function tr(s) {
    if (typeof s !== 'string') return s;
    const t = s.trim(); if (!t) return s;
    const out = translate(t, lang());
    return out == null ? s : s.replace(t, out);
  }
  window.__winlandTr = tr;

  // ---- canvas: everything drawn with text() ----
  const baseText = text;
  text = function (value, ...rest) { return baseText(typeof value === 'string' ? tr(value) : value, ...rest); };
  // measuring goes through the same translation, so layouts are made for the text that is really drawn
  const baseMeasure = ctx.measureText.bind(ctx);
  ctx.measureText = value => baseMeasure(typeof value === 'string' ? tr(value) : value);

  // ---- DOM pages: translate text and labels, remember the Dutch to switch back ----
  const SKIP = 'script,style,textarea,input,.tl-clip,.tl-list';
  const original = new WeakMap(), ATTRS = ['placeholder', 'title', 'aria-label'];
  let applying = false;
  function fixNode(node) {
    if (node.nodeType === 3) {
      if (!node.parentElement || node.parentElement.closest(SKIP)) return;
      const value = node.nodeValue, known = original.get(node);
      const source = known && known.shown === value ? known.nl : value;
      const want = tr(source);
      if (want !== value) { node.nodeValue = want; }
      if (want !== source) original.set(node, { nl: source, shown: want }); else original.delete(node);
      return;
    }
    if (node.nodeType !== 1 || node.closest?.('script,style')) return;
    for (const a of ATTRS) {
      if (!node.hasAttribute(a)) continue;
      const key = 'data-nl-' + a, value = node.getAttribute(a);
      const source = node.hasAttribute(key) && node.getAttribute(key + '-shown') === value ? node.getAttribute(key) : value;
      const want = tr(source);
      if (want !== value) node.setAttribute(a, want);
      if (want !== source) { node.setAttribute(key, source); node.setAttribute(key + '-shown', want); } else { node.removeAttribute(key); node.removeAttribute(key + '-shown'); }
    }
  }
  function fixTree(root) {
    fixNode(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
    while ((n = w.nextNode())) fixNode(n);
  }
  const observer = new MutationObserver(list => {
    if (applying) return; applying = true;
    try { for (const m of list) { if (m.type === 'childList') m.addedNodes.forEach(fixTree); else fixNode(m.target); } }
    finally { applying = false; observer.takeRecords(); }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // switching language: redo everything that is on screen
  let shownLang = null;
  setInterval(() => { const now = lang(); if (now !== shownLang) { shownLang = now; applying = true; try { fixTree(document.body); } finally { applying = false; observer.takeRecords(); } } }, 250);

  // ---- Windows notifications and dates ----
  if (window.Notification) {
    const N = window.Notification;
    window.Notification = class extends N { constructor(title, options = {}) { super(tr(title), { icon: './assets/icon-256.png', ...options, body: options.body && tr(options.body) }); } }; // with the WinLand icon
  }
  for (const fn of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) {
    const base = Date.prototype[fn];
    Date.prototype[fn] = function (locale, options) { return base.call(this, /^nl/i.test(String(locale || '')) ? (lang() === 'en' ? 'en-GB' : 'fr-FR') : locale, options); };
  }
})();
