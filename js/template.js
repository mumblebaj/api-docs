// template.js
const defaultYamlTemplate = `openapi: 3.0.3
info:
  title: Example API
  description: Full API Description
  contact: 
    name: Your Department Name
    url: yoururl@domain.com
    email: department_email@domain.com
  license:  
    name: API Restricted License
    url: https://url-to-your-license@domain.com
  version: 1.0.0
servers:
    - url: https://example-{environment}.com:{port}
      variables: 
        default: dev
        enum:
          - dev
          - int
          - qa
          - stress
          - prod
      port:
        default: 123
        enum:
          - 123
          - 1234
      description: Server Details
security:
  - Authorization: []
paths:
  /path/to-your-api/v1:
    get:
      summary: Sample API
      tags:
        - Get Details or Post Details
      description: Detailed description
      parameters:
        - $ref: '#/components/parameters/XRequestID'
        - $ref: '#/components/parameters/XCorrelationID'
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/SampleRequest'
      responses:
        '200':
          description: Success
components:
  schemas:
    SampleRequest:
      type: object
      required:
        - uetr
      properties:
        uetr:
          $ref: '#/components/schemas/UUIDv4Identifier'
    UUIDv4Identifier:
      pattern: ^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$
      type: string
      description: Universally Unique IDentifier (UUID) version 4, as described in IETC RFC 4122 "Universally Unique IDentifier (UUID) URN Namespace".
  parameters:
    XRequestID:
      name: X-Request-ID
      in: header
      schema:
        $ref: '#/components/schemas/UUIDv4Identifier'
      required: true
    XCorrelationID:
      name: X-Correlation-ID
      in: header
      schema:
        $ref: '#/components/schemas/UUIDv4Identifier'
      required: true
  securitySchemes:
    Authorization:
      type: http
      description: The JWT Token
      scheme: bearer
      bearerFormat: JWT
`;

export default defaultYamlTemplate;
