import requests
import random

url = "http://localhost/api/products"

products = [
  {
    "name": "keyboard",
    "description": "mechanical RGB keyboard",
    "price": 15000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "monitor",
    "description": "27-inch 4K monitor",
    "price": 95000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "mouse",
    "description": "wireless gaming mouse",
    "price": 12000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "headphones",
    "description": "noise-cancelling over-ear",
    "price": 40000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "tablet",
    "description": "Samsung Galaxy Tab S8",
    "price": 250000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "smartphone",
    "description": "iPhone 14 Pro Max",
    "price": 620000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "printer",
    "description": "laser printer with scanner",
    "price": 70000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "router",
    "description": "Wi-Fi 6 dual-band router",
    "price": 23000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "external HDD",
    "description": "2TB USB 3.0",
    "price": 28000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "SSD",
    "description": "1TB NVMe M.2",
    "price": 37000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "webcam",
    "description": "Full HD streaming camera",
    "price": 18000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "microphone",
    "description": "USB condenser mic",
    "price": 22000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "graphics tablet",
    "description": "drawing tablet with pen",
    "price": 45000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "drone",
    "description": "camera drone 4K",
    "price": 190000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "e-reader",
    "description": "Kindle Paperwhite",
    "price": 35000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "projector",
    "description": "home cinema 1080p",
    "price": 80000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "gaming console",
    "description": "PlayStation 5",
    "price": 350000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "joystick",
    "description": "wireless dualshock controller",
    "price": 25000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "TV box",
    "description": "Android TV media box",
    "price": 30000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "VR headset",
    "description": "Oculus Quest 2",
    "price": 210000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "smartwatch",
    "description": "Apple Watch Series 8",
    "price": 180000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "fitness tracker",
    "description": "Xiaomi Mi Band 7",
    "price": 14000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "camera",
    "description": "Canon EOS M50 mirrorless",
    "price": 320000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "tripod",
    "description": "adjustable aluminum tripod",
    "price": 11000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "lighting kit",
    "description": "studio softbox lighting",
    "price": 33000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "USB hub",
    "description": "7-port powered hub",
    "price": 9000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "power bank",
    "description": "20,000mAh fast charging",
    "price": 18000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "gaming chair",
    "description": "ergonomic with lumbar support",
    "price": 85000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "laptop stand",
    "description": "adjustable aluminum stand",
    "price": 12000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  },
  {
    "name": "cooling pad",
    "description": "RGB laptop cooling base",
    "price": 9000,
    "condition": "New",
    "user_sub": "980c57df-5a38-446b-a93e-4ae84dcc26dd",
    "category": "Books",
    "status": "Active"
  }
]


for product in products:
    response = requests.post(url, json=product)
    print(f"{response.status_code} - {response.text}")