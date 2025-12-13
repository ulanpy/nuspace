<div align="center">
  <img src="./backend/core/configs/coverpage.jpg" alt="Nuspace Logo" width="200" height="auto" style="border-radius: 10px; margin-bottom: 20px;">
  
  # Nuspace.kz
  
  **The superapp for NU students, offering campus services, announcements, and student essentials in one trusted, convenient platform.**
</div> 

## Table of Contents

- [Nuspace.kz](#nuspacekz)
  - [Tech Stack](#tech-stack)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Documentation](#documentation)
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact](#contact)

## Tech Stack

### Backend
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Meilisearch](https://img.shields.io/badge/Meilisearch-000000?style=for-the-badge&logo=meilisearch&logoColor=white)

### Frontend
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### DevOps & Infrastructure
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)


## Prerequisites

Before setting up the project, ensure you have the following installed:

- [Docker](https://www.docker.com/)
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

**Important:** Add your `TELEGRAM_BOT_TOKEN` (create a bot through [@BotFather](https://t.me/botfather) if needed).

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

- [Workload Identity Federation](docs/wif-setup.md) - GitHub Actions authentication with GCP for CI/CD pipeline
- [Monitoring Guide](infra/README.md) - What monitoring service stack is used and their connection details
- [Terraform Setup](terraform/README.md) - Provision cloud services for stage/production environments by IoC
- [WireGuard VPN](infra/wireguard/README.md) - Secure VPN access to monitoring tools and internal services

## Contributing

We welcome contributions! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed guidelines.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or support, reach out to:

- **Email:** [ulan.sharipov@nu.edu.kz](mailto:ulan.sharipov@nu.edu.kz)
- **Nuspace dev chat:** https://t.me/nuspacedevcommunity
