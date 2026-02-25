// js/ai/aiConfig.js

export const AI = {
  enabled: true,

  defaultEndpoint: "/api/ai/draft-openapi",

  getEndpoint() {
  const v = (localStorage.getItem("USS_AI_ENDPOINT") || "").trim();
  return v || this.defaultEndpoint;
},
};