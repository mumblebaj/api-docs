// tutor.js — Main Entry Point (ES Module)

import { initMonaco } from "./monaco-setup.js?v=20251126T121916Z";
import { runYamlDoctor } from "./yaml-doctor.js?v=20251126T121916Z";
import {
  applyTeachingMarkers,
  clearTeachingMarkers,
} from "./teaching-markers.js?v=20251126T121916Z";
import { detectTeachingIssues } from "./teaching-rules.js?v=20251126T121916Z";
import { renderMarkdown } from "./yaml-utils.js?v=20251126T121916Z";
import { lessonPacks } from "./lessons.js?v=20251126T121916Z";
import { scrollToRefInEditor } from "./refs.js?v=20251126T121916Z";
import { getYamlHierarchy } from "./yaml-utils.js?v=20251126T121916Z";

// Flatten lesson packs into single ordered list
export const lessons = lessonPacks.flatMap((pack) => pack.lessons);

// Global state
let editor = null;
let currentLessonIndex = 0;

// Export for other modules if they need it
window.editor = null;

// Sync theme with USS
const rootEl = document.documentElement;
const themeBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme") || "light";

rootEl.dataset.theme = savedTheme;
themeBtn.textContent = savedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

themeBtn.onclick = () => {
  const next = rootEl.dataset.theme === "dark" ? "light" : "dark";
  rootEl.dataset.theme = next;
  localStorage.setItem("theme", next);
  themeBtn.textContent = next === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
};

// ------------------------------
// LocalStorage Helpers
// ------------------------------

function saveLastLesson(id) {
  try {
    localStorage.setItem("yamlTutor.lastLesson", id);
  } catch (_) {}
}

function loadLastLesson() {
  try {
    return localStorage.getItem("yamlTutor.lastLesson");
  } catch (_) {}
  return null;
}

function buildTOC() {
  const toc = document.getElementById("lessonTOC");
  toc.innerHTML = "";

  const ul = document.createElement("ul");

  lessons.forEach((lesson, index) => {
    const li = document.createElement("li");
    li.textContent = lesson.title || `Lesson ${index + 1}`;

    li.addEventListener("click", () => {
      loadLesson(index);
    });

    li.dataset.index = index;
    ul.appendChild(li);
  });

  toc.appendChild(ul);
}

// -------------------------------------------------------------
// INITIALISE MONACO
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  editor = await initMonaco();
  window.editor = editor;

  // ---------------------------------
  // Restore Last Viewed Lesson (by id)
  // ---------------------------------
  const lastId = loadLastLesson();
  let index = 0;

  if (lastId) {
    const found = lessons.findIndex((l) => l.id === lastId);
    if (found !== -1) index = found;
  }

  buildTOC();
  await loadLesson(index);
  initTabs();

  // Initial content
  editor.setValue(
    `# Welcome to YAML Tutor\n# Paste or type YAML to begin...\n`
  );

  // Always-on teaching mode: run diagnostics on load
  runTeachingDiagnostics();

  // Sync Teaching Mode on edits (always ON)
  editor.onDidChangeModelContent(() => {
    runTeachingDiagnostics();
  });

  console.log("Tutor initialised.");
});

// -------------------------------------------------------------
// UI BUTTONS
// -------------------------------------------------------------
document.addEventListener("click", (e) => {
  const id = e.target.id;

  if (id === "doctorBtn") {
    const yaml = editor.getValue();
    const issues = runYamlDoctor(yaml);
    renderDoctorResults(issues);
  }

  if (id === "toggleLessonsBtn") {
    loadLesson(currentLessonIndex);
    switchTab("lessons");
  }

  if (id === "nextLessonBtn") {
    currentLessonIndex = Math.min(lessons.length - 1, currentLessonIndex + 1);
    loadLesson(currentLessonIndex);
  }

  if (id === "prevLessonBtn") {
    currentLessonIndex = Math.max(0, currentLessonIndex - 1);
    loadLesson(currentLessonIndex);
  }
});

