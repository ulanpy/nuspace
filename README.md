# Nuspace

Nuspace.kz is a secure platform for Nazarbayev University students, accessible via @nu.edu.kz email verification. It restricts access to verified users, reducing fraud risk, and offers a set of services that streamline and centralize student communication—replacing unstructured Telegram chats with a more reliable and organized solution.

## Features
- Private and secure access for Nazarbayev University students.
- Centralized services to replace unstructured Telegram chats.
- Reliable and efficient communication platform.

## Prerequisites
To set up the project, ensure you have the following installed:
- [Docker](https://www.docker.com/)
- [Pre-commit](https://pre-commit.com/)
- Google Cloud credentials (bucket name, project ID, topic, and `nuspace.json` file for bucket access).
- Keycloak credentials for Google Identity Provider (IDP).

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/nuspace.git
cd nuspace
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and specify the required environment variables. Use the `.env.example` file as a reference:
```bash
cp .env.example .env
```
Update the `.env` file with:
- Google Cloud bucket name, project ID, topic.
- Add `nuspace.json` under backend/core/configs/ directory. It is a service account credentials that has bucket access. Obtain it from [Googe Cloud Console](console.cloud.google.com)
- Keycloak credentials for Google IDP. You need to setup both Keycloak server and Google Oauth2.0
- Cloudflare Tunnel credentials. Go to [Zero Trust](https://one.dash.cloudflare.com/) to get these tunnels 
- Other variables such as database connections backend service configurations

### 3. Install Pre-commit Hooks
Install `pre-commit` and set up Git hooks:
```bash
pip install pre-commit
pre-commit install
```

### 4. Build and Run with Docker
Build and start the project using Docker:
```bash
docker-compose up --build
```

### 5. Verify Setup
Ensure the application is running by accessing the appropriate URL (e.g., [localhost](http://localhost)).

## Development Guidelines
- Always use `pre-commit` to ensure code quality.
- Follow the contribution guidelines for submitting pull requests.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing
We welcome contributions! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.

## Contact
For any questions or support, please contact the maintainers at [ulan.sharipov@nu.edu.kz](mailto:ulan.sharipov@nu.edu.kz) or [telegram](https://t.me/kamikadze24).  