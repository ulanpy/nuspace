# Contributing to Nuspace.kz

This document provides comprehensive guidelines for contributing to the project. Please read it carefully to ensure a smooth and effective contribution process.

## Table of Contents

- [Contributing to Nuspace.kz](#contributing-to-nuspacekz)
  - [Code of Conduct](#code-of-conduct)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Your First Code Contribution](#your-first-code-contribution)
   - [Pull Requests](#pull-requests)
  - [Development Setup](#development-setup)
  - [Coding Standards](#coding-standards)
  - [Commit Messages](#commit-messages)
  - [Testing Guidelines](#testing-guidelines)
  - [Questions?](#questions)

## Code of Conduct

While we don't have a formal Code of Conduct document yet, we expect all contributors to engage in a respectful and constructive manner. Please be considerate of others, value diverse perspectives, and help maintain a positive and welcoming environment. Harassment or any form of disrespectful behavior will not be tolerated.

## 🐛 Reporting Bugs

**Before reporting a bug, please:**
- ✅ Search existing issues to avoid duplicates
- ✅ Check documentation for configuration issues  
- ✅ Try to reproduce the issue consistently
- ✅ Test on different browsers/devices if applicable

**When reporting, include:**

| What to Include | Description |
|----------------|-------------|
| **Clear title** | Brief, descriptive summary |
| **Reproduction steps** | Step-by-step instructions |
| **Expected vs Actual** | What should happen vs what does happen |
| **Environment details** | OS, browser, version, etc. |
| **Screenshots/logs** | Visual evidence or error messages |
| **Regression info** | Did it work before? |

**📝 Bug Report Template:**
```markdown
## 🐛 Bug Report

### Description
Brief description of the issue

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Environment
- **OS:** [e.g., Windows 11, macOS 14.0, Ubuntu 22.04]
- **Browser:** [e.g., Chrome 120, Firefox 121]
- **Version:** [e.g., 1.2.3]

### Additional Context
- Screenshots, error messages, or logs
- Is this a regression? (worked before, doesn't work now)
```

## 💡 Suggesting Enhancements

**Before suggesting, consider:**
- 🔍 Search existing issues for similar requests
- 🎯 Think about user impact and value
- ⚡ Consider implementation complexity
- 🔄 Check if there are alternative solutions

**When suggesting, provide:**

| Element | Details |
|---------|---------|
| **Clear problem statement** | What issue does this solve? |
| **Detailed solution** | How should it work? |
| **Use cases** | Who will benefit and how? |
| **Mockups/wireframes** | Visual examples if applicable |
| **Implementation notes** | Technical considerations |

**📝 Enhancement Request Template:**
```markdown
## 💡 Enhancement Request

### Problem Statement
What problem does this solve? What's the current limitation?

### Proposed Solution
Detailed description of the proposed feature/improvement

### Use Cases
- **Use case 1:** [description]
- **Use case 2:** [description]

### Mockups/Examples
[Add screenshots, wireframes, or code examples]

### Alternatives Considered
Any alternative solutions you've thought about

### Implementation Notes
Technical considerations or dependencies
```

## 🚀 Your First Code Contribution

**New to the project? Start here:**

#### 🎯 Good First Issues
- [`good first issue`](https://github.com/ulanpy/nuspace/labels/good%20first%20issue) - Perfect for newcomers
- [`help wanted`](https://github.com/ulanpy/nuspace/labels/help%20wanted) - We'd love your help
- [`documentation`](https://github.com/ulanpy/nuspace/labels/documentation) - Improve docs
- [`bug`](https://github.com/ulanpy/nuspace/labels/bug) - Fix bugs

#### 📋 Getting Started Checklist

1. **🔧 Setup Environment**
   ```bash
   # Fork and clone
   git clone https://github.com/YOUR_USERNAME/nuspace.git
   cd nuspace
   
   # Follow setup instructions in README.md
   ```

2. **🎯 Pick an Issue**
   - Browse issues with labels above
   - Comment "I'd like to work on this" to claim it
   - Ask questions if anything is unclear

3. **🌿 Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number
   ```

4. **💻 Code & Test**
   - Follow our [coding standards](#coding-standards)
   - Write tests for your changes
   - Test thoroughly before submitting

5. **📤 Submit PR**
   - Push your branch
   - Create pull request with detailed description
   - Request review from maintainers

### 🔄 Pull Requests

**Before submitting your PR:**

| Checklist Item | Status |
|----------------|--------|
| ✅ Code works and passes tests | |
| ✅ Follows coding standards | |
| ✅ Clear commit messages | |
| ✅ Documentation updated | |
| ✅ Tests added/updated | |
| ✅ No new warnings | |

**📝 PR Process:**

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number
   ```

2. **Make Changes & Commit**
   ```bash
   git add .
   git commit -m "feat: Add user profile page"
   ```

3. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Then create PR on GitHub
   ```

**📋 PR Template:**
```markdown
## 📝 Description
Brief description of the changes

## 🏷️ Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update

## 🧪 Testing
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## ✅ Checklist
- [ ] I have read the [CONTRIBUTING.md](CONTRIBUTING.md) document
- [ ] My code follows the project's coding standards
- [ ] I have updated the documentation as necessary
- [ ] I have linked this PR to the relevant issue(s)

## 📸 Screenshots (if applicable)
[Add screenshots for UI changes]

## 🔗 Related Issues
Closes #123
```

### 🎉 Contribution Recognition

- **Contributors** will be recognized in project documentation
- **Significant contributions** highlighted in release notes
- **Community shoutouts** for impactful work
- **Mentorship opportunities** for regular contributors

**Ready to contribute?** 🚀 Pick an issue and get started!

## Development Setup

Please refer to the [Quick Start section in our README.md](./README.md#quick-start) for detailed guidance on setting up your development environment.

**Quick Setup:**
```bash
# Clone and navigate
git clone https://github.com/ulanpy/nuspace.git
cd nuspace/infra

# Configure environment
cp .env.example .env
# Edit .env with your TELEGRAM_BOT_TOKEN

# Start the application
docker-compose up --build
```

**(Optional) For Development:**
```bash
# Set up pre-commit hooks
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install pre-commit
pre-commit install
```

## Coding Standards

We use `pre-commit` hooks to enforce code quality and consistency. The hooks will automatically run on each commit and ensure your code meets our standards.

### Backend (Python/FastAPI)
- **Style Guide**: PEP 8
- **Formatter**: Black
- **Import Sorting**: isort
- **Linting**: Flake8
- **Type Checking**: mypy (where applicable)

### Frontend (TypeScript/React)
- **Formatter**: Prettier
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Component Structure**: Functional components with hooks

### General Guidelines
- **Write clear, readable code** with meaningful variable names
- **Add comments** for complex logic
- **Keep functions small** and focused on a single responsibility
- **Write self-documenting code** when possible
- **Follow the existing code style** in the file you're modifying

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

**Format:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
```
feat: add user profile page

- Implement basic profile structure
- Add avatar upload functionality
- Include user statistics display

Closes #123
```

```
fix(auth): resolve login redirect issue

The login redirect was not working properly on mobile devices
due to incorrect URL handling in the authentication flow.
```

## Testing Guidelines

**Backend Testing:**
- Write unit tests for new functions and classes
- Add integration tests for API endpoints
- Ensure test coverage for critical business logic
- Use pytest for testing framework

**Frontend Testing:**
- Write unit tests for React components
- Add integration tests for user workflows
- Test responsive design on different screen sizes
- Use React Testing Library for component testing

**General Testing:**
- Test both positive and negative scenarios
- Include edge cases and error conditions
- Ensure tests are fast and reliable
- Mock external dependencies appropriately

## Questions?

If you have questions about contributing:

1. **Check the documentation** first (README.md, code comments, etc.)
2. **Search existing issues** to see if your question has been answered
3. **Open a new issue** with the `question` label
4. **Contact the maintainers**:
   - Email: [ulan.sharipov@nu.edu.kz](mailto:ulan.sharipov@nu.edu.kz)
   - Telegram: [@kamikadze24](https://t.me/kamikadze24)

## Recognition

Contributors will be recognized in our project documentation and release notes. Significant contributions may also be highlighted in our community communications.

### Our Amazing Contributors

<div id="contributors-container">
  <p>Loading contributors...</p>
</div>

<script>
// Fetch contributors from GitHub API
async function loadContributors() {
  try {
    const response = await fetch('https://api.github.com/repos/ulanpy/nuspace/contributors');
    const contributors = await response.json();
    
    const container = document.getElementById('contributors-container');
    
    if (contributors.length === 0) {
      container.innerHTML = '<p>No contributors found.</p>';
      return;
    }
    
    // Create contributors grid
    const contributorsHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
        ${contributors.map(contributor => `
          <div style="display: flex; align-items: center; padding: 0.5rem; border: 1px solid #e1e4e8; border-radius: 6px; background: #f6f8fa;">
            <img src="${contributor.avatar_url}" 
                 alt="${contributor.login}" 
                 style="width: 40px; height: 40px; border-radius: 50%; margin-right: 0.75rem;">
            <div>
              <a href="${contributor.html_url}" 
                 style="font-weight: 600; color: #0366d6; text-decoration: none;">
                ${contributor.login}
              </a>
              <div style="font-size: 0.875rem; color: #586069;">
                ${contributor.contributions} contribution${contributor.contributions !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="margin-top: 1rem; font-size: 0.875rem; color: #586069;">
        <em>Contributors are automatically fetched from GitHub API. Last updated: ${new Date().toLocaleDateString()}</em>
      </p>
    `;
    
    container.innerHTML = contributorsHTML;
  } catch (error) {
    console.error('Error loading contributors:', error);
    document.getElementById('contributors-container').innerHTML = 
      '<p>Unable to load contributors. Please check the <a href="https://github.com/ulanpy/nuspace/graphs/contributors">GitHub contributors page</a>.</p>';
  }
}

// Load contributors when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadContributors);
} else {
  loadContributors();
}
</script>

Thank you for contributing to Nuspace.kz! 🚀