function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panes = document.querySelectorAll(".tab-pane");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      // Remove active classes
      tabs.forEach((t) => t.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active"));

      // Activate clicked tab + matching pane
      tab.classList.add("active");
      document.getElementById(target + "Output").classList.add("active");
    });
  });
}

// -------------------------------------------------------------
// TEACHING MODE ENGINE (Always ON)
// -------------------------------------------------------------
function runTeachingDiagnostics(stayOnCurrentTab = false) {
  if (!editor) return;

  const yaml = editor.getValue();
  const issues = detectTeachingIssues(yaml);

  clearTeachingMarkers();
  applyTeachingMarkers(editor, issues);

  renderTeachingTips(issues, stayOnCurrentTab);
}

// -------------------------------------------------------------
// UI RENDER HELPERS
// -------------------------------------------------------------
function renderTeachingTips(issues, stayOnCurrentTab = true) {
  const tipsOutput = document.getElementById("tipsOutput");

  if (!issues.length) {
    tipsOutput.innerHTML = "<p>No teaching tips.</p>";
    if (!stayOnCurrentTab) switchTab("tips");
    return;
  }

  // Each issue.tip already contains markdown + 💡 prefix
  const combinedMd = issues.map((i) => i.tip).join("\n\n---\n\n");

  tipsOutput.innerHTML = renderMarkdown(combinedMd);
  if (!stayOnCurrentTab) switchTab("tips");
}

function clearTipsPanel() {
  document.getElementById("tipsOutput").innerHTML = "";
}

function renderDoctorResults(results) {
  const out = document.getElementById("tipsOutput");

  if (!results.length) {
    out.innerHTML = "<p>✔ YAML Doctor found no issues.</p>";
  } else {
    out.innerHTML =
      "<ul>" + results.map((r) => `<li>${r}</li>`).join("") + "</ul>";
  }

  switchTab("tips");
}

// -------------------------------------------------------------
// DEFAULT LESSON CONTENT
// -------------------------------------------------------------
function renderDefaultLesson() {
  // Find the first builtin lesson (usually lesson1)
  const builtin = lessons.find((l) => l.type === "builtin");

  // Safety fallback
  const title = builtin?.title || "YAML Introduction";

  // This is a placeholder. The full lesson markdown lives in external files now.
  return `
    <h2>${title}</h2>
    <p>
      Welcome to the YAML Tutor! Use the lesson navigator (Next →) to begin learning.
    </p>
    <p>
      Lessons include YAML basics, indentation rules, OpenAPI schemas, components,
      required fields, and practical real-world examples.
    </p>
  `;
}

// -------------------------------------------------------------
// ENHANCE LESSONS: "Open in Editor" FOR YAML CODE BLOCKS
// -------------------------------------------------------------
function enhanceLessonWithExamples(root) {
  if (!root) return;

  // Match YOUR renderer's HTML shape:
  // <pre class="code-block"><code><p>line...</p>...</code></pre>
  const codeBlocks = root.querySelectorAll("pre.code-block > code");

  codeBlocks.forEach((codeEl) => {
    const pre = codeEl.parentElement;
    if (!pre) return;

    // Extract YAML properly
    let yaml = "";

    const paragraphs = codeEl.querySelectorAll("p");
    if (paragraphs.length > 0) {
      yaml = Array.from(paragraphs)
        .map((p) => p.innerText)
        .join("\n");
    } else {
      yaml = codeEl.textContent.replace(/^yaml\s*/, "");
    }

    // Create the button
    const btn = document.createElement("button");
    btn.className = "open-example-btn";
    btn.textContent = "Open in Editor";

    btn.addEventListener("click", () => {
      editor.setValue(yaml);
      runTeachingDiagnostics(true);
    });

    // Insert button under the code block
    pre.insertAdjacentElement("afterend", btn);
  });
}

