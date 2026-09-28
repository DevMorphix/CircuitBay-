// Shop mock data (Part C). DRAFT — pending the client's real catalog.
// TODO_CLIENT: replace products, kits, prices and policies with real data.

export const shopHome = {
  announcement: 'Free shipping on orders over ₹999 across India', // TODO_CLIENT: confirm offer
  hero: {
    eyebrow: 'CIRCUITBAY SHOP',
    headline: 'The right parts. Not a pile of parts.',
    subhead: 'Curated components and project kits for students, hobbyists and schools.',
    cta: 'Shop kits',
  },
  kitsHeadline: 'Start with a kit. Finish with a project.',
  cantFind: { headline: "Can't find a part?", body: "Tell us what you're building. We'll source it.", cta: 'Request a part' },
}

// TODO_CLIENT: confirm returns policy wording
export const trustItems = [
  { icon: 'shield', label: 'Secure payments' },
  { icon: 'truck', label: 'Tracked delivery' },
  { icon: 'chat', label: 'Student-friendly support' },
  { icon: 'return', label: 'Easy returns' },
]

// `seoTitle`, `description` and `guide` give every category page unique,
// useful copy (a short buying guide under the grid) so it can rank for
// "<category> kits India" searches.
export const shopCategories = [
  {
    slug: 'robotics',
    label: 'Robotics',
    icon: 'robotics',
    blurb: 'Arms, rovers, and things that move on their own.',
    seoTitle: 'Robotics Kits & Sensors — Buy Online in India',
    description: 'Line-follower and obstacle-avoider robot kits, motor drivers, ultrasonic and IR sensors for students and makers. Tracked delivery across India.',
    guide: [
      { h: 'Choosing your first robotics kit', p: 'Most student robots start as a two-wheel chassis, a motor driver and a handful of sensors. A line-follower kit is the classic first build: it teaches motor control, sensor reading and a simple feedback loop, and it is the entry point for most college robotics competitions. If you already have an Arduino, buy the chassis and driver separately; if you are starting from zero, a complete kit saves you from missing parts.' },
      { h: 'Sensors for obstacle detection', p: 'The HC-SR04 ultrasonic sensor is the cheapest way to measure distance (2 cm to 4 m) and works for most rovers. IR sensors are better for short-range edge and line detection. When you need millimetre accuracy in tight spaces, a VL53L0X time-of-flight sensor over I²C is worth the extra cost. Our guide on choosing an obstacle sensor compares all three.' },
      { h: 'Motor drivers and power', p: 'A microcontroller pin cannot drive a motor directly. The L298N dual H-bridge handles two DC motors at up to 2 A per channel and is the standard choice for small rovers. Power the motors from a separate battery pack and share ground with the board to avoid random resets.' },
    ],
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    icon: 'electronics',
    blurb: 'Components, boards, and the fundamentals.',
    seoTitle: 'Arduino Boards & Components — Buy in India',
    description: 'Arduino-compatible boards, breadboards, jumper wires and everyday electronic components for student projects and prototyping, delivered across India.',
    guide: [
      { h: 'The basics every bench needs', p: 'An Arduino Uno-compatible board, an 830-point breadboard and a set of male-to-male and male-to-female jumper wires will carry you through almost every beginner tutorial. Add an assortment of LEDs, resistors, push buttons and a buzzer and you can build dozens of circuits without soldering.' },
      { h: 'Arduino or ESP32?', p: 'The Uno is the board most tutorials are written for and the most forgiving for a first project. If your idea needs Wi-Fi or Bluetooth — sending data to a phone or the cloud — start with an ESP32 instead. Our ESP32 vs Arduino guide explains the trade-offs in plain language.' },
      { h: 'Buying reliable parts', p: 'Budget clone boards are fine for learning, but check which USB-to-serial chip they use and install the right driver before you start. For final-year projects and exhibitions, buy a spare board — a burnt regulator the night before a demo is a rite of passage nobody enjoys.' },
    ],
  },
  {
    slug: 'iot',
    label: 'IoT',
    icon: 'iot',
    blurb: 'Connected sensors and devices that talk to the cloud.',
    seoTitle: 'ESP32 & IoT Kits and Sensors — Buy in India',
    description: 'ESP32 boards, IoT starter kits and sensors (temperature, humidity, air quality, soil moisture) for smart home and smart agriculture projects.',
    guide: [
      { h: 'What you need for an IoT project', p: 'Every IoT project has three parts: a Wi-Fi board (usually an ESP32), one or more sensors, and somewhere to send the data — a phone dashboard, a spreadsheet or a cloud service. The ESP32 IoT Starter Kit bundles the board, a DHT11 temperature and humidity sensor, a relay, an OLED display and wiring, so you can build a working connected device on day one.' },
      { h: 'Popular IoT sensors', p: 'DHT11 for room temperature and humidity, MQ-135 for air quality, capacitive soil moisture sensors for smart agriculture, and relay modules for switching lamps, fans or pumps. For outdoor weather stations, a BME280 gives temperature, humidity and pressure with better accuracy than a DHT11.' },
      { h: 'IoT for final-year projects', p: 'Smart agriculture, air-quality monitoring, home automation and health monitoring are among the most common final-year IoT projects because they are easy to demonstrate live. See our final-year project ideas for complete parts lists.' },
    ],
  },
  {
    slug: 'ai',
    label: 'AI',
    icon: 'ai',
    blurb: 'Edge AI — vision, voice and on-device inference.',
    seoTitle: 'Edge AI Boards & ESP32-CAM — Buy in India',
    description: 'ESP32-CAM and edge-AI hardware for face detection, image classification and wake-word projects that run on the device — no cloud needed.',
    guide: [
      { h: 'AI on a microcontroller', p: 'Edge AI means running a small machine-learning model directly on the board, so it works offline and responds instantly. Typical student projects are face or object detection with a camera module, gesture recognition from an accelerometer, and wake-word detection from a microphone.' },
      { h: 'Where to start', p: 'The ESP32-CAM is an inexpensive way to experiment with computer vision: stream video over Wi-Fi first, then try on-device face detection. For audio projects, an ESP32-S3 with an I²S microphone can run a small TinyML keyword-spotting model.' },
      { h: 'Plan for power and memory', p: 'Vision models are memory-hungry — choose boards with PSRAM, and power camera modules from a supply that can deliver a steady 5 V at 500 mA or more to avoid brown-out resets.' },
    ],
  },
  {
    slug: 'maker-tools',
    label: 'Maker Tools',
    icon: 'maker-tools',
    blurb: 'Soldering irons, multimeters and bench tools.',
    seoTitle: 'Soldering Irons, Multimeters & Maker Tools — India',
    description: 'Soldering kits, digital multimeters and bench tools for students and makers — the tools that turn a breadboard prototype into a finished project.',
    guide: [
      { h: 'The two tools worth buying first', p: 'A digital multimeter is the fastest way to find out why a circuit is not working: check battery voltage, the continuity of a wire, and whether a resistor is the value you think it is. A temperature-controlled soldering iron is the second — it lets you move from a breadboard to a permanent build.' },
      { h: 'Soldering safely', p: 'Work in a ventilated space, use a stand for the iron, and keep the tip tinned. Lead-free solder needs a slightly higher temperature. Practise on a spare perfboard before soldering your final project.' },
      { h: 'Equipping a school lab', p: 'For schools and colleges setting up a maker lab, we supply tools in sets — see our school lab setup page, or contact us for a bulk quote.' },
    ],
  },
  {
    slug: 'learning-kits',
    label: 'Learning Kits',
    icon: 'kit',
    blurb: 'Everything in one box, with a guide.',
    seoTitle: 'Arduino Learning Kits for Beginners — India',
    description: 'Beginner electronics and Arduino learning kits with step-by-step projects — no soldering required. Ideal for students, hobbyists and classrooms.',
    guide: [
      { h: 'Who learning kits are for', p: 'A learning kit is the easiest way to start electronics: every component you need is in one box, matched to a set of guided projects. They suit school students, first-year engineering students and anyone teaching a class who needs identical kits for every learner.' },
      { h: 'What to look for', p: 'Check that the kit includes a board, a breadboard, jumper wires and enough sensors for the projects listed, and that it does not need soldering if it is your first kit. The Beginner Blink & Sense Kit covers 12 projects, from a traffic light to a reaction-time game.' },
      { h: 'Kits for classrooms', p: 'Teachers can order identical kits for a whole class. Contact us for classroom pricing, or explore our workshops and school lab programmes.' },
    ],
  },
]

