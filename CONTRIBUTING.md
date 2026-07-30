# Contributing to Nuspace.kz

Welcome! This guide will help you contribute effectively to our project.

## Quick Start

1. **Setup**: Follow [README.md](./README.md#quick-start) for environment setup
2. **Choose a Task**: Check current issues or contact the maintainers to confirm that a task is still relevant
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

**🎯 Finding a Task:**

Review the current [GitHub Issues](https://github.com/ulanpy/nuspace/issues), but do not assume that an old or unassigned issue is still active. Ask the maintainers to confirm the scope before starting implementation. If no suitable issue exists, create an enhancement proposal or contact the maintainers with your idea first.

**📋 Process:**
1. **Setup**: Fork → Clone → Follow [README.md](./README.md#quick-start)
2. **Choose Task**: Check current issues → Confirm relevance and scope → Comment to claim
3. **Code**: Update `dev` → Create a feature branch → Code → Test
4. **Submit**: Push to your fork → Create a PR into `ulanpy/nuspace:dev` → Request review

### 🍴 Fork and Remote Setup

Fork [`ulanpy/nuspace`](https://github.com/ulanpy/nuspace) on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/nuspace.git
cd nuspace
git remote add upstream https://github.com/ulanpy/nuspace.git
git remote -v
```

The expected remote layout is:

- `origin` — your fork, where you push feature branches;
- `upstream` — the official Nuspace repository.

If you already cloned the official repository, you do not need to clone it again:

```bash
git remote rename origin upstream
git remote add origin https://github.com/YOUR_USERNAME/nuspace.git
git remote -v
```

Run the rename command only once. If the remotes already exist but use the wrong URLs, update them with `git remote set-url` instead.

### 🌿 Branch Workflow

Development work is based on `dev`. The `main` branch is used for production and should not be the base for regular feature work.

Update your local `dev` before creating a branch:

```bash
git fetch upstream
git switch dev
git merge --ff-only upstream/dev
git switch -c feat/short-description
```

If your local `dev` branch does not exist yet:

```bash
git fetch upstream
git switch -c dev --track upstream/dev
git switch -c feat/short-description
```

Use a focused branch name that describes the change:

```text
feat/events-telegram-publishing
fix/search-pagination
docs/update-contribution-flow
refactor/courses-planner-service
```

Do not develop directly on `dev` or `main`.

### 🔁 Keeping Your Branch Up to Date

Before opening or updating a pull request, rebase your feature branch onto the latest `upstream/dev`:

```bash
git fetch upstream
git switch feat/short-description
git rebase upstream/dev
```

If Git reports a conflict:

```bash
git status
# Edit and resolve the conflicted files
git add <resolved-files>
git rebase --continue
```

Repeat until the rebase completes. To safely return to the state before the rebase:

```bash
git rebase --abort
```

Push a new branch for the first time:

```bash
git push -u origin feat/short-description
```

If the branch was already pushed and its history changed after a rebase:

```bash
git push --force-with-lease origin feat/short-description
```

Use `--force-with-lease`, not `--force`: it prevents accidentally overwriting remote commits that you do not have locally. Do not rebase shared branches such as `dev` or `main`.

### 🔄 Pull Requests

**Before submitting:** Code works → Tests pass → Follows standards → Clear commits → Docs updated

Keep each pull request focused on one task. Large refactors and new features should normally be separate pull requests. In the description, explain what changed, why it changed, and how you verified it.

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

**Ready to contribute?** 🚀 Confirm a task and get started!

### ✅ Before Opening a Pull Request

Run the checks relevant to your change.

**Backend:**

```bash
cd backend
uv run ruff check .
uv run black --check .
uv run pytest
```

**Frontend:**

```bash
cd frontend
npm run build
npm run test:url-validation
```

Also verify the changed user flow manually when automated coverage does not exist. Include the commands you ran and the result in the pull request description.

## Coding Standards

We use `pre-commit` hooks with Ruff and Black for backend code quality.

**Backend (Python/FastAPI):** `uv`, Ruff, Black, pytest, module layering from [backend/README.md](backend/README.md)

**Frontend (TypeScript/React):** npm, TypeScript strict mode, Vite production build

**General:** Clear code, meaningful names, small functions, follow existing style

### 👍 Recommended Practices

- Keep pull requests small and focused; separate features from large refactors.
- Add tests for behavior changes and update affected documentation.
- Describe manual verification and include screenshots for visible UI changes.
- Review committed files and keep `.env`, secrets, local mocks, and generated artifacts out.
- Preserve backend module boundaries: `api.py → service.py → repository.py → database`.

### ⚠️ Common Mistakes

- Open pull requests into `dev`, not `main`.
- Create feature branches from the latest `upstream/dev`; do not commit to shared branches.
- Verify `origin` and `upstream` with `git remote -v` before pushing.
- After a rebase, use `git push --force-with-lease`, never plain `--force`.
- Split unrelated features, refactors, and cleanup into separate pull requests.
- Use the repository conventions: `uv` for backend dependencies, Compose from `infra/`, and `out/` for frontend builds.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format:** `<type>[optional scope]: <description>`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples:**
```
feat(events): add Telegram publishing
fix(search): resolve pagination issue
docs: update contribution flow
refactor(courses): split planner service
```

## Testing Guidelines

**Backend:** Unit tests (pytest), integration tests for APIs, critical logic coverage

**Frontend:** Existing targeted tests, production build, user workflows, responsive design

**General:** Test positive/negative scenarios, edge cases, mock external dependencies

## Questions?

1. Check documentation first (README.md, code comments)
2. Search existing issues
3. Open new issue with `question` label
4. Contact maintainers:
   - Email: [ulan.sharipov@alumni.nu.edu.kz](mailto:ulan.sharipov@alumni.nu.edu.kz)
   - Telegram: [@kamikadze24](https://t.me/kamikadze24)

## 🎉 Our Amazing Contributors

Contributors are recognized in documentation and release notes. Significant contributions get community shoutouts!

[![Contributors](https://img.shields.io/github/contributors/ulanpy/nuspace)](https://github.com/ulanpy/nuspace/graphs/contributors)

[<img src="https://contrib.rocks/image?repo=ulanpy/nuspace" alt="Contributors grid" />](https://github.com/ulanpy/nuspace/graphs/contributors)

Thank you for contributing to Nuspace.kz! 🚀
