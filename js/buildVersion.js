/* 
XSS-SAFE: Appended node is constructed using textContent from CI-generated
metadata (not user input). No innerHTML or unsafe sinks used. 
*/

// buildVersion.js — Display version info dynamically

async function showBuildInfo() {
  try {
    const response = await fetch("../build-info.json");
    if (!response.ok) throw new Error("Build info not found");

    const info = await response.json();
    const versionString = `v${info.version}${
      info.commit ? ` (${info.commit})` : ""
    } • ${info.date}`;

    const el = document.createElement("div");
    el.id = "build-info";
    el.textContent = `Universal Schema Studio — ${versionString}`;
    el.style.cssText =
      "position:fixed;bottom:6px;right:30px;font-size:12px;opacity:0.7;color:#666;z-index:9999;";

    document.body.appendChild(el);
  } catch (err) {
    console.warn("Build info unavailable:", err);
  }
}

document.addEventListener("DOMContentLoaded", showBuildInfo);
