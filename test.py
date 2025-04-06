import requests
import random

url = "http://localhost/api/products/new"

products = [
  {
    "name": "keyboard",
    "description": "mechanical RGB keyboard",
    "price": 15000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "monitor",
    "description": "27-inch 4K monitor",
    "price": 95000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "mouse",
    "description": "wireless gaming mouse",
    "price": 12000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "headphones",
    "description": "noise-cancelling over-ear",
    "price": 40000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "tablet",
    "description": "Samsung Galaxy Tab S8",
    "price": 250000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "smartphone",
    "description": "iPhone 14 Pro Max",
    "price": 620000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "printer",
    "description": "laser printer with scanner",
    "price": 70000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "router",
    "description": "Wi-Fi 6 dual-band router",
    "price": 23000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "external HDD",
    "description": "2TB USB 3.0",
    "price": 28000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "SSD",
    "description": "1TB NVMe M.2",
    "price": 37000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "webcam",
    "description": "Full HD streaming camera",
    "price": 18000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "microphone",
    "description": "USB condenser mic",
    "price": 22000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "graphics tablet",
    "description": "drawing tablet with pen",
    "price": 45000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "drone",
    "description": "camera drone 4K",
    "price": 190000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "e-reader",
    "description": "Kindle Paperwhite",
    "price": 35000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "projector",
    "description": "home cinema 1080p",
    "price": 80000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "gaming console",
    "description": "PlayStation 5",
    "price": 350000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "joystick",
    "description": "wireless dualshock controller",
    "price": 25000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "TV box",
    "description": "Android TV media box",
    "price": 30000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "VR headset",
    "description": "Oculus Quest 2",
    "price": 210000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "smartwatch",
    "description": "Apple Watch Series 8",
    "price": 180000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "fitness tracker",
    "description": "Xiaomi Mi Band 7",
    "price": 14000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "camera",
    "description": "Canon EOS M50 mirrorless",
    "price": 320000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "tripod",
    "description": "adjustable aluminum tripod",
    "price": 11000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "lighting kit",
    "description": "studio softbox lighting",
    "price": 33000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "USB hub",
    "description": "7-port powered hub",
    "price": 9000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "power bank",
    "description": "20,000mAh fast charging",
    "price": 18000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "gaming chair",
    "description": "ergonomic with lumbar support",
    "price": 85000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "laptop stand",
    "description": "adjustable aluminum stand",
    "price": 12000,
    "condition": "new",
    "category": "books",
    "status": "active"
  },
  {
    "name": "cooling pad",
    "description": "RGB laptop cooling base",
    "price": 9000,
    "condition": "new",
    "category": "books",
    "status": "active"
  }
]


for product in products:
    response = requests.post(url, json=product)
    print(f"{response.status_code} - {response.text}")