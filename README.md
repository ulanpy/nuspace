# Nuspace.kz

<img align="right" width="150" src="./backend/core/configs/coverpage.jpg">

**Nuspace.kz** is a secure platform for Nazarbayev University students, accessible via `@nu.edu.kz` email verification. It restricts access to verified users, reducing fraud risk, and offers a set of services that streamline and centralize student communication—replacing unstructured Telegram chats with a more reliable and organized solution.

## Table of Contents

- [Nuspace.kz](#nuspacekz)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Prerequisites](#prerequisites)
  - [Setup Instructions](#setup-instructions)
    - [1. Clone the Repository](#1-clone-the-repository)
    - [2. Configure Environment Variables](#2-configure-environment-variables)
    - [3. Install Pre-commit Hooks](#3-install-pre-commit-hooks)
    - [4. Build and Run with Docker](#4-build-and-run-with-docker)
    - [5. Verify Setup](#5-verify-setup)
    - [6. Telegram Bot Localization binary compilation](#6-telegram-bot-localization-binary-compilation)
  - [Current Functionality and Roadmap](#current-functionality-and-roadmap)
  - [Development Guidelines](#development-guidelines)
  - [License](#license)
  - [Contributing](#contributing)
  - [Contact](#contact)

## Features

- Private and secure access for Nazarbayev University students.
- Centralized services to replace unstructured Telegram chats.
- Reliable and efficient communication platform.

## Tech Stack

**Nuspace.kz** is built with following technology stack:

**Backend:**

- **Framework:** FastAPI (Python)
- **Asynchronous Task Processing:** Celery
- **Database:** PostgreSQL
- **Caching:** Redis
- **Message Broker:** RabbitMQ
- **Search Engine:** Meilisearch

**Frontend:**

- **Language:** TypeScript
- **Framework/Library:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS

**DevOps & Infrastructure:**

- **Containerization:** Docker, Docker Compose
- **Web Server/Reverse Proxy:** Nginx
- **Tunneling:** Cloudflare Tunnel (Cloudflared)
- **Version Control:** Git & GitHub
- **CI/CD & Automation:** Pre-commit hooks, GitHub Actions
- **Database Management:** PgAdmin

## Prerequisites

To set up the project, ensure you have the following installed:

- [Docker](https://www.docker.com/)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/nuspace.git
cd nuspace/infra 
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and specify the TELEGRAM_BOT_TOKEN (create bot for yourself through @BotFather). Use the `.env.example` file as a reference:

```bash
cp .env.example .env
```

### 3. Build and Run with Docker

Build and start the project using Docker:

```bash
docker-compose up --build
```
Try code below if it doesn't work:

```bash
docker compose up --build
```
### 4. Verify Setup

Ensure the application is running by accessing the appropriate URL (e.g., [localhost](http://localhost)).

### Suggestion (optional). Install Pre-commit Hooks

Install `pre-commit` and set up Git hooks:

```bash
pip install pre-commit
pre-commit install
```
Try creating venv if code above doesn't work and try again:

```bash
python3 -m venv venv
source venv/bin/activate
```

## Development Guidelines

- Always use `pre-commit` to ensure code quality.
- Follow the contribution guidelines for submitting pull requests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.

## Contact

For any questions or support, please contact the maintainers at [ulan.sharipov@nu.edu.kz](mailto:ulan.sharipov@nu.edu.kz) or [telegram](https://t.me/kamikadze24).
