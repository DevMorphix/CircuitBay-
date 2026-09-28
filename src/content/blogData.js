// Blog content (Part B). DRAFT copy pending client sign-off.
// TODO_CLIENT: real authors and cover images; replace the two `draft`
// articles with the real project/workshop stories before publishing them.
//
// Body blocks: { type: 'h2', id, text } | { type: 'p', text }
//   | { type: 'list', items: [] } | { type: 'table', head: [], rows: [[]] }
//   | { type: 'code', text } | { type: 'diagram', text }

export const blogHome = {
  eyebrow: 'THE BAY BLOG',
  headline: 'Learn by reading. Then build.',
  subhead: 'Electronics, IoT and Arduino tutorials, project write-ups and datasheets explained — written by people who build.',
  newsletter: { copy: 'New builds and tutorials, once a week. No spam.', cta: 'Subscribe' },
}

export const blogCategories = [
  { slug: 'tutorials', label: 'Tutorials' },
  { slug: 'project-write-ups', label: 'Project Write-ups' },
  { slug: 'datasheets-explained', label: 'Datasheets Explained' },
  { slug: 'workshop-recaps', label: 'Workshop Recaps' },
  { slug: 'product-guides', label: 'Product Guides' },
]

const AUTHOR = 'CircuitBay Team' // TODO_CLIENT: real author names + bios

