# Lesson — Using `$ref` Effectively in OpenAPI

The `$ref` keyword allows you to **reuse schemas**, reduce duplication, and keep your APIs clean and maintainable.

---

## 🎯 Why `$ref` Is Important

- Reuse object definitions
- Ensure consistency across schemas
- Make your API easier to maintain
- Avoid repeating the same structures everywhere

---

## 📘 Example — Simple Internal `$ref`

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string

paths:
  /users/{id}:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

Try clicking “Open in Editor” and explore the `$ref` paths.

---

## 🧱 Reusing Nested Objects

```yaml
components:
  schemas:
    Address:
      type: object
      properties:
        street: { type: string }
        city:   { type: string }

    Customer:
      type: object
      properties:
        name: { type: string }
        address:
          $ref: '#/components/schemas/Address'
```

---

## 🧩 Advanced — Arrays with $ref

```yaml
components:
  schemas:
    Product:
      type: object
      properties:
        name: { type: string }
        price: { type: number }

    Order:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Product'
```

---

## 🚀 Practice

Use `$ref` to create:
- A `Payment` schema
- A `CardDetails` schema reused inside Payment
- A `/payments` endpoint returning Payment

```yaml
# Write your version below:
```

---

