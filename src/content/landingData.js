// Copy for the SEO landing pages: /schools, /final-year-projects,
// /request-a-part. DRAFT pending client sign-off — items marked TODO_CLIENT
// need real facts (packages, pricing, past schools, regions served).

// ------------------------------------------------------------ /schools --
export const schools = {
  seo: {
    title: 'ATL & Robotics Lab Setup for Schools',
    description:
      'Atal Tinkering Lab setup, robotics and STEM labs, teacher training and hands-on IoT & AI workshops for schools and colleges across India.',
  },
  eyebrow: 'ATAL TINKERING LABS · ROBOTICS & STEM LABS',
  headline: 'Robotics, STEM & Atal Tinkering Lab setup for schools',
  subhead:
    'We plan, equip and launch maker labs, train your teachers, and run the workshops that get students building — not just reading.',
  offerings: [
    { icon: 'lab', title: 'Lab planning & setup', body: 'Room layout, equipment list, installation and safety — a working lab, not a pile of boxes.' },
    { icon: 'kit', title: 'Equipment & kits', body: 'Electronics, robotics, IoT and tool kits matched to your grades, curriculum and budget.' },
    { icon: 'teacher', title: 'Teacher training', body: 'Hands-on sessions so your teachers can run the lab with confidence after we leave.' },
    { icon: 'curriculum', title: 'STREAM curriculum', body: 'Project-based lesson plans that fit your timetable, from Grade 6 to Grade 12.' },
    { icon: 'workshop', title: 'IoT & AI workshops', body: 'One- and two-day workshops where every student builds a working project.' },
    { icon: 'trophy', title: 'Competition mentoring', body: 'Guidance for science fairs, hackathons and innovation challenges.' },
  ],
  atl: {
    heading: 'Setting up an Atal Tinkering Lab (ATL)',
    paragraphs: [
      'Atal Tinkering Labs are dedicated innovation spaces in schools, set up under the Atal Innovation Mission (AIM), NITI Aayog, where students from Grade 6 to Grade 12 learn science, technology, engineering and maths by building things.',
      'A typical ATL brings together electronics and development boards, robotics kits, sensors and IoT modules, rapid-prototyping tools and hand tools. We help schools choose the right equipment, set the lab up safely, train the teachers who will run it and keep it busy with projects and competitions.',
      'Check the current AIM guidelines for eligibility, funding and application windows — we can help your school prepare. Not applying for ATL? We set up robotics and STEM labs to the same standard for any school or college budget.',
    ],
    // TODO_CLIENT: confirm exact ATL package contents, GeM listing status and pricing
  },
  process: [
    { title: 'Consultation', body: 'We understand your grades, space, goals and budget.' },
    { title: 'Lab plan', body: 'A room layout and equipment list you can approve.' },
    { title: 'Supply & install', body: 'Equipment delivered, installed and tested on site.' },
    { title: 'Teacher training', body: 'Your teachers learn to run sessions and maintain kits.' },
    { title: 'Launch workshop', body: 'Students build their first projects in the new lab.' },
    { title: 'Ongoing support', body: 'Curriculum, spare parts and competition mentoring.' },
  ],
  faq: [
    { q: 'Do you set up Atal Tinkering Labs?', a: 'Yes. We help schools plan, equip and launch Atal Tinkering Labs, train the teachers who will run them, and support the lab with projects and competitions afterwards.' },
    { q: 'Can you set up a lab for a school that is not part of the ATL scheme?', a: 'Yes. We set up robotics, electronics and STEM labs for any school or college, sized to your space and budget.' },
    { q: 'Which grades are your labs and workshops for?', a: 'Our programmes cover Grade 6 to Grade 12, and we run separate IoT, robotics and AI workshops for engineering and polytechnic students.' },
    { q: 'Do you train our teachers?', a: 'Yes. Every lab setup includes hands-on teacher training, and we offer standalone teacher-training sessions too.' },
    { q: 'Do you provide a curriculum?', a: 'Yes — a project-based STREAM curriculum with lesson plans that fit a regular school timetable.' },
    { q: 'How do we get started?', a: 'Send a workshop or lab request with your school details and we will set up a consultation.' },
  ],
}

