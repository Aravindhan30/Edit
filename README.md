SMART HELMET SAFETY REMINDER AND GUARDIAN MONITORING SYSTEM
Aravindhan S | Final Year ECE | P.T.Lee.CNCET, Kancheepuram
aravindpriyashanmugam@gmail.com | 6379857987
TN Skills - VTPT (Vetri Thiran Payirchi Thittam) - Individual Hackathon

-------------------------------------------------------------
1. FILES
-------------------------------------------------------------
diagram.json  - Wokwi circuit (paste into the diagram.json tab)
main.py       - ESP32 MicroPython code (paste into main.py)
Code.gs       - Google Apps Script backend (bound to the Google Sheet)
README.txt    - this file + the dashboard prompt (section 5)

-------------------------------------------------------------
2. THE 4 TOOLS (enough for this project, nothing extra)
-------------------------------------------------------------
1) Wokwi              - simulate ESP32, switches, LEDs, buzzer
2) ThingSpeak         - live status + graphs from the ESP32 (free, no coding)
3) Google Sheet +     - trip log, helmet registration, guardian alerts,
   Apps Script          and the JSON API for the dashboard
4) Web dashboard      - the guardian's screen (single HTML file, generated
                        with the prompt below)
Not needed: Blynk, Firebase, Node-RED, Twilio (Apps Script email covers
the alert; the real GSM module is in the code behind GSM_HARDWARE).

-------------------------------------------------------------
3. QUICK SETUP (about 20 minutes)
-------------------------------------------------------------
a) ThingSpeak: new channel with 4 fields ->
   field1 = Trip OK (1/0), field2 = Helmet detected, field3 = Helmet worn,
   field4 = Violations in a row. Copy the WRITE API key and the Channel ID.
b) Google Sheet: Extensions > Apps Script > paste Code.gs > run setup() once
   and allow permissions. Edit the sample row in the "Helmets" tab (guardian
   email). Deploy > New deployment > Web app > Execute as Me, Access Anyone.
   Copy the /exec URL.
c) Wokwi: new ESP32 MicroPython project. Paste diagram.json and main.py.
   Put the ThingSpeak key and the /exec URL in the settings at the top of main.py.
d) Run. Slide switch RIGHT = ON.

-------------------------------------------------------------
4. TEST SCENARIOS (take a screenshot of each)
-------------------------------------------------------------
Safe ride      : both switches ON, press IGNITION -> green + blue LED, row "OK"
Not worn       : detected ON, worn OFF, press IGNITION -> red LED + buzzer
Not detected   : both OFF, press IGNITION -> red LED + buzzer
Guardian alert : fail 3 times in a row -> serial shows [GSM] SMS line, the
                 Alerts tab gets a row, guardian gets an email
Removed on ride: start a safe ride, then switch "worn" OFF -> warning + log
Note: Wokwi cannot simulate Bluetooth, so the "Helmet detected" switch stands
in for the BLE scan. On real hardware use the ESP32 BLE scan for the helmet ID.

-------------------------------------------------------------
5. DASHBOARD UI - PROMPT TO GENERATE IT
-------------------------------------------------------------
Copy everything between the lines into Claude (or any AI) and attach nothing else.

----------------------------------------------------------------
Build a single-file HTML dashboard (HTML + CSS + vanilla JS, no framework,
no build step) called "Smart Helmet Guardian Dashboard" for parents/guardians
to monitor a rider's helmet usage. Light theme, clean, mobile-friendly,
friendly plain-English wording, no decorative graphics.

Data sources (put both at the top of the script as constants I can edit):
1) APPS_SCRIPT_URL - Google Apps Script web app. GET APPS_SCRIPT_URL?action=summary
   returns JSON:
   { ok, daily:{trips,compliant,violations,compliance_pct},
     weekly:{...same}, monthly:{...same},
     last7:[{date,trips,compliant,violations,compliance_pct}],
     recent:[{time,helmet_id,status("OK"|"VIOLATION"),reason}],
     helmets:[{helmet_id,rider,guardian,active}], alerts:number }
   Other actions (GET): ?action=register&helmet_id=&rider=&guardian_name=
   &guardian_phone=&guardian_email=   and   ?action=replace&old_id=&new_id=
2) ThingSpeak public channel: https://api.thingspeak.com/channels/CHANNEL_ID/feeds/last.json
   field1 = last trip OK (1/0), field2 = helmet detected (1/0),
   field3 = helmet worn (1/0), field4 = violations in a row. Poll every 15 s.

Sections:
- Header: title, rider name, small "Live / Offline" indicator.
- Live status card: big word "SAFE TO RIDE" (green) when detected+worn,
  "HELMET NOT WORN" (red) or "HELMET NOT FOUND" (red) otherwise, with the
  time of last update.
- Three stat cards: Today, This week, This month - each with compliance %,
  trips, violations.
- Bar chart of last 7 days (compliant vs violations), drawn with plain SVG or
  canvas, no chart library.
- Recent trips table (time, helmet, status badge, reason in plain English:
  NOT_WORN = "Helmet not worn", NOT_DETECTED = "Helmet not found",
  REMOVED_ON_RIDE = "Removed while riding").
- Alerts card: number of guardian alerts sent, and a highlighted banner when
  violations in a row >= 3.
- Helmet management: list of registered helmets with an active badge, a
  "Register helmet" form and a "Replace helmet" form calling the actions above.
- Friendly empty states and error messages if a data source is unreachable.
Use system fonts, one calm accent colour, rounded cards, and make it work by
double-clicking the file. Add short comments so a student can explain it.
----------------------------------------------------------------
