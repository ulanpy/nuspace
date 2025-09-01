# Contributing to Nuspace.kz

Welcome! This guide will help you contribute effectively to our project.

## Quick Start

1. **Setup**: Follow [README.md](./README.md#quick-start) for environment setup
2. **Pick an Issue**: Look for [`good first issue`](https://github.com/ulanpy/nuspace/labels/good%20first%20issue) or [`help wanted`](https://github.com/ulanpy/nuspace/labels/help%20wanted) labels
3. **Contribute**: Fork → Branch → Code → Test → PR

## Code of Conduct

Be respectful, constructive, and welcoming. Harassment or disrespectful behavior will not be tolerated.

## 🐛 Reporting Bugs

**Before reporting:** Search existing issues, check docs, reproduce consistently.

**📝 Bug Report Template:**
```markdown
## 🐛 Bug Report

**Description:** Brief description of the issue

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected vs Actual:** What should happen vs what does happen

**Environment:** OS, browser, version

**Additional Context:** Screenshots, logs, regression info
```

## 💡 Suggesting Enhancements

**Before suggesting:** Search existing issues, consider user impact and implementation complexity.

**📝 Enhancement Request Template:**
```markdown
## 💡 Enhancement Request

**Problem:** What issue does this solve?

**Solution:** Detailed description of the proposed feature

**Use Cases:** Who will benefit and how?

**Examples:** Screenshots, wireframes, or code examples

**Implementation Notes:** Technical considerations
```

## 🚀 Your First Code Contribution

**🎯 Good First Issues:**
- [`good first issue`](https://github.com/ulanpy/nuspace/labels/good%20first%20issue) - Perfect for newcomers
- [`help wanted`](https://github.com/ulanpy/nuspace/labels/help%20wanted) - We'd love your help
- [`documentation`](https://github.com/ulanpy/nuspace/labels/documentation) - Improve docs

**📋 Process:**
1. **Setup**: Fork → Clone → Follow [README.md](./README.md#quick-start)
2. **Pick Issue**: Browse labels → Comment to claim → Ask questions
3. **Code**: `git checkout -b feature/your-feature` → Code → Test
4. **Submit**: Push → Create PR → Request review

### 🔄 Pull Requests

**Before submitting:** Code works → Tests pass → Follows standards → Clear commits → Docs updated

**📋 PR Template:**
```markdown
## 📝 Description
Brief description of the changes

## 🏷️ Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature  
- [ ] 💥 Breaking change
- [ ] 📚 Documentation update

## 🧪 Testing
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] No new warnings

## 🔗 Related Issues
Closes #123
```

**Ready to contribute?** 🚀 Pick an issue and get started!


## Coding Standards

We use `pre-commit` hooks for code quality. They run automatically on each commit.

**Backend (Python/FastAPI):** PEP 8, Black, isort, Flake8, mypy  
**Frontend (TypeScript/React):** Prettier, ESLint, TypeScript strict mode  
**General:** Clear code, meaningful names, small functions, follow existing style

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format:** `<type>[optional scope]: <description>`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples:**
```
feat: add user profile page
fix(auth): resolve login redirect issue
docs: update API documentation
```

## Testing Guidelines

**Backend:** Unit tests (pytest), integration tests for APIs, critical logic coverage  
**Frontend:** React component tests (React Testing Library), user workflows, responsive design  
**General:** Test positive/negative scenarios, edge cases, mock external dependencies

## Questions?

1. Check documentation first (README.md, code comments)
2. Search existing issues
3. Open new issue with `question` label
4. Contact maintainers:
   - Email: [ulan.sharipov@nu.edu.kz](mailto:ulan.sharipov@nu.edu.kz)
   - Telegram: [@kamikadze24](https://t.me/kamikadze24)

## 🎉 Our Amazing Contributors

Contributors are recognized in documentation and release notes. Significant contributions get community shoutouts!

[![Contributors](https://img.shields.io/github/contributors/ulanpy/nuspace)](https://github.com/ulanpy/nuspace/graphs/contributors)

[<img src="https://contrib.rocks/image?repo=ulanpy/nuspace" alt="Contributors grid" />](https://github.com/ulanpy/nuspace/graphs/contributors)

Thank you for contributing to Nuspace.kz! 🚀
