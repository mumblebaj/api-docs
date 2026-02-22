# Ultra-Advanced — Kubernetes YAML

Kubernetes manifests are real-world, production YAML.  
Understanding them is invaluable.

---

## 📘 Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: demo
          image: demo-image:1.0
          ports:
            - containerPort: 8080
```

---

## 📘 Service Example

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo
spec:
  type: ClusterIP
  selector:
    app: demo
  ports:
    - port: 80
      targetPort: 8080
```

---

## 🧪 Challenge

Deploy:
- A deployment
- A service
- A configmap

---