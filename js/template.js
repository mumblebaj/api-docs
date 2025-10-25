// template.js
const defaultYamlTemplate = `openapi: 3.0.3
info:
  title: Example API
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /ping:
    get:
      summary: Ping
      responses:
        '200':
          description: pong
`;

export default defaultYamlTemplate;
