# Lesson — Your First CRUD API

A CRUD API includes operations to:
- Create
- Read
- Update
- Delete

Let's build a simple `items` API.

---

## 📘 GET /items

```yaml
paths:
  /items:
    get:
      summary: Get all items
      responses:
        '200':
          description: List of items
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: { type: string }
                    name: { type: string }
```

---

## 🧱 POST /items

```yaml
paths:
  /items:
    post:
      summary: Create a new item
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
      responses:
        '201':
          description: Created
```

---

## 🛠 PUT /items/{id}

```yaml
paths:
  /items/{id}:
    put:
      summary: Update item
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
      responses:
        '200':
          description: Updated
```

---

## ❌ DELETE /items/{id}

```yaml
paths:
  /items/{id}:
    delete:
      summary: Delete item
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted
```

---

Now try combining all 4 into a single OpenAPI document.

---