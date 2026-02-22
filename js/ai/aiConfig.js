// js/ai/aiConfig.js
// Mode 1 defaults to same-host /api/ai/draft-openapi, but can be overridden by corporates:
// localStorage.USS_AI_ENDPOINT = "https://their-gateway.company/draft-openapi"

export const AI = {
  enabled: true,

  // Mode 1 default: Cloudflare Worker route (protected by Cloudflare Access)
  defaultEndpoint: "/api/ai/draft-openapi",
//   localStorage.USS_AI_ENDPOINT = "https://their-gateway.company/draft-openapi"

  getEndpoint() {
    return localStorage.getItem("USS_AI_ENDPOINT") || this.defaultEndpoint;
  },
};