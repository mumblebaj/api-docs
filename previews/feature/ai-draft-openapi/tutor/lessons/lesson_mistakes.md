# Lesson — Common YAML Mistakes

YAML is powerful but strict. These are the most common mistakes developers make.

Your YAML Tutor will highlight many of these automatically.

---

## ❌ Mistake 1 — Using Tabs Instead of Spaces

```yaml
# Wrong
	pet:
	  name: Rex
```

Tabs MUST be replaced with spaces.

---

## ❌ Mistake 2 — Misaligned List Hyphens

```yaml
pets:
 - name: Rex
    age: 4
```

Correct:

```yaml
pets:
  - name: Rex
    age: 4
```

---

## ❌ Mistake 3 — Missing Colon After Keys

```yaml
person
  name: John
```

Correct:

```yaml
person:
  name: John
```

---

## ❌ Mistake 4 — Duplicate Keys

```yaml
person:
  name: John
  name: Peter
```

This is invalid YAML

---

## 🧪 Try Fixing These

```yaml
car:
  wheels:
   - size: 18
   - size: 18
   color red
```

Paste into editor → see diagnostic tips.

---
