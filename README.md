# 🧾 Universal Schema Studio
![Universal Schema Studio Banner](docs/banner_new.png)

<p align="center"> <a href="https://mumblebaj.github.io/api-docs/"><img src="https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge&logo=githubpages" alt="Live Demo"></a> <a href="https://github.com/mumblebaj/api-docs/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT"></a> <img src="https://img.shields.io/badge/Status-Stable-brightgreen?style=for-the-badge" alt="Status: Stable"> <img src="https://img.shields.io/badge/Dark%20Mode-Fully%20Supported-555555?style=for-the-badge&logo=github" alt="Dark Mode Supported"> <img src="https://img.shields.io/badge/Deployed%20on-GitHub%20Pages-121013?style=for-the-badge&logo=githubpages" alt="GitHub Pages"> </p>

A lightweight browser-based tool for viewing, converting, and exploring OpenAPI YAML/JSON and XSD/XML schemas — with built-in Redoc rendering and full dark-mode support.

---

## Name & Branding

"Universal Schema Studio" and "USS" are project names associated with this
repository and its official distributions.

Forks are welcome under the terms of the open-source license, but may not
use the "Universal Schema Studio" name, branding, or logos in a way that
implies official endorsement or origin.

---

## Licensing Note

Universal Schema Studio is currently released under the MIT License.

We are exploring additional commercial offerings (USS Pro / USS Cloud).
The open-source core will remain available, and any future licensing
changes will be clearly communicated in advance.

---

## 🌐 Live Demo

👉 [View on GitHub Pages](https://mumblebaj.github.io/api-docs/)

or use my custom domain: [schema.mumblebaj.xyz](https://schema.mumblebaj.xyz)

---

## 🧩 Overview

The Universal Schema Studio lets you drag-and-drop or browse to load either:

- OpenAPI / Swagger YAML or JSON → rendered instantly using [ReDoc](https://github.com/Redocly/redoc)

- XSD / XML Schema Definition files → automatically converted to OpenAPI format and visualized via ReDoc

No backend, no uploads — everything runs locally in your browser.

---

## ✨ Key Features

- ✅ Dual Viewer Modes
- ✅ Automatic Format Detection
- ✅ Full Dark Mode with ReDoc Overrides
- ✅ Offline & Privacy-First
- ✅ Responsive Layout for All Devices

---

## ⚙️ Project Structure

```plaintext
📁 project-root/
├── index.html
├── favicon.svg / favicon.png
├── css/
│   └── style.css
├── js/
│   ├── yamlViewer.js
│   └── xsdViewer.js
```

---

## 🧑‍💻 Local Development
```bash
git clone https://github.com/mumblebaj/api-docs.git
cd api-docs
npx http-server . -p 8080
```
Then visit → http://localhost:8080

---

## 🧠 Technical Highlights

- Language: Vanilla JavaScript (ES Modules)
- Renderer: ReDoc Standalone
- XSD → OpenAPI Conversion: Custom DOMParser-based transformation
- Dark Mode: CSS variables + localStorage persistence
- No Build Tools: Works 100% offline and dependency-free

---

## 🛠️ Customization
Modify:
- Colors → `:root` in `style.css`
- Themes → `redocThemes` in `xsdViewer.js`
- Layout → `yamlViewer.js` and `xsdViewer.js`

---

## 🧭 Development Roadmap

| Status  | Feature	                   | Description                                             |  
| :------:| :------------------------  | :-----------------------------------------------------  |
| ✅      | Dark Mode Enhancements    | Deep ReDoc integration for tables, buttons, and spans.   |
| ✅      | Safe ReDoc Re-rendering   | Introduced safeRenderRedoc() to prevent race conditions. |
| 🔄      | Export Schema as JSON	  | Download converted XSD → OpenAPI as .json.               |
| 🔄      | Side-by-side Comparison   | Compare YAML vs. converted schema visually.              |
| 🔄      | Multi-file Merge          | Combine multiple XSDs into one OpenAPI doc.              |
| 🧩      | ReDoc v3 Migration        | Evaluate ReDoc v3 renderer.                              |
| 💡      | Syntax Highlighting       | Optional Prism.js-based raw YAML/XML view.               |
| 🧱      | Dockerized Local Version  |Self-hostable container for offline environments.         |

---

## 🧰 Built With
<p align="center"> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"></a> <a href="https://redocly.com/"><img src="https://img.shields.io/badge/ReDoc-OpenAPI%20Renderer-E34F26?style=for-the-badge&logo=redocly&logoColor=white" alt="ReDoc"></a> <a href="https://www.w3.org/XML/Schema"><img src="https://img.shields.io/badge/W3C-XML%20Schema-blue?style=for-the-badge&logo=w3c&logoColor=white" alt="XSD/XML"></a> <a href="https://developer.mozilla.org/en-US/docs/Web/API/DOMParser"><img src="https://img.shields.io/badge/DOMParser-Built--in%20Browser%20API-orange?style=for-the-badge&logo=firefoxbrowser&logoColor=white" alt="DOMParser"></a> <a href="https://pages.github.com/"><img src="https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-181717?style=for-the-badge&logo=githubpages&logoColor=white" alt="GitHub Pages"></a> </p>

---

## 🤝 Contributing

Contributions are welcome!
To contribute:
1. Fork the repository
2. Create a branch:
```bash
git checkout -b feature/your-feature
```
3. Commit changes:
```bash
git commit -m "Add feature: description"
```
4. Push and open a Pull Request
Before submitting:
- Ensure consistent formatting (`eslint` / `prettier`)
- Write descriptive commit messages
- Test locally before PR submission
💡 Have an idea or found a bug?
→ [Open an Issue](https://github.com/mumblebaj/api-docs/issues)

---

## 📄 License
MIT License © 2025 [![license](https://img.shields.io/github/license/mashape/apistatus.svg)](LICENSE)

---

## 💬 Acknowledgements
- [ReDoc](https://github.com/Redocly/redoc) — API documentation engine
- [YAML](https://yaml.org/) & [OpenAPI Initiative](https://www.openapis.org/)
- XML Schema (W3C)
- Icons and layout inspired by Swagger Editor and other open developer tools

---

## Commercial Use

Universal Schema Studio is used internally by teams exploring schema governance,
documentation, and conversion workflows.

If you’re interested in:
- Self-hosted enterprise usage
- Custom exporters or integrations
- Internal training or support

You can reach out via GitHub Issues or discussions.
