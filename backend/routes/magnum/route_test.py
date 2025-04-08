import requests

url = "http://localhost:8000/api/grocery/new-grocery"  
data = {
    "name": "Apple",
    "price": 100,
    "quantity": 50,
    "category_id": 1,
    "company_id": 1
}


response = requests.post(url, json=data)


print(response.status_code)  
print(response.json())  
