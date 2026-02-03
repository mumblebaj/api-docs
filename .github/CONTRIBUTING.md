# 🤝 Contributing to Universal Schema Studio

First off, thank you for taking the time to contribute!  
Whether you’re fixing a typo, improving documentation, or adding a feature, every contribution helps this project grow.

---

## Contributor License Agreement (CLA)

By submitting a contribution to this repository, you agree that:

1. You grant the project maintainer a perpetual, worldwide, royalty-free,
   irrevocable license to use, modify, distribute, sublicense, and relicense
   your contribution as part of the project.

2. You confirm that you have the right to grant this license and that your
   contribution does not infringe on the rights of any third party.

3. You understand that your contribution may be included in both open-source
   and commercial versions of the project.

If you do not agree with these terms, please do not submit a contribution.

---

## 🧠 Table of Contents
1. [Project Setup](#project-setup)
2. [Branch Naming](#branch-naming)
3. [Commit Guidelines](#commit-guidelines)
4. [Pull Requests](#pull-requests)
5. [Testing & Quality](#testing--quality)
6. [Issue Reporting](#issue-reporting)
7. [Community Standards](#community-standards)

---

## 🧰 Project Setup

To run the project locally:

```bash
git clone https://github.com/mumblebaj/api-docs.git
cd api-docs
npm install   # if package.json exists, otherwise just open index.html
```

Run or preview locally (depending on your setup):

```bash
npm start     # or open index.html in browser
```
---

## 🌱 Branch Naming
Please use a descriptive branch name that follows this pattern:

| Type  | Example	                   |
| :------:| :------------------------  |
| Bug fix      | `fix/theme-switch-darkmode`    |
| Feature      | `feat/xsd-autodetect-root`   |
| Docs      | `docs/update-readme-links`	  |
| Refactor      | `refactor/dom-update-logic`   |

---

## ✍️ Commit Guidelines

- Write clear, concise commit messages.
- Use present tense: “Add feature” not “Added feature”.
- Reference issues when applicable:
    - fix: resolve async import issue (#42)

Example:

```gpsql
feat: add build-info cache buster in deploy workflow (#88)
```

---

## 🔀 Pull Requests

1. Fork the repository and create your branch from main.
2. Follow coding conventions and linting rules.
3. Test thoroughly before submitting.
4. Use the correct [PR template](../PULL_REQUEST_TEMPLATE.md) when creating your pull request:
    - 🪲 Bug Fix
    - ✨ Feature Enhancement
    - 📝 Documentation Update
5. Ensure CI passes before requesting review.

---

## ✅ Testing & Quality
Before committing, please verify:
- No console errors
- Dark/light theme renders correctly
- Responsive layout works across breakpoints
- Lint passes cleanly (npm run lint if applicable)

---

## 🪲 Issue Reporting

If you find a bug or have a feature request:
1. Go to Issues → New issue
2. Choose the appropriate template:
    - Bug Report
    - Feature Request
3. Provide as much context and reproducible steps as possible.

---

## 💬 Community Standards

Be kind, respectful, and constructive.
Review others’ contributions as you’d like yours reviewed — with curiosity and encouragement.

---

Thank you for contributing to Universal Schema Studio 💛
Your ideas and improvements make this project thrive!