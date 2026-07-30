<div align="center">
  <img src="./backend/core/configs/coverpage.jpg" alt="Nuspace Logo" width="200" height="auto" style="border-radius: 10px; margin-bottom: 20px;">
  
  # Nuspace.kz
  
  **The superapp for NU students, offering campus services, announcements, and student essentials in one trusted, convenient platform.**
</div> 

## Table of Contents

- [Nuspace.kz](#nuspacekz)
  - [Table of Contents](#table-of-contents)
  - [Tech Stack](#tech-stack)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [DevOps \& Infrastructure](#devops--infrastructure)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
    - [1. Clone the Repository](#1-clone-the-repository)
    - [2. Configure Environment Variables](#2-configure-environment-variables)
    - [3. Build and Run](#3-build-and-run)
    - [4. Verify Setup](#4-verify-setup)
  - [Documentation](#documentation)
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact](#contact)

## Tech Stack

### Backend
![Python 3.12](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Meilisearch](https://img.shields.io/badge/Meilisearch-000000?style=for-the-badge&logo=meilisearch&logoColor=white)

### Frontend
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite 7](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### DevOps & Infrastructure
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)


## Prerequisites

Before setting up the project, ensure you have the following installed:

- [Docker](https://www.docker.com/) with Docker Compose (v2 recommended)
- [Git](https://git-scm.com/) 

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ulanpy/nuspace.git
cd nuspace/infra
```

### 2. Configure Environment Variables

Create a `.env` file using the provided example:

```bash
cp .env.example .env
```

**Important:** `infra/.env.example` is a local development template. Add a valid `TELEGRAM_BOT_TOKEN` (create a bot through [@BotFather](https://t.me/botfather) if needed). With `MOCK_KEYCLOAK=True` and `USE_GCS_EMULATOR=True`, Keycloak and GCP values marked as `secret` may remain local placeholders. Use development-only values for application secrets. `GEMINI_API_KEY` is needed only for local Gemini event extraction, while Grafana credentials are needed for the monitoring profile.

Staging and production receive their environment configuration through GCP Secret Manager. Do not reuse local placeholder values there; set `IS_DEBUG=False`, `MOCK_KEYCLOAK=False`, and `USE_GCS_EMULATOR=False`.

### 3. Build and Run

Start the application using Docker Compose:

```bash
# syntax from Compose v2.0 and above
docker compose up --build

# If older version try
docker-compose up --build
```

### 4. Verify Setup

Access the application at [localhost](http://localhost) to confirm everything is running correctly.

## Documentation

- [Workload Identity Federation](docs/wif-setup.md) - GitHub Actions authentication with GCP for the deployment pipeline
- [Monitoring Guide](infra/README.md) - Local and production monitoring stack configuration
- [Terraform Setup](terraform/README.md) - GCP infrastructure for staging and production
- [WireGuard VPN](infra/wg-easy/README.md) - Secure access to monitoring tools and internal services
- [SSH Access](docs/ssh-access.md) - Staging and production access through VPN and OS Login

## Contributing

We welcome contributions! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed guidelines.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or support, reach out to:

- **Email:** [ulan.sharipov@alumni.nu.edu.kz](mailto:ulan.sharipov@alumni.nu.edu.kz)
- **Nuspace dev chat:** https://t.me/nuspacedevcommunity
