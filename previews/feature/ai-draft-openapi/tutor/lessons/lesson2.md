# Lesson 2 — Reading an OpenAPI YAML File

This tutor helps you **understand** an OpenAPI YAML file rather than just edit it.

Here’s how to begin:

1. Paste or open an OpenAPI YAML document in the editor.
2. **Teaching Mode** guidance markers are automatically displayed in the gutter.
3. Click a marker or switch to the **Tips** tab to read explanations.
4. Use **YAML Doctor** to check for structural or style issues.

---

## 📦 Basic OpenAPI Skeleton

```yaml
openapi: 3.0.3
info:
  title: Sample API
  version: 1.0.0
  description: Simple example used by the YAML Tutor.

paths:
  /hello:
    get:
      summary: Say hello
      responses:
        '200':
          description: Successful hello
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HelloResponse'
components:
  schemas:
    HelloResponse:
      type: object
      description: Response containing a greeting message.
      properties:
        message:
          type: string
```

---

## 🧪 Try It Out
Paste the example above into the editor, then:
- Turn Teaching Mode ON to see what the tutor notices.
- Click YAML Doctor to review indentation and style hints.
- Explore how $ref links jump to definitions in components.

---

## 📘 What’s Next?

More lessons will appear as we grow the Tutor—covering:
- Schemas
- Responses
- Examples
- Best practices for real-world APIs

Each lesson builds your YAML reading skills step by step.

---

