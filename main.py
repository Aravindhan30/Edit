# Smart Helmet Safety Reminder & Guardian Monitoring System
# ESP32 + MicroPython (Wokwi simulation)
# Author: Aravindhan S | Final Year ECE | P.T.Lee.CNCET, Kancheepuram
#
# Simulation mapping (real build in brackets):
#   Slide switch D25 = registered helmet detected   (ESP32 BLE scan for the helmet's unique ID)
#   Slide switch D26 = helmet is worn               (chin-strap hall/reed sensor or IR in the liner)
#   Push button  D27 = IGNITION / start attempt     (ignition-on signal)
#   Red LED D14 + buzzer D13 = warning, Green LED D33 = safe, Blue LED D32 = permit signal
# Slide switch RIGHT = ON.  Wokwi cannot simulate BLE, so the switch stands in for it.

import network, time, machine
from machine import Pin, PWM
try:
    import urequests as requests
except ImportError:
    import requests

# ---------------- settings (edit these) ----------------
WIFI_SSID, WIFI_PASS = "Wokwi-GUEST", ""
THINGSPEAK_KEY = "PASTE_THINGSPEAK_WRITE_API_KEY"
SCRIPT_URL = "PASTE_APPS_SCRIPT_WEB_APP_EXEC_URL"
HELMET_ID = "HLM-001"
GUARDIAN_PHONE = "+91XXXXXXXXXX"
ALERT_AFTER = 3          # consecutive violations before guardian alert
TS_GAP_MS = 16000        # ThingSpeak free tier allows 1 update every 15 s
HEARTBEAT_MS = 30000
GSM_HARDWARE = False     # True only on a real board with SIM800L on UART2 (TX=17, RX=16)

# ---------------- pins ----------------
helmet_sw = Pin(25, Pin.IN, Pin.PULL_UP)
worn_sw = Pin(26, Pin.IN, Pin.PULL_UP)
ign_btn = Pin(27, Pin.IN, Pin.PULL_UP)
red = Pin(14, Pin.OUT)
green = Pin(33, Pin.OUT)
permit = Pin(32, Pin.OUT)
buzzer = PWM(Pin(13))
buzzer.freq(2000)

# ---------------- state ----------------
riding = False
streak = 0          # consecutive violations
ts_streak = 0       # value shown on ThingSpeak (kept until next update)
last_ok = 1
ts_pending = True


def buz(on):
    v = 512 if on else 0
    try:
        buzzer.duty(v)
    except AttributeError:
        buzzer.duty_u16(v * 64)


def is_on(p):
    return p.value() == 0


def wifi_up():
    w = network.WLAN(network.STA_IF)
    w.active(True)
    if not w.isconnected():
        w.connect(WIFI_SSID, WIFI_PASS)
        for _ in range(20):
            if w.isconnected():
                break
            time.sleep(0.5)
    return w.isconnected()


def get(url):
    try:
        r = requests.get(url)
        code = r.status_code
        r.close()
        return code          # Apps Script answers 302 after it has already run - that is fine
    except Exception as e:
        print("net error:", e)
        return None


def warn(n=4):
    for _ in range(n):
        red.on(); buz(True); time.sleep_ms(180)
        red.off(); buz(False); time.sleep_ms(180)


def send_sms(msg):
    print("[GSM] SMS to", GUARDIAN_PHONE, "->", msg)
    if not GSM_HARDWARE:
        return
    u = machine.UART(2, baudrate=9600, tx=17, rx=16)
    for cmd in ("AT", "AT+CMGF=1", 'AT+CMGS="%s"' % GUARDIAN_PHONE):
        u.write(cmd + "\r\n")
        time.sleep(1)
    u.write(msg)
    u.write(bytes([26]))     # Ctrl+Z sends the SMS
    time.sleep(3)


def cloud_log(status, reason, alert, count):
    if not SCRIPT_URL.startswith("http"):
        print("(Apps Script URL not set - skipping sheet log)")
        return
    url = "%s?action=log&helmet_id=%s&status=%s&reason=%s&streak=%d&alert=%d" % (
        SCRIPT_URL, HELMET_ID, status, reason, count, alert)
    print("Google Sheet log ->", get(url))


def ts_send(det, worn):
    if THINGSPEAK_KEY.startswith("PASTE"):
        return
    url = "http://api.thingspeak.com/update?api_key=%s&field1=%d&field2=%d&field3=%d&field4=%d" % (
        THINGSPEAK_KEY, last_ok, det, worn, ts_streak)
    print("ThingSpeak ->", get(url))


def start_ride():
    global riding, streak, ts_streak, last_ok, ts_pending
    riding = True
    streak = 0
    ts_streak = 0
    last_ok = 1
    red.off(); green.on(); permit.on(); buz(False)
    print("SAFE: helmet detected and worn -> ride permitted")
    cloud_log("OK", "-", 0, 0)
    ts_pending = True


def violation(reason):
    global riding, streak, ts_streak, last_ok, ts_pending
    riding = False
    permit.off(); green.off()
    streak += 1
    ts_streak = streak
    last_ok = 0
    print("WARNING:", reason, "| violations in a row:", streak)
    warn()
    alert = 1 if streak >= ALERT_AFTER else 0
    cloud_log("VIOLATION", reason, alert, streak)
    if alert:
        send_sms("Helmet alert: %s skipped the helmet %d times in a row. Please talk to the rider." % (HELMET_ID, streak))
        streak = 0
    ts_pending = True


# ---------------- main ----------------
print("Smart Helmet system starting...")
print("WiFi connected:", wifi_up())
print("Slide switch RIGHT = ON. Press IGNITION to start.")
prev_btn = 1
last_ts = time.ticks_add(time.ticks_ms(), -TS_GAP_MS)
last_beat = time.ticks_ms()

while True:
    det, worn = is_on(helmet_sw), is_on(worn_sw)
    btn = ign_btn.value()

    if btn == 0 and prev_btn == 1:              # ignition pressed
        time.sleep_ms(40)
        if riding:
            riding = False
            permit.off()
            print("Ride ended")
        elif det and worn:
            start_ride()
        else:
            violation("NOT_DETECTED" if not det else "NOT_WORN")
    prev_btn = btn

    if riding and not (det and worn):           # helmet taken off mid-ride
        violation("REMOVED_ON_RIDE")

    if not riding:
        green.value(1 if (det and worn) else 0)  # green = ready to ride

    now = time.ticks_ms()
    if time.ticks_diff(now, last_beat) > HEARTBEAT_MS:
        ts_pending = True
        last_beat = now
    if ts_pending and time.ticks_diff(now, last_ts) > TS_GAP_MS:
        ts_send(det, worn)
        last_ts = now
        ts_pending = False

    time.sleep_ms(50)
