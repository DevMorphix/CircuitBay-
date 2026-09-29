// Shop products — generated file.
// In production builds scripts/pull-content.js overwrites this with the live
// catalog from the API. The committed copy is the draft seed data (it also
// seeds the API: server/scripts/build-seed.js). Edit content in /admin.
export default [
  {
    "id": "blink-sense-kit",
    "name": "Beginner Blink & Sense Kit",
    "category": "learning-kits",
    "kit": true,
    "level": "Beginner",
    "price": 899,
    "stock": 32,
    "brand": "CircuitBay",
    "type": "Kit",
    "badges": [
      "Student Kit",
      "Beginner Friendly"
    ],
    "forWhat": "Your very first circuits — lights, buttons, buzzers and sensors — with no soldering.",
    "build": "Traffic light, night lamp, reaction-time game",
    "inside": [
      "Arduino-compatible Uno",
      "Breadboard",
      "40 jumper wires",
      "LEDs & resistors",
      "LDR, buzzer, buttons"
    ],
    "specs": {
      "Board": "Uno R3 compatible",
      "Projects included": "12",
      "Soldering": "Not required"
    }
  },
  {
    "id": "esp32-iot-starter",
    "name": "ESP32 IoT Starter Kit",
    "category": "iot",
    "kit": true,
    "level": "Intermediate",
    "price": 1499,
    "stock": 18,
    "brand": "CircuitBay",
    "type": "Kit",
    "badges": [
      "Student Kit"
    ],
    "forWhat": "Build devices that talk to your phone and the cloud over Wi-Fi and Bluetooth.",
    "build": "Wi-Fi thermometer, phone-controlled lamp, cloud data logger",
    "inside": [
      "ESP32 DevKit",
      "DHT11",
      "Relay module",
      "OLED display",
      "Breadboard & wires"
    ],
    "specs": {
      "Board": "ESP32-WROOM-32",
      "Connectivity": "Wi-Fi + BLE",
      "Projects included": "10"
    }
  },
  {
    "id": "line-follower-kit",
    "name": "Line-Follower Robot Kit",
    "category": "robotics",
    "kit": true,
    "level": "Intermediate",
    "price": 1899,
    "stock": 4,
    "brand": "CircuitBay",
    "type": "Kit",
    "badges": [
      "Student Kit",
      "Low stock"
    ],
    "forWhat": "A two-wheel robot that follows a track — the classic competition starter.",
    "build": "Line follower, obstacle avoider, maze solver",
    "inside": [
      "2WD chassis",
      "L298N motor driver",
      "5-channel IR array",
      "Arduino Nano",
      "Battery holder"
    ],
    "specs": {
      "Drive": "2WD with caster",
      "Motor driver": "L298N",
      "Controller": "Nano"
    }
  },
  {
    "id": "smart-agri-kit",
    "name": "Smart Home / Agriculture Sensor Kit",
    "category": "iot",
    "kit": true,
    "level": "Advanced",
    "price": 2299,
    "stock": 12,
    "brand": "CircuitBay",
    "type": "Kit",
    "badges": [
      "Student Kit"
    ],
    "forWhat": "Sense soil, air and light, then act on it automatically — irrigation, fans, alerts.",
    "build": "Auto-irrigation, room climate monitor, smart alerts",
    "inside": [
      "ESP32",
      "Soil moisture sensor",
      "BME280",
      "Relay + pump",
      "LDR"
    ],
    "specs": {
      "Board": "ESP32",
      "Sensors": "4",
      "Actuators": "Relay + 5V pump"
    }
  },
  {
    "id": "esp32-devkit",
    "name": "ESP32 DevKit V1",
    "category": "iot",
    "level": "Intermediate",
    "price": 449,
    "stock": 120,
    "brand": "Espressif",
    "type": "Microcontroller",
    "badges": [
      "Beginner Friendly"
    ],
    "forWhat": "The go-to board for Wi-Fi and Bluetooth projects.",
    "specs": {
      "MCU": "Dual-core 240MHz",
      "Flash": "4MB",
      "GPIO": "30"
    }
  },
  {
    "id": "arduino-uno",
    "name": "Uno R3 Compatible Board",
    "category": "electronics",
    "level": "Beginner",
    "price": 399,
    "stock": 200,
    "brand": "CircuitBay",
    "type": "Microcontroller",
    "badges": [
      "Beginner Friendly"
    ],
    "forWhat": "The board most tutorials are written for.",
    "specs": {
      "MCU": "ATmega328P",
      "Digital I/O": "14",
      "Analog": "6"
    }
  },
  {
    "id": "hc-sr04",
    "name": "HC-SR04 Ultrasonic Sensor",
    "category": "robotics",
    "level": "Beginner",
    "price": 99,
    "stock": 300,
    "brand": "Generic",
    "type": "Sensor",
    "badges": [
      "Beginner Friendly"
    ],
    "forWhat": "Measure distance to obstacles for robots and parking aids.",
    "specs": {
      "Range": "2cm – 4m",
      "Voltage": "5V"
    }
  },
  {
    "id": "ir-sensor",
    "name": "IR Obstacle Sensor",
    "category": "robotics",
    "level": "Beginner",
    "price": 49,
    "stock": 3,
    "brand": "Generic",
    "type": "Sensor",
    "badges": [
      "Low stock"
    ],
    "forWhat": "Short-range edge and obstacle detection.",
    "specs": {
      "Range": "2 – 30cm",
      "Output": "Digital"
    }
  },
  {
    "id": "vl53l0x",
    "name": "VL53L0X ToF Distance Sensor",
    "category": "robotics",
    "level": "Intermediate",
    "price": 349,
    "stock": 40,
    "brand": "ST",
    "type": "Sensor",
    "badges": [],
    "forWhat": "Millimetre-accurate distance for precise robots.",
    "specs": {
      "Range": "up to 2m",
      "Interface": "I²C"
    }
  },
  {
    "id": "dht11",
    "name": "DHT11 Temperature & Humidity Sensor",
    "category": "iot",
    "level": "Beginner",
    "price": 89,
    "stock": 250,
    "brand": "Generic",
    "type": "Sensor",
    "badges": [
      "Beginner Friendly"
    ],
    "forWhat": "Read room temperature and humidity.",
    "specs": {
      "Temp": "0–50°C",
      "Humidity": "20–90%"
    }
  },
  {
    "id": "mq135",
    "name": "MQ-135 Air Quality Sensor",
    "category": "iot",
    "level": "Intermediate",
    "price": 179,
    "stock": 60,
    "brand": "Generic",
    "type": "Sensor",
    "badges": [],
    "forWhat": "Detect air-quality changes from gases like NH₃ and CO₂.",
    "specs": {
      "Output": "Analog + digital",
      "Voltage": "5V"
    }
  },
  {
    "id": "l298n",
    "name": "L298N Motor Driver",
    "category": "robotics",
    "level": "Beginner",
    "price": 169,
    "stock": 90,
    "brand": "Generic",
    "type": "Driver",
    "badges": [],
    "forWhat": "Drive two DC motors in both directions.",
    "specs": {
      "Channels": "2",
      "Current": "2A per channel"
    }
  },
  {
    "id": "esp32-cam",
    "name": "ESP32-CAM Module",
    "category": "ai",
    "level": "Advanced",
    "price": 649,
    "stock": 25,
    "brand": "AI-Thinker",
    "type": "Microcontroller",
    "badges": [],
    "forWhat": "A tiny camera board for face detection and streaming.",
    "specs": {
      "Camera": "OV2640",
      "PSRAM": "4MB"
    }
  },
  {
    "id": "breadboard-830",
    "name": "830-point Breadboard",
    "category": "electronics",
    "level": "Beginner",
    "price": 79,
    "stock": 400,
    "brand": "Generic",
    "type": "Prototyping",
    "badges": [
      "Beginner Friendly"
    ],
    "forWhat": "Build circuits without soldering.",
    "specs": {
      "Points": "830"
    }
  },
  {
    "id": "jumper-wires",
    "name": "Jumper Wire Set (120 pcs)",
    "category": "electronics",
    "level": "Beginner",
    "price": 129,
    "stock": 350,
    "brand": "Generic",
    "type": "Prototyping",
    "badges": [],
    "forWhat": "M-M, M-F and F-F wires for every breadboard build.",
    "specs": {
      "Count": "120",
      "Length": "20cm"
    }
  },
  {
    "id": "multimeter",
    "name": "Digital Multimeter",
    "category": "maker-tools",
    "level": "Beginner",
    "price": 549,
    "stock": 70,
    "brand": "Generic",
    "type": "Tool",
    "badges": [],
    "forWhat": "Find out why your circuit is not working.",
    "specs": {
      "Ranges": "V, A, Ω, continuity"
    }
  },
  {
    "id": "soldering-kit",
    "name": "Soldering Iron Starter Kit",
    "category": "maker-tools",
    "level": "Beginner",
    "price": 799,
    "stock": 45,
    "brand": "Generic",
    "type": "Tool",
    "badges": [],
    "forWhat": "Everything to make your first permanent joints.",
    "specs": {
      "Power": "60W",
      "Temp": "Adjustable"
    }
  }
]