// -------------------------------------------------------------
// LOAD LESSON
// -------------------------------------------------------------
async function loadLesson(index) {
  const lesson = lessons[index];
  currentLessonIndex = index;

  // Store last lesson by id for resume-on-return
  if (lesson && lesson.id) {
    saveLastLesson(lesson.id);
  }

  let html = "";

  if (lesson.type === "builtin") {
    html = renderDefaultLesson();
  } else if (lesson.type === "json") {
    const data = await fetch(lesson.src).then((r) => r.json());
    html = `
      <h2>${data.title}</h2>
      <ul>${data.items.map((i) => `<li>${i}</li>`).join("")}</ul>
    `;
  } else if (lesson.type === "md") {
    const md = await fetch(lesson.src).then((r) => r.text());
    html = renderMarkdown(md);
  }

  // Inject lesson + buttons
  const out = document.getElementById("lessonsOutput");
  out.innerHTML =
    html +
    `
    <div class="lesson-nav">
      <button id="prevLessonBtn">Previous</button>
      <button id="nextLessonBtn">Next</button>
    </div>
    `;

  // Reset scroll to the top of the scrollable container
  setTimeout(() => {
    const lessonPane = document.getElementById("lessonsOutput");
    if (lessonPane) lessonPane.scrollTop = 0;
  }, 0);

  // Add "Open in Editor" buttons under each YAML example
  enhanceLessonWithExamples(out);

  highlightActiveLesson(index);

  // Wire navigation handlers (after insertion!)
  const prevBtn = document.getElementById("prevLessonBtn");
  const nextBtn = document.getElementById("nextLessonBtn");

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentLessonIndex > 0) loadLesson(currentLessonIndex - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentLessonIndex < lessons.length - 1)
        loadLesson(currentLessonIndex + 1);
    };
  }

  switchTab("lessons");
}

function highlightActiveLesson(idx) {
  document.querySelectorAll("#lessonTOC li").forEach((li) => {
    li.classList.toggle("active", +li.dataset.index === idx);
  });
}

// -------------------------------------------------------------
// DRAG BAR
// -------------------------------------------------------------

(function setupDraggableSplit() {
  const dragbar = document.getElementById("dragbar");
  const leftPane = document.getElementById("leftPane");
  const rightPane = document.getElementById("rightPane");

  // Restore saved size
  const saved = localStorage.getItem("yamlTutor.leftPaneWidth");
  if (saved) {
    leftPane.style.flexBasis = saved + "px";
    if (window.editor) editor.layout();
  }

  let dragging = false;

  dragbar.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;

    // UX improvements
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const newWidth = e.clientX;

    // Safety: Prevent collapsing either pane
    if (newWidth < 200) return;
    if (newWidth > window.innerWidth - 300) return;

    leftPane.style.flexBasis = newWidth + "px";
    localStorage.setItem("yamlTutor.leftPaneWidth", newWidth);

    // Monaco needs this to resize cleanly
    if (window.editor) editor.layout();
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;

    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  // DOUBLE-CLICK RESETS SPLIT
  dragbar.addEventListener("dblclick", () => {
    const defaultWidth = window.innerWidth * 0.5; // 50% reset

    leftPane.style.flexBasis = defaultWidth + "px";
    localStorage.setItem("yamlTutor.leftPaneWidth", defaultWidth);

    if (window.editor) editor.layout();
  });
})();

// -------------------------------------------------------------
// TAB SWITCHING
// -------------------------------------------------------------
function switchTab(name) {
  document
    .querySelectorAll(".tab")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-pane")
    .forEach((pane) => pane.classList.remove("active"));

  const btn = document.querySelector(`[data-tab="${name}"]`);
  const pane = document.getElementById(name + "Output");

  if (btn) btn.classList.add("active");
  if (pane) pane.classList.add("active");
}