export const skillLevels = ['Beginner', 'Intermediate', 'Advanced']

export const products = [
  // ---- Kits (Part C2) ----
  {
    id: 'blink-sense-kit',
    name: 'Beginner Blink & Sense Kit',
    category: 'learning-kits',
    kit: true,
    level: 'Beginner',
    price: 899,
    stock: 32,
    brand: 'CircuitBay',
    type: 'Kit',
    badges: ['Student Kit', 'Beginner Friendly'],
    forWhat: 'Your very first circuits — lights, buttons, buzzers and sensors — with no soldering.',
    build: 'Traffic light, night lamp, reaction-time game',
    inside: ['Arduino-compatible Uno', 'Breadboard', '40 jumper wires', 'LEDs & resistors', 'LDR, buzzer, buttons'],
    specs: { Board: 'Uno R3 compatible', 'Projects included': '12', Soldering: 'Not required' },
  },
  {
    id: 'esp32-iot-starter',
    name: 'ESP32 IoT Starter Kit',
    category: 'iot',
    kit: true,
    level: 'Intermediate',
    price: 1499,
    stock: 18,
    brand: 'CircuitBay',
    type: 'Kit',
    badges: ['Student Kit'],
    forWhat: 'Build devices that talk to your phone and the cloud over Wi-Fi and Bluetooth.',
    build: 'Wi-Fi thermometer, phone-controlled lamp, cloud data logger',
    inside: ['ESP32 DevKit', 'DHT11', 'Relay module', 'OLED display', 'Breadboard & wires'],
    specs: { Board: 'ESP32-WROOM-32', Connectivity: 'Wi-Fi + BLE', 'Projects included': '10' },
  },
  {
    id: 'line-follower-kit',
    name: 'Line-Follower Robot Kit',
    category: 'robotics',
    kit: true,
    level: 'Intermediate',
    price: 1899,
    stock: 4,
    brand: 'CircuitBay',
    type: 'Kit',
    badges: ['Student Kit', 'Low stock'],
    forWhat: 'A two-wheel robot that follows a track — the classic competition starter.',
    build: 'Line follower, obstacle avoider, maze solver',
    inside: ['2WD chassis', 'L298N motor driver', '5-channel IR array', 'Arduino Nano', 'Battery holder'],
    specs: { Drive: '2WD with caster', 'Motor driver': 'L298N', Controller: 'Nano' },
  },
  {
    id: 'smart-agri-kit',
    name: 'Smart Home / Agriculture Sensor Kit',
    category: 'iot',
    kit: true,
    level: 'Advanced',
    price: 2299,
    stock: 12,
    brand: 'CircuitBay',
    type: 'Kit',
    badges: ['Student Kit'],
    forWhat: 'Sense soil, air and light, then act on it automatically — irrigation, fans, alerts.',
    build: 'Auto-irrigation, room climate monitor, smart alerts',
    inside: ['ESP32', 'Soil moisture sensor', 'BME280', 'Relay + pump', 'LDR'],
    specs: { Board: 'ESP32', Sensors: '4', Actuators: 'Relay + 5V pump' },
  },
  // ---- Components ----
  { id: 'esp32-devkit', name: 'ESP32 DevKit V1', category: 'iot', level: 'Intermediate', price: 449, stock: 120, brand: 'Espressif', type: 'Microcontroller', badges: ['Beginner Friendly'], forWhat: 'The go-to board for Wi-Fi and Bluetooth projects.', specs: { MCU: 'Dual-core 240MHz', Flash: '4MB', GPIO: '30' } },
  { id: 'arduino-uno', name: 'Uno R3 Compatible Board', category: 'electronics', level: 'Beginner', price: 399, stock: 200, brand: 'CircuitBay', type: 'Microcontroller', badges: ['Beginner Friendly'], forWhat: 'The board most tutorials are written for.', specs: { MCU: 'ATmega328P', 'Digital I/O': '14', Analog: '6' } },
  { id: 'hc-sr04', name: 'HC-SR04 Ultrasonic Sensor', category: 'robotics', level: 'Beginner', price: 99, stock: 300, brand: 'Generic', type: 'Sensor', badges: ['Beginner Friendly'], forWhat: 'Measure distance to obstacles for robots and parking aids.', specs: { Range: '2cm – 4m', Voltage: '5V' } },
  { id: 'ir-sensor', name: 'IR Obstacle Sensor', category: 'robotics', level: 'Beginner', price: 49, stock: 3, brand: 'Generic', type: 'Sensor', badges: ['Low stock'], forWhat: 'Short-range edge and obstacle detection.', specs: { Range: '2 – 30cm', Output: 'Digital' } },
  { id: 'vl53l0x', name: 'VL53L0X ToF Distance Sensor', category: 'robotics', level: 'Intermediate', price: 349, stock: 40, brand: 'ST', type: 'Sensor', badges: [], forWhat: 'Millimetre-accurate distance for precise robots.', specs: { Range: 'up to 2m', Interface: 'I²C' } },
  { id: 'dht11', name: 'DHT11 Temperature & Humidity Sensor', category: 'iot', level: 'Beginner', price: 89, stock: 250, brand: 'Generic', type: 'Sensor', badges: ['Beginner Friendly'], forWhat: 'Read room temperature and humidity.', specs: { Temp: '0–50°C', Humidity: '20–90%' } },
  { id: 'mq135', name: 'MQ-135 Air Quality Sensor', category: 'iot', level: 'Intermediate', price: 179, stock: 60, brand: 'Generic', type: 'Sensor', badges: [], forWhat: 'Detect air-quality changes from gases like NH₃ and CO₂.', specs: { Output: 'Analog + digital', Voltage: '5V' } },
  { id: 'l298n', name: 'L298N Motor Driver', category: 'robotics', level: 'Beginner', price: 169, stock: 90, brand: 'Generic', type: 'Driver', badges: [], forWhat: 'Drive two DC motors in both directions.', specs: { Channels: '2', Current: '2A per channel' } },
  { id: 'esp32-cam', name: 'ESP32-CAM Module', category: 'ai', level: 'Advanced', price: 649, stock: 25, brand: 'AI-Thinker', type: 'Microcontroller', badges: [], forWhat: 'A tiny camera board for face detection and streaming.', specs: { Camera: 'OV2640', PSRAM: '4MB' } },
  { id: 'breadboard-830', name: '830-point Breadboard', category: 'electronics', level: 'Beginner', price: 79, stock: 400, brand: 'Generic', type: 'Prototyping', badges: ['Beginner Friendly'], forWhat: 'Build circuits without soldering.', specs: { Points: '830' } },
  { id: 'jumper-wires', name: 'Jumper Wire Set (120 pcs)', category: 'electronics', level: 'Beginner', price: 129, stock: 350, brand: 'Generic', type: 'Prototyping', badges: [], forWhat: 'M-M, M-F and F-F wires for every breadboard build.', specs: { Count: '120', Length: '20cm' } },
  { id: 'multimeter', name: 'Digital Multimeter', category: 'maker-tools', level: 'Beginner', price: 549, stock: 70, brand: 'Generic', type: 'Tool', badges: [], forWhat: 'Find out why your circuit is not working.', specs: { Ranges: 'V, A, Ω, continuity' } },
  { id: 'soldering-kit', name: 'Soldering Iron Starter Kit', category: 'maker-tools', level: 'Beginner', price: 799, stock: 45, brand: 'Generic', type: 'Tool', badges: [], forWhat: 'Everything to make your first permanent joints.', specs: { Power: '60W', Temp: 'Adjustable' } },
]