export const articles = [
  {
    slug: 'first-esp32-project-in-30-minutes',
    title: 'Your first ESP32 project in 30 minutes',
    seoTitle: 'ESP32 Beginner Project: Wi-Fi Thermometer with DHT11',
    category: 'tutorials',
    excerpt: 'Read a DHT11 sensor with an ESP32 and show the temperature on your phone over Wi-Fi — a complete beginner project with wiring and code.',
    readTime: 8,
    date: '2026-09-12',
    updated: '2026-09-28',
    author: AUTHOR,
    featured: true,
    parts: ['esp32-devkit', 'breadboard-830', 'jumper-wires', 'dht11'],
    relatedProjects: ['airloo', 'smart-agriculture'],
    body: [
      { type: 'p', text: 'The ESP32 is the go-to board for IoT projects: it has Wi-Fi and Bluetooth built in, a fast dual-core processor and plenty of pins, and it costs about the same as an Arduino Uno. In this tutorial you will build a tiny Wi-Fi thermometer — the ESP32 reads a DHT11 temperature and humidity sensor and serves the reading as a web page that any phone on the same network can open.' },
      { type: 'h2', id: 'what-youll-need', text: "What you'll need" },
      { type: 'list', items: ['ESP32 DevKit V1 (or any ESP32 development board)', 'DHT11 temperature and humidity sensor module', '830-point breadboard and three jumper wires', 'A micro-USB or USB-C data cable (not a charge-only cable)', 'Arduino IDE 2 on your laptop'] },
      { type: 'h2', id: 'set-up-arduino-ide', text: 'Set up the Arduino IDE for ESP32' },
      { type: 'p', text: 'Open the Boards Manager in the Arduino IDE, search for "esp32" and install the package by Espressif Systems. Then open the Library Manager and install "DHT sensor library" by Adafruit (accept its dependency, Adafruit Unified Sensor). Select "ESP32 Dev Module" as the board and pick the right COM port. If no port appears, install the USB-to-serial driver for your board — most DevKits use a CP2102 or CH340 chip.' },
      { type: 'h2', id: 'wiring', text: 'Wiring it up' },
      { type: 'p', text: 'Connect the DHT11 module\'s VCC pin to 3V3 on the ESP32, GND to GND, and the DATA pin to GPIO 4. Most DHT11 modules already include the 10 kΩ pull-up resistor on the data line; if you are using a bare 4-pin sensor, add one between DATA and 3V3.' },
      { type: 'diagram', text: 'Wiring diagram — DHT11 VCC → 3V3, GND → GND, DATA → GPIO 4' },
      { type: 'h2', id: 'code', text: 'The code' },
      { type: 'p', text: 'Replace the Wi-Fi name and password, upload the sketch, and open the Serial Monitor at 115200 baud. When the board connects, it prints its IP address.' },
      {
        type: 'code',
        text: `#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

const char* SSID = "your-wifi";
const char* PASS = "your-password";

DHT dht(4, DHT11);
WebServer server(80);

void handleRoot() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    server.send(500, "text/plain", "Sensor read failed");
    return;
  }
  server.send(200, "text/html",
    "<h1>" + String(t, 1) + " &deg;C</h1><p>Humidity " + String(h, 0) + "%</p>");
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.begin();
}

void loop() {
  server.handleClient();
}`,
      },
      { type: 'h2', id: 'test-it', text: 'Test it' },
      { type: 'p', text: 'Type the printed IP address into your phone\'s browser (the phone must be on the same Wi-Fi network). Refresh the page to take a new reading. Breathe gently on the sensor and watch the humidity climb.' },
      { type: 'h2', id: 'troubleshooting', text: 'Troubleshooting' },
      { type: 'list', items: ['"Sensor read failed": check the DATA wire is on GPIO 4 and wait two seconds between readings — the DHT11 updates about once a second.', 'Upload fails with "Failed to connect": hold the BOOT button while the IDE says "Connecting…".', 'Stuck connecting to Wi-Fi: the ESP32 only supports 2.4 GHz networks, not 5 GHz.'] },
      { type: 'h2', id: 'next-steps', text: 'Next steps' },
      { type: 'p', text: 'Log readings to a spreadsheet, add an OLED display, or switch a fan with a relay when it gets hot — the ESP32 IoT Starter Kit has all three. When it works, share it with the bay.' },
    ],
  },
  {
    slug: 'esp32-vs-arduino-which-to-start-with',
    title: 'ESP32 vs Arduino Uno: which should you start with?',
    seoTitle: 'ESP32 vs Arduino Uno: Which Should Beginners Choose?',
    category: 'product-guides',
    excerpt: 'Speed, memory, Wi-Fi, voltage and price compared side by side — and a simple rule for choosing the right board for your first project.',
    readTime: 7,
    date: '2026-09-20',
    author: AUTHOR,
    parts: ['arduino-uno', 'esp32-devkit', 'blink-sense-kit', 'esp32-iot-starter'],
    relatedProjects: ['smart-agriculture', 'line-follower'],
    body: [
      { type: 'p', text: 'Short answer: start with an Arduino Uno if you are learning electronics from scratch, and start with an ESP32 if your project needs Wi-Fi or Bluetooth. Both are programmed in the Arduino IDE with almost the same code, so what you learn on one carries straight over to the other.' },
      { type: 'h2', id: 'side-by-side', text: 'ESP32 vs Arduino Uno side by side' },
      {
        type: 'table',
        head: ['', 'Arduino Uno (ATmega328P)', 'ESP32 DevKit'],
        rows: [
          ['Processor', '8-bit, 16 MHz', '32-bit dual-core, up to 240 MHz'],
          ['RAM', '2 KB', '520 KB'],
          ['Program memory', '32 KB', '4 MB flash (typical)'],
          ['Wireless', 'None', 'Wi-Fi 2.4 GHz + Bluetooth / BLE'],
          ['Logic voltage', '5 V', '3.3 V'],
          ['Analog inputs', '6 × 10-bit', 'Up to 18 × 12-bit'],
          ['Best for', 'Learning, robots, simple sensors', 'IoT, dashboards, phone control'],
        ],
      },
      { type: 'h2', id: 'choose-arduino', text: 'When to choose the Arduino Uno' },
      { type: 'p', text: 'The Uno is the most forgiving board for a first project. Its 5 V logic matches most beginner modules, it tolerates wiring mistakes better, and nearly every beginner tutorial and book is written for it. If you are building a line-follower robot, a traffic light or a reaction game, you do not need anything more.' },
      { type: 'h2', id: 'choose-esp32', text: 'When to choose the ESP32' },
      { type: 'p', text: 'Choose the ESP32 as soon as your idea involves a phone, a dashboard or the internet: smart home switches, weather stations, air-quality monitors or smart agriculture. It is also much faster, which helps with displays, audio and small AI models. Most final-year IoT projects are built on an ESP32.' },
      { type: 'h2', id: 'watch-out', text: 'Things that catch beginners out' },
      { type: 'list', items: ['The ESP32 uses 3.3 V logic. A 5 V sensor output (like the HC-SR04 echo pin) needs a voltage divider before it reaches an ESP32 pin.', 'Some ESP32 pins are input-only (GPIO 34–39) and some affect booting (GPIO 0, 2, 12, 15) — check the pinout before wiring.', 'The ESP32 analog-to-digital converter is less linear than the Uno\'s; calibrate if you need accurate readings.', 'ESP32 Wi-Fi works on 2.4 GHz networks only.'] },
      { type: 'h2', id: 'verdict', text: 'The verdict' },
      { type: 'p', text: 'Learning the fundamentals? Get the Beginner Blink & Sense Kit with an Uno. Building something connected? Get the ESP32 IoT Starter Kit. Many makers end up owning both — the skills transfer directly.' },
    ],
  },
  {
    slug: 'which-sensor-for-obstacle-detection',
    title: 'Which sensor for obstacle detection? Ultrasonic vs IR vs ToF',
    seoTitle: 'Ultrasonic vs IR vs ToF: Obstacle Sensors Compared',
    category: 'product-guides',
    excerpt: 'HC-SR04, IR modules and the VL53L0X compared on range, accuracy, price and pitfalls — so you pick the right obstacle sensor for your robot.',
    readTime: 6,
    date: '2026-09-05',
    updated: '2026-09-28',
    author: AUTHOR,
    parts: ['hc-sr04', 'ir-sensor', 'vl53l0x'],
    relatedProjects: ['vazhikatti', 'line-follower'],
    body: [
      { type: 'p', text: 'Almost every robot and assistive device needs to know when something is in the way. The three sensors students use most are the HC-SR04 ultrasonic sensor, IR obstacle modules and time-of-flight (ToF) laser sensors like the VL53L0X. Here is how they compare and when to use each.' },
      { type: 'h2', id: 'the-short-answer', text: 'The short answer' },
      { type: 'p', text: 'For most student robots, start with an HC-SR04 ultrasonic sensor: it is cheap, measures real distance and is easy to code. Use IR modules for line following and edge detection, and move to a ToF sensor when you need accurate readings in tight spaces or against angled surfaces.' },
      {
        type: 'table',
        head: ['', 'Ultrasonic (HC-SR04)', 'IR module', 'ToF (VL53L0X)'],
        rows: [
          ['Range', '2 cm – 4 m', '2 – 30 cm', 'Up to about 2 m'],
          ['Output', 'Distance (echo pulse time)', 'Digital yes/no', 'Distance in mm over I²C'],
          ['Accuracy', 'About ±3 mm in ideal conditions', 'Threshold only', 'Millimetre-level'],
          ['Weak spots', 'Soft or angled surfaces, narrow objects', 'Sunlight, black surfaces', 'Very shiny or transparent surfaces'],
          ['Price', 'Lowest', 'Lowest', 'Higher'],
        ],
      },
      { type: 'h2', id: 'ultrasonic', text: 'Ultrasonic sensors (HC-SR04)' },
      { type: 'p', text: 'The HC-SR04 sends a 40 kHz sound pulse and times the echo. Distance in centimetres is the echo time in microseconds × 0.0343 ÷ 2. Its beam is roughly 15° wide, so it can miss thin objects like chair legs, and soft materials such as curtains absorb the sound. It runs on 5 V — if you use an ESP32, put a voltage divider on the echo pin.' },
      { type: 'h2', id: 'infrared', text: 'Infrared obstacle modules' },
      { type: 'p', text: 'IR modules shine infrared light and detect the reflection. They are ideal for line following and table-edge detection because they react fast, but they only tell you "something is close", and bright sunlight or matte black surfaces confuse them. Use the on-board potentiometer to set the trigger distance.' },
      { type: 'h2', id: 'tof', text: 'Time-of-flight sensors (VL53L0X)' },
      { type: 'p', text: 'A ToF sensor times a pulse of invisible laser light, giving millimetre-accurate distance over I²C and working well against angled surfaces where ultrasonic struggles. It costs more and needs a library, but it is the right choice for precise robots and for assistive devices where a missed obstacle matters.' },
      { type: 'h2', id: 'recommendation', text: 'Our recommendation' },
      { type: 'list', items: ['First robot or obstacle avoider: HC-SR04.', 'Line follower or edge detection: IR modules (two to five of them).', 'Precise distance, tight spaces or assistive devices: VL53L0X — or combine it with an ultrasonic sensor for wider coverage.'] },
    ],
  },
  {
    slug: 'datasheets-explained-what-to-read',
    title: 'Datasheets explained: what to actually read',
    seoTitle: "How to Read a Datasheet: A Beginner's Guide",
    category: 'datasheets-explained',
    excerpt: 'Forty pages, and you need a handful of numbers. How to read an electronics datasheet quickly — ratings, logic levels, pinouts and the application circuit.',
    readTime: 7,
    date: '2026-08-28',
    updated: '2026-09-28',
    author: AUTHOR,
    parts: ['esp32-devkit', 'multimeter', 'hc-sr04'],
    relatedProjects: ['weather-station'],
    body: [
      { type: 'p', text: 'A datasheet is the manufacturer\'s description of exactly how a part behaves. They look intimidating, but for most projects you only need five sections. Read these, in this order, and you will avoid most burnt components and "why doesn\'t it work" evenings.' },
      { type: 'h2', id: 'start-here', text: '1. The first-page summary' },
      { type: 'p', text: 'Page one lists the key features: supply voltage range, interface (I²C, SPI, UART, analog), and headline performance such as range or accuracy. In thirty seconds it tells you whether the part can work with your board at all.' },
      { type: 'h2', id: 'pinout', text: '2. The pinout' },
      { type: 'p', text: 'The pin diagram shows what every pin does and which way the package is oriented. Many breakout modules re-label pins, so compare the module\'s silkscreen with the chip\'s pinout before you wire power.' },
      { type: 'h2', id: 'absolute-max', text: '3. Absolute maximum ratings' },
      { type: 'p', text: 'These are the limits beyond which the part may be permanently damaged — maximum supply voltage, maximum voltage on any pin, maximum current. Never design to them; they are a cliff edge, not a target.' },
      { type: 'h2', id: 'operating-conditions', text: '4. Recommended operating conditions and electrical characteristics' },
      { type: 'p', text: 'This table tells you the voltage and temperature range the part is designed for and, crucially, its logic levels. VIH and VIL are the voltages an input reads as HIGH and LOW; VOH and VOL are what an output produces. This is where 5 V vs 3.3 V problems are caught: an HC-SR04 echo output swings to about 5 V, which exceeds the ESP32\'s maximum pin voltage, so it needs a voltage divider.' },
      {
        type: 'table',
        head: ['Term', 'Meaning', 'Why it matters'],
        rows: [
          ['VCC / VDD', 'Supply voltage', 'Power it within the recommended range'],
          ['VIH / VIL', 'Input HIGH / LOW threshold', 'Will your board read the signal correctly?'],
          ['VOH / VOL', 'Output HIGH / LOW voltage', 'Is the output safe for your board\'s pins?'],
          ['ICC / IDD', 'Supply current', 'Can your regulator or battery supply it?'],
          ['I²C address', 'Bus address of the chip', 'Two identical sensors may clash'],
        ],
      },
      { type: 'h2', id: 'application-circuit', text: '5. The typical application circuit' },
      { type: 'p', text: 'Near the end, most datasheets show a recommended circuit: which capacitors to place near the power pins, which pull-up resistors to add. Copy it. It is the manufacturer telling you what works.' },
      { type: 'h2', id: 'skip', text: 'What you can usually skip' },
      { type: 'list', items: ['Package dimensions and footprints — unless you are designing a PCB.', 'Reliability and qualification data.', 'Detailed register maps — the library you use handles most of these; come back to them when you need an advanced feature.'] },
      { type: 'p', text: 'Keep a multimeter handy: measuring the actual supply voltage and pin levels is the fastest way to check your reading of the datasheet against reality.' },
    ],
  },
  {
    slug: 'line-follower-from-scratch',
    title: 'Build a line-follower robot from scratch',
    seoTitle: 'Line Follower Robot with Arduino: Step-by-Step Guide',
    category: 'tutorials',
    excerpt: 'Chassis, L298N motor driver, IR sensors and Arduino code — a complete step-by-step line-follower robot guide for students and competitions.',
    readTime: 12,
    date: '2026-08-02',
    updated: '2026-09-28',
    author: AUTHOR,
    parts: ['line-follower-kit', 'l298n', 'ir-sensor', 'arduino-uno'],
    relatedProjects: ['line-follower'],
    body: [
      { type: 'p', text: 'A line-follower robot drives along a black line on a white surface on its own. It is the classic first robot and the entry event at most college tech fests, because it teaches the three things every robot needs: sensing, deciding and moving. This guide builds a two-sensor version you can later upgrade to five sensors and PID control.' },
      { type: 'h2', id: 'parts', text: 'Parts' },
      { type: 'list', items: ['2WD robot chassis with two geared DC motors and a caster wheel', 'L298N dual motor driver', 'Two IR sensor modules (or a 5-channel IR array)', 'Arduino Uno or Nano', 'Battery holder with 2 × 18650 cells (about 7.4 V)', 'Jumper wires'] },
      { type: 'h2', id: 'how-it-works', text: 'How it works' },
      { type: 'p', text: 'Mount the two IR sensors at the front, just either side of the line. On white, both sensors see a reflection; over the black line, the reflection drops. If the left sensor sees the line, the robot has drifted right, so it turns left — and vice versa. Most IR modules output LOW over a black line; if yours does the opposite, flip the comparison in the code.' },
      { type: 'h2', id: 'wiring', text: 'Wiring' },
      { type: 'list', items: ['L298N OUT1/OUT2 → left motor, OUT3/OUT4 → right motor', 'L298N ENA, IN1, IN2 → Arduino pins 5, 7, 8; ENB, IN3, IN4 → pins 6, 9, 10 (remove the ENA/ENB jumpers)', 'Battery + → L298N 12V input, battery − → L298N GND and Arduino GND (common ground)', 'Left IR OUT → pin 2, right IR OUT → pin 3, sensor VCC/GND → 5V/GND'] },
      { type: 'diagram', text: 'Wiring diagram — Arduino, L298N, two IR sensors and battery' },
      { type: 'h2', id: 'code', text: 'The code' },
      {
        type: 'code',
        text: `const int L_SENSOR = 2, R_SENSOR = 3;
const int ENA = 5, IN1 = 7, IN2 = 8, ENB = 6, IN3 = 9, IN4 = 10;
const int SPEED = 150; // 0-255: start slow, raise once it tracks well

void drive(int left, int right) {
  digitalWrite(IN1, left > 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right > 0); digitalWrite(IN4, right < 0);
  analogWrite(ENA, abs(left));  analogWrite(ENB, abs(right));
}

void setup() {
  const int outputs[] = {ENA, IN1, IN2, ENB, IN3, IN4};
  for (int pin : outputs) pinMode(pin, OUTPUT);
  pinMode(L_SENSOR, INPUT);
  pinMode(R_SENSOR, INPUT);
}

void loop() {
  bool leftOnLine = digitalRead(L_SENSOR) == LOW;
  bool rightOnLine = digitalRead(R_SENSOR) == LOW;

  if (leftOnLine && !rightOnLine) drive(0, SPEED);       // drifted right: turn left
  else if (rightOnLine && !leftOnLine) drive(SPEED, 0);  // drifted left: turn right
  else drive(SPEED, SPEED);                              // centred: go straight
}`,
      },
      { type: 'h2', id: 'tuning', text: 'Tuning tips' },
      { type: 'list', items: ['Set each IR module\'s potentiometer so its LED switches cleanly between the line and the white surface.', 'If the robot overshoots curves, lower SPEED or move the sensors closer together.', 'If one motor runs backwards, swap its two wires on the L298N.', 'A 25 mm wide black electrical-tape line on white chart paper makes a good practice track.'] },
      { type: 'h2', id: 'upgrade', text: 'Upgrade: five sensors and PID' },
      { type: 'p', text: 'Competition robots use a five-sensor array to estimate how far the robot is from the centre of the line, then a PID controller to steer smoothly instead of zig-zagging. Once the two-sensor version works, swapping in an array and adding PID is the natural next step.' },
    ],
  },
  {
    slug: 'airloo-build-log',
    draft: true, // TODO_CLIENT: publish once the real AirLoo team story, photos and data are supplied
    title: 'AirLoo: building a smart washroom air-quality monitor',
    category: 'project-write-ups',
    excerpt: 'How a student team turned an MQ-135 gas sensor into a real deployment.',
    readTime: 10,
    date: '2026-08-20',
    author: AUTHOR,
    parts: ['esp32-devkit', 'mq135'],
    relatedProjects: ['airloo'],
    body: [
      { type: 'h2', id: 'the-idea', text: 'The idea' },
      { type: 'p', text: 'Alert cleaning staff when air quality drops, instead of cleaning on a fixed schedule.' },
    ],
  },
  {
    slug: 'maker-lab-workshop-recap',
    draft: true, // TODO_CLIENT: publish with the real workshop details and photos
    title: 'Recap: a two-day IoT workshop',
    category: 'workshop-recaps',
    excerpt: 'What worked, what broke, and what every student took home.',
    readTime: 5,
    date: '2026-08-11',
    author: AUTHOR,
    parts: ['esp32-iot-starter'],
    relatedProjects: ['smart-agriculture'],
    body: [
      { type: 'h2', id: 'day-one', text: 'Day one' },
      { type: 'p', text: 'Blink, button, buzzer — every student had a working circuit in the first hour.' },
    ],
  },
]

// Only published articles appear in listings, the sitemap and search
export const publishedArticles = articles.filter((a) => !a.draft).sort((a, b) => b.date.localeCompare(a.date))

export const categoryLabel = (slug) => blogCategories.find((c) => c.slug === slug)?.label ?? slug

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
