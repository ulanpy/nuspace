# Contributing to Nuspace.kz

First off, thank you for considering contributing to Nuspace.kz! We're excited to welcome contributions from the Nazarbayev University community and beyond. Your help is essential for making this platform better for everyone.

This document provides guidelines for contributing to the project. Please read it carefully to ensure a smooth and effective contribution process.

## Table of Contents

- [Contributing to Nuspace.kz](#contributing-to-nuspacekz)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [How Can I Contribute?](#how-can-i-contribute)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Enhancements](#suggesting-enhancements)
    - [Your First Code Contribution](#your-first-code-contribution)
    - [Pull Requests](#pull-requests)
  - [Development Setup](#development-setup)
  - [Coding Style](#coding-style)
  - [Commit Messages](#commit-messages)
  - [Questions?](#questions)

## Code of Conduct

While we don't have a formal Code of Conduct document yet, we expect all contributors to engage in a respectful and constructive manner. Please be considerate of others, value diverse perspectives, and help maintain a positive and welcoming environment. Harassment or any form of disrespectful behavior will not be tolerated.

## How Can I Contribute?

There are many ways to contribute to Nuspace.kz, from reporting bugs and suggesting features to writing code or improving documentation.

### Reporting Bugs

If you encounter a bug, please help us by reporting it!

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/ulanpy/nuspace/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/ulanpy/nuspace/issues/new). Be sure to include:
  - A **clear and descriptive title**.
  - **Steps to reproduce** the bug.
  - What you **expected to happen** and what **actually happened**.
  - Your **environment details** (e.g., browser version, OS) if relevant.
  - Screenshots or error messages if applicable.

### Suggesting Enhancements

We welcome suggestions for new features or improvements to existing functionality.

- **Check if the enhancement has already been suggested** by searching on GitHub under [Issues](https://github.com/ulanpy/nuspace/issues).
- If it hasn't, [open a new issue](https://github.com/ulanpy/nuspace/issues/new).
  - Provide a **clear and descriptive title**.
  - Explain **why this enhancement would be useful** to Nuspace.kz users.
  - Provide as much detail as possible about the **suggested functionality** and any potential use cases.

### Your First Code Contribution

Unsure where to begin contributing to Nuspace.kz? You can start by looking through `good first issue` or `help wanted` issues:

- [`Good first issues`](https://github.com/ulanpy/nuspace/labels/good%20first%20issue) - These are issues that are relatively easy to tackle and are a great way to get familiar with the codebase.
- [`Help wanted issues`](https://github.com/ulanpy/nuspace/labels/help%20wanted) - These are issues that the core team would appreciate help with.

### Pull Requests

If you'd like to contribute code, please follow these steps:

1.  **Fork the repository**: Click the "Fork" button on the [Nuspace.kz GitHub page](https://github.com/ulanpy/nuspace). This creates your own copy of the project.
2.  **Clone your fork**:
    ```bash
    git clone https://github.com/ulanpy/nuspace.git
    cd nuspace
    ```
3.  **Set up the development environment**: Follow the [Setup Instructions in the README.md](./README.md#setup-instructions) to get your local environment ready.
4.  **Create a new branch**: Create a descriptive branch name for your feature or bugfix.
    ```bash
    git checkout -b feature/your-feature-name  # For new features
    # or
    git checkout -b fix/issue-number-or-bug-name # For bug fixes
    ```
5.  **Make your changes**: Write your code and add any necessary tests.
6.  **Follow the [Coding Style](#coding-style)**: Ensure your code adheres to our style guidelines (enforced by pre-commit hooks).
7.  **Commit your changes**: Use [clear and descriptive commit messages](#commit-messages).
    ```bash
    git add .
    git commit -m "feat: Implement X feature"
    # or
    git commit -m "fix: Resolve Y bug in Z component"
    ```
8.  **Push to your fork**:
    ```bash
    git push origin feature/your-feature-name
    ```
9.  **Open a Pull Request (PR)**: Go to the original Nuspace.kz repository and open a new Pull Request from your forked branch to the `main` branch of the Nuspace.kz repository.
    - Provide a clear title and a detailed description of the changes you've made.
    - Link to any relevant issues (e.g., "Closes #123").
    - Ensure all CI checks (GitHub Actions) pass.
    - Be prepared to address any feedback or requested changes from the maintainers.

## Development Setup

Please refer to the [Setup Instructions in our README.md](./README.md#setup-instructions) for detailed guidance on setting up your development environment using Docker.

## Coding Style

We use `pre-commit` hooks to enforce code style and quality. Please ensure you have it [installed as per the README.md instructions](./README.md#3-install-pre-commit-hooks). The hooks will automatically check and format your code before each commit.

- **Backend (Python/FastAPI)**: We generally follow PEP 8, with linters like Flake8 and formatters like Black and isort managed via pre-commit.
- **Frontend (TypeScript/React)**: We use tools like ESLint and Prettier, also managed via pre-commit.

Please ensure your contributions pass all pre-commit checks.

## Commit Messages

We aim for clear and informative commit messages. While we don't strictly enforce a specific format like Conventional Commits yet, we encourage you to:

- Start with a short imperative verb (e.g., `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`).
- Write a concise summary in the first line (max 72 characters).
- Optionally, provide more details in the body of the commit message.

Example:

```
feat: Add user profile page

- Implement basic structure for the user profile.
- Display user information and activity.
```

## Questions?

If you have any questions about contributing, feel free to ask on the [project's Issues page](https://github.com/ulanpy/nuspace/issues) or contact the maintainers listed in the `README.md`.

Thank you for contributing to Nuspace.kz!
