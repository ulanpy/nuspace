import requests

url = "http://localhost/api/add-new-product"
data = {
    "name": "phone",
    "description": "Iphone",
    "price": 300000,
    "userId": "b78dd606-5004-4a6d-93c7-87c62734d9e0",
    "categoryId": 1
}

response = requests.post(url, json=data)
print(response)  # Print the response from the API
