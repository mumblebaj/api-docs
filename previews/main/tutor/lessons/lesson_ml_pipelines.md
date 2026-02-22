# ML Pipelines & Orchestration (Kubeflow, Vertex, Step Functions)

Modern AI systems are rarely a single model call.
They are pipelines made of multiple coordinated steps:

- data extraction
- cleaning
- feature engineering
- training
- model evaluation
- model validation
- promotion
- deployment
- monitoring

Tools like Kubeflow, Vertex AI Pipelines, Airflow, AWS Step Functions, and Argo Workflows describe these flows in YAML.

This lesson shows how to express ML workflow logic through pipeline YAML.

---

## 🧠 1. What Is an ML Pipeline?

A pipeline defines a directed acyclic graph (DAG):

```nginx
extract → preprocess → train → evaluate → deploy
```

Pipeline runtimes:
- run steps in order
- parallelize steps when possible
- pass artifacts between steps
- retry, cache, or skip steps
- allow rollback or canary testing
- support triggers from events (CloudEvents)

---

## ⚙ 2. Kubeflow Pipeline (KFP) YAML (Component + Pipeline)

Let’s define a simple pipeline:

**2.1 Component: Data Preprocessing**

```yaml
name: preprocess-data
implementation:
  container:
    image: gcr.io/ml/preprocess:latest
    command:
      - python
      - preprocess.py
    args:
      - --input
      - "{{inputs.artifacts.raw_data.path}}"
      - --output
      - "{{outputs.artifacts.cleaned_data.path}}"

inputs:
  artifacts:
    raw_data:
      type: Dataset

outputs:
  artifacts:
    cleaned_data:
      type: Dataset
```

---

**2.2 Component: Model Training**

```yaml
name: train-model
implementation:
  container:
    image: gcr.io/ml/train:latest
    command: ["python", "train.py"]
    args:
      - --data
      - "{{inputs.artifacts.cleaned_data.path}}"
      - --model
      - "{{outputs.artifacts.model.path}}"

inputs:
  artifacts:
    cleaned_data:
      type: Dataset

outputs:
  artifacts:
    model:
      type: Model
```

---

**2.3 Pipeline Definition YAML**

```yaml
pipelineInfo:
  name: ml_training_pipeline
  description: End-to-end training pipeline

components:
  preprocess:
    ref: preprocess-data
  train:
    ref: train-model

root:
  dag:
    tasks:
      preprocess-task:
        componentRef: preprocess
        inputs:
          artifacts:
            raw_data:
              artifactUri: "gs://bucket/raw/data.csv"

      train-task:
        componentRef: train
        dependentTasks:
          - preprocess-task
        inputs:
          artifacts:
            cleaned_data:
              taskOutputArtifact:
                task: preprocess-task
                outputArtifactKey: cleaned_data
```

Key principles:
- `taskOutputArtifact` wires outputs to inputs
- Each step is a container
- Everything is explicitly declared (great for reproducibility)

---

## 🤖 3. Vertex AI Pipeline YAML (PipelineSpec)

Google Vertex also uses declarative YAML for full MLOps pipelines.

```yaml
pipelineSpec:
  params:
    dataset-uri:
      type: string
  tasks:
    preprocess:
      taskInfo:
        name: Preprocess
      inputArtifacts:
        dataset:
          uri: "{{$.params['dataset-uri']}}"
      executorLabel: preprocess-exec

    train:
      taskInfo:
        name: Train Model
      dependentTasks:
        - preprocess
      inputArtifacts:
        cleaned-data:
          taskOutputArtifact:
            taskId: preprocess
            outputArtifactId: cleaned
      executorLabel: train-exec

executors:
  preprocess-exec:
    container:
      imageUri: gcr.io/ml/preprocess:latest
  train-exec:
    container:
      imageUri: gcr.io/ml/train:latest
```

---

## 🔁 4. AWS Step Functions (State Machine YAML)

AI pipelines can also be expressed in Step Functions:

```yaml
Comment: ML Pipeline
StartAt: ExtractData
States:

  ExtractData:
    Type: Task
    Resource: arn:aws:lambda:extract
    Next: Preprocess

  Preprocess:
    Type: Task
    Resource: arn:aws:lambda:preprocess
    Next: Train

  Train:
    Type: Task
    Resource: arn:aws:lambda:train
    Next: Evaluate

  Evaluate:
    Type: Task
    Resource: arn:aws:lambda:evaluate
    Choices:
      - Variable: "$.accuracy"
        NumericGreaterThan: 0.9
        Next: Deploy
    Default: FailPipeline

  Deploy:
    Type: Task
    Resource: arn:aws:lambda:deploy
    End: true

  FailPipeline:
    Type: Fail
    Error: "LowAccuracy"
```

Great for:
- conditional branching
- fallback logic
- approval gates
- rollbacks

---

## 🎯 5. Canonical Inputs & Outputs for ML Steps

Common inputs:
- dataset URI
- feature store query
- hyperparameters
- model version
- config YAML

Common outputs:
- model artifact
- training metrics
- evaluation report
- logs / metadata
- promoted model version

Your pipeline YAML should reflect these as artifact types.

---

## 🚀 6. ML Pipeline Triggers (Eventing Integration)

ML pipelines often start from CloudEvents:

Examples:

- `data.ingested` → start training
- `schema.changed` → revalidate
- `model.promoted` → redeploy
- `prediction.failed` → activate fallback model

Trigger YAML (Argo):

```yaml
spec:
  eventSourceRef:
    name: ingest-event
  workflowRef:
    name: start-training-workflow
```

---

## 🧪 Challenge

Build a 3-step ML pipeline in YAML using any framework (Kubeflow, Argo, Vertex):

Steps:

1. `extract-features`
2. `train-model`
3. `evaluate-model`

Add:

- at least one artifact passed between steps
- hyperparameters input
- conditional promotion (`accuracy > 0.92`)

Bonus:

- Use CloudEvents to trigger the workflow from `ml.new-data.arrived`

---