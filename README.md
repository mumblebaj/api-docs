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

<details>
<summary>Show full directory tree</summary>

```plaintext

.
📁 project-root/
│   build-info.json
│   CHANGELOG.md
│   LICENSE
│   README.md
│   structure.txt
│
├───.github
│   │   CODE_OF_CONDUCT.md
│   │   CONTRIBUTING.md
│   │   PULL_REQUEST_TEMPLATE.md
│   │   PULL_REQUEST_TEMPLATE.yml
│   │
│   ├───ISSUE_TEMPLATE
│   │       bug_report.yml
│   │       config.yml
│   │       feature_request.yml
│   │
│   ├───PULL_REQUEST_TEMPLATE
│   │       bug_fix.md
│   │       documentation_update.md
│   │       feature_enhancement.md
│   │
│   └───workflows
│           delete_old_jobs.yml
│           docs.yml
│
├───.vscode
│       settings.json
│
├───css
│       openapiEditor.css
│       style.css
│
├───docs
│       banner_new.png
│       CNAME
│       favicon.png
│       favicon.svg
│       index.html
│       openapiEditor.html
│       xmlViewer.html
│
├───js
│   │   buildVersion.js
│   │   openapiEditor.js
│   │   swagger-client.browser.min.js
│   │   template.js
│   │   viewTracker.js
│   │   xmlViewer.js
│   │   xsdViewer.js
│   │   yamlViewer.js
│   │
│   ├───exporter
│   │       docModel.js
│   │       downloadUtils.js
│   │       exportConfluence.js
│   │       exportMarkdown.js
│   │
│   ├───schemaExport
│   │       dependencyResolver.js
│   │       schemaExportModal.js
│   │       selectionUtils.js
│   │
│   └───ui
│           dropdown.js
│           toast.js
│
└───tutor
    │   index.html
    │   styles.css
    │
    ├───js
    │       lessons.js
    │       monaco-setup.js
    │       openapi-model.js
    │       refs.js
    │       structure.txt
    │       teaching-markers.js
    │       teaching-rules.js
    │       tutor.js
    │       ui.js
    │       yaml-doctor.js
    │       yaml-utils.js
    │
    └───lessons
            basics.md
            indentation.md
            lesson2.md
            lesson3.md
            lesson_acord_basics.md
            lesson_anchors.md
            lesson_api_lifecycle.md
            lesson_argocd_gitops.md
            lesson_arrays.md
            lesson_asyncapi_intro.md
            lesson_asyncapi_streams.md
            lesson_backward_compat.md
            lesson_callbacks.md
            lesson_callback_security.md
            lesson_cloudevents.md
            lesson_contract_testing.md
            lesson_crud_api.md
            lesson_discriminator.md
            lesson_docker_compose_basics.md
            lesson_eda.md
            lesson_enterprise.md
            lesson_errors.md
            lesson_fhir_basics.md
            lesson_gateway_policy.md
            lesson_github_actions.md
            lesson_github_actions_advanced.md
            lesson_governance_pipeline.md
            lesson_helm_charts.md
            lesson_iso20022_basics.md
            lesson_jsonschema.md
            lesson_k8s.md
            lesson_large_specs.md
            lesson_links.md
            lesson_linting.md
            lesson_mistakes.md
            lesson_mlops_observability.md
            lesson_ml_pipelines.md
            lesson_mock_servers.md
            lesson_multi_doc.md
            lesson_oauth.md
            lesson_observability.md
            lesson_pagination.md
            lesson_parameters.md
            lesson_polymorphism.md
            lesson_realtime_cqrs_choreography.md
            lesson_ref.md
            lesson_request_bodies.md
            lesson_runtime_validation.md
            lesson_schema_design.md
            lesson_terraform_hcl_patterns.md
            lesson_tmforum_openapi.md
            lesson_versioning.md
            lesson_zero_downtime.md
```

</details>

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