export const formatPrice = (n) => `₹${n.toLocaleString('en-IN')}`

export const getProduct = (id) => products.find((p) => p.id === id)

export const kits = products.filter((p) => p.kit)

export const bestsellers = ['esp32-devkit', 'arduino-uno', 'hc-sr04', 'breadboard-830'].map(getProduct)

// Order tracking steps (Part C7)
export const trackingSteps = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered']

// Payment methods (Part C6) — TODO_CLIENT: confirm gateway (Razorpay / Cashfree / other)
export const paymentMethods = [
  { id: 'upi', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm and more' },
  { id: 'card', label: 'Credit / Debit card', hint: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Net banking', hint: 'All major Indian banks' },
  { id: 'wallet', label: 'Wallets', hint: 'Paytm, Amazon Pay, and others' },
]

// FAQ (Part C9) — TODO_CLIENT: confirm every policy answer
export const faqGroups = [
  {
    title: 'Orders & Payment',
    items: [
      { q: 'What payment methods do you accept?', a: 'UPI, credit and debit cards, net banking and popular wallets through our secure payment gateway.' },
      { q: 'Is my payment secure?', a: 'Yes. Payments are processed securely by our payment partner. We never store your card details.' },
      { q: 'Can I cancel my order?', a: "You can cancel any order that hasn't been packed yet. Contact us with your order number and we'll sort it out." },
    ],
  },
  {
    title: 'Shipping & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'Most orders arrive within 3–7 working days, depending on your location.' },
      { q: 'Do you ship across India?', a: 'Yes, we ship to serviceable pin codes across India.' },
      { q: 'How do I track my order?', a: 'Use the Track Order page with your order ID and phone number or email.' },
    ],
  },
  {
    title: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'Unused items in original packaging can be returned within the return window. See our Refund policy for details.' },
      { q: 'What if a part arrives damaged or faulty?', a: "Tell us within 48 hours of delivery with a photo, and we'll replace it." },
      { q: 'How long do refunds take?', a: 'Refunds are processed to your original payment method within 5–7 working days of approval.' },
    ],
  },
  {
    title: 'Products & Kits',
    items: [
      { q: 'Which kit is right for a beginner?', a: 'Start with the Beginner Blink & Sense Kit — no soldering, 12 guided projects.' },
      { q: 'Do kits include a battery/cable?', a: 'Every kit lists exactly what is inside on its product page. USB cables are included with all board kits.' },
      { q: 'Are your components genuine?', a: 'We source from trusted suppliers and test boards before they ship.' },
    ],
  },
  {
    title: 'Schools & Bulk Orders',
    items: [
      { q: 'Do you offer bulk pricing for schools?', a: 'Yes. Contact us with your requirements for an institutional quote.' },
      { q: 'Can you supply components for a workshop?', a: 'Yes — we can kit out an entire workshop, and run it too.' },
    ],
  },
]