// ------------------------------------------------ /final-year-projects --
export const finalYear = {
  seo: {
    title: 'Final Year IoT & Electronics Projects with Kits',
    description:
      'IoT, electronics and robotics project ideas for final-year engineering students — with parts lists, kits, step-by-step guides and mentoring.',
  },
  eyebrow: 'FOR ECE, EEE, CSE & DIPLOMA STUDENTS',
  headline: 'Final-year IoT & electronics projects — with the parts to build them',
  subhead:
    'Pick a project that solves a real problem, get every component in one order, and get help when the wiring or code fights back.',
  ideas: [
    { title: 'Smart agriculture: automatic irrigation', level: 'Intermediate', domain: 'IoT · ECE / EEE', parts: ['ESP32', 'Soil moisture sensor', 'Relay + 5 V pump', 'BME280'], demo: 'Waters plants automatically and shows soil moisture live on a phone.', kit: 'smart-agri-kit', project: 'smart-agriculture', guide: 'first-esp32-project-in-30-minutes' },
    { title: 'Smart washroom air-quality monitor', level: 'Intermediate', domain: 'IoT · ECE / CSE', parts: ['ESP32', 'MQ-135 gas sensor', 'OLED display', 'Buzzer'], demo: 'Alerts staff when air quality drops instead of cleaning on a fixed schedule.', kit: 'esp32-iot-starter', project: 'airloo' },
    { title: 'Obstacle-sensing navigation aid', level: 'Intermediate', domain: 'Assistive tech · ECE', parts: ['Arduino Nano', 'Ultrasonic or ToF sensor', 'Vibration motor', 'Battery pack'], demo: 'Warns a visually impaired user about obstacles with haptic feedback.', project: 'vazhikatti', guide: 'which-sensor-for-obstacle-detection' },
    { title: 'Line-following delivery robot', level: 'Beginner', domain: 'Robotics · ECE / Mech', parts: ['2WD chassis', 'L298N driver', 'IR sensor array', 'Arduino'], demo: 'Carries items along a marked route between rooms.', kit: 'line-follower-kit', project: 'line-follower', guide: 'line-follower-from-scratch' },
    { title: 'IoT weather station', level: 'Beginner', domain: 'IoT · ECE / CSE', parts: ['ESP32', 'BME280', 'Rain sensor', 'Solar power (optional)'], demo: 'Logs temperature, humidity and rainfall to a live dashboard.', project: 'weather-station', guide: 'datasheets-explained-what-to-read' },
    { title: 'Phone-controlled home automation', level: 'Beginner', domain: 'IoT · EEE / CSE', parts: ['ESP32', '4-channel relay', 'DHT11', 'Enclosure'], demo: 'Switches lights and fans from a phone and automates them by temperature.', kit: 'esp32-iot-starter', guide: 'esp32-vs-arduino-which-to-start-with' },
    { title: 'Face-detection door camera', level: 'Advanced', domain: 'Edge AI · CSE / ECE', parts: ['ESP32-CAM', 'FTDI programmer', 'PIR sensor', '5 V supply'], demo: 'Detects a face at the door and sends a snapshot over Wi-Fi.', kit: null, product: 'esp32-cam' },
    { title: 'Offline wake-word desk assistant', level: 'Advanced', domain: 'Edge AI · CSE', parts: ['ESP32-S3', 'I²S microphone', 'Speaker', 'LED ring'], demo: 'Recognises a wake word on the device itself — no cloud round-trip.', project: 'wake-word' },
  ],
  tips: [
    { h: 'Solve a problem people recognise', p: 'Examiners remember projects that fix something real — water wasted in a farm, a washroom nobody checks, a path that is hard to navigate. Start from the problem, then choose the sensors.' },
    { h: 'Make it demonstrable in five minutes', p: 'A live dashboard, a motor that moves, a buzzer that sounds. If the panel can see it working, you are halfway to a good grade.' },
    { h: 'Plan parts and time early', p: 'Order parts in the first month and buy a spare board. Most final-year projects slip because of one missing module, not because of the code.' },
    { h: 'Document as you build', p: 'Photos, wiring diagrams and short notes each week make the report and viva far easier — and make a great project write-up afterwards.' },
  ],
  faq: [
    { q: 'What is a good IoT project for a final-year student?', a: 'Smart agriculture, air-quality monitoring, home automation and weather stations are strong choices: they solve real problems, use affordable ESP32 hardware and are easy to demonstrate live.' },
    { q: 'Can you supply all the components for my project?', a: 'Yes. Order a matching kit or the individual parts, and if something is hard to find, use our request-a-part service and we will source it.' },
    { q: 'Do you help if my project is not working?', a: 'Yes. Our project support and mentoring help with wiring, code and debugging, and we mentor teams preparing for hackathons and exhibitions.' },
    { q: 'Should I use Arduino or ESP32 for my project?', a: 'Use an ESP32 if the project needs Wi-Fi or Bluetooth — most IoT projects do. Use an Arduino Uno for simpler robotics and sensor projects.' },
  ],
}

// ---------------------------------------------------- /request-a-part --
export const requestPart = {
  seo: {
    title: 'Request Hard-to-Find Electronic Components',
    description:
      "Can't find an electronic component, module or sensor in India? Tell us the part and we'll source it for your project, lab or production run.",
  },
  eyebrow: 'COMPONENT SOURCING',
  headline: "Can't find a part? We'll source it.",
  subhead:
    'Rare sensors, specific modules, exact part numbers or bulk quantities for a lab — tell us what you need and we will find it.',
  steps: [
    { title: 'Tell us the part', body: 'Part number, a datasheet or product link, and how many you need.' },
    { title: 'We find it', body: 'We check our suppliers and reply with availability, price and timeline.' },
    { title: 'You confirm', body: 'Approve the quote and we ship it with the rest of your order.' },
  ],
  faq: [
    { q: 'What kind of parts can you source?', a: 'Sensors, modules, development boards, ICs, connectors and tools that are not in our catalogue — for single projects, labs or small production runs.' },
    { q: 'How long does sourcing take?', a: 'It depends on the part and supplier; we tell you the expected timeline with the quote before you commit.' },
    { q: 'Is there a minimum quantity?', a: 'No — single parts for a student project are welcome, and we also quote for bulk orders.' },
  ],
}
