# Lesson — Arrays & Objects in YAML

Arrays and objects are the foundation of YAML structures.

This lesson helps you master:
- Lists of values
- Objects
- Arrays of objects
- Arrays of enums
- List indentation rules

---

## 📦 Arrays of Simple Values

```yaml
colors:
  - red
  - green
  - blue
```

---

## 🧱 Array of Objects

```yaml
products:
  - name: Laptop
    price: 1299
  - name: Mouse
    price: 25
```

---

## 📘 Arrays with items (OpenAPI)

```yaml
components:
  schemas:
    NamesList:
      type: array
      items:
        type: string
```

---

## 🔗 Array of `$refs`

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: string }

    UserList:
      type: array
      items:
        $ref: "#/components/schemas/User"
```

---

## 🧪 Try It

Create:
- An array of Book objects
- Each book should have: title, author, year
- Build a /books response using that array

---