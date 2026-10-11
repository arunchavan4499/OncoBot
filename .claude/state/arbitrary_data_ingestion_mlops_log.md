# Technical Log: Machine Learning & Systems Architecture for Arbitrary Data Ingestion

**Document Version:** 1.0.0  
**Timestamp:** October 12, 2026  
**Status:** Architecture Log & Future Roadmap Specification  
**Project:** OncoBot — Pathway-Aware Multimodal Transformer (PAMT) for Bladder Cancer  

---

## 1. Executive Summary

This log documents the end-to-end Machine Learning (ML), biological, and computational analysis of transitioning OncoBot from a **pre-extracted cohort demonstration platform** to an **open arbitrary data ingestion pipeline** capable of accepting unseen Whole Slide Images (`.svs`) and arbitrary RNA-Seq matrices from external institutions.

---

## 2. Machine Learning & Algorithmic Analysis (ML POV)

### 2.1 The Genomic Annotation & Alignment Problem
- **The Challenge:** External sequencing laboratories report transcriptomic profiles using disparate nomenclatures:
  1. **Gene Identifiers:** Ensembl Gene IDs (`ENSG00000141510`), HGNC gene symbols (`TP53`), Entrez IDs (`7157`), or RefSeq identifiers.
  2. **Quantification Units:** Raw sequencing read counts, Transcripts Per Million (TPM), Fragments Per Kilobase Million (FPKM), or microarray intensities.
- **Biomedical Implication:** OncoBot utilizes a biologically grounded **sparse bipartite mask** $\mathbf{M} \in \{0, 1\}^{320 \times 4500}$ derived from MSigDB KEGG 2021 cancer pathways. The model expects exact gene-to-pathway index mappings. Unordered or misaligned gene inputs cause signal from random genes to activate unrelated biological pathways (e.g., cell cycle pathways receiving housekeeping gene signal).
- **Engineering Specification:**
  - Implement an **Automated Gene Identifier Canonicalizer** utilizing a fast in-memory hash map (`hgnc_to_ensembl_map.parquet`).
  - Standardize all numeric values through a monotonic $\log_2(\text{TPM} + 1)$ transform followed by cohort standard scaling:
    $$z_g = \frac{x_g - \mu_{g,\text{TCGA}}}{\sigma_{g,\text{TCGA}} + \epsilon}$$
  - For unmeasured genes within the 4,500 gene catalog, impute the TCGA-BLCA population median rather than zeroes to prevent artificial pathway suppression.

---

### 2.2 Histopathology Domain Shift & Batch Effects (Pathology POV)
- **The Challenge:** Digital Whole Slide Images vary dramatically across clinical pathology laboratories due to:
  1. **Stain Protocols:** Differences in Hematoxylin (nuclear basophilic affinity) and Eosin (cytoplasmic eosinophilic affinity) formulation and dwell times.
  2. **Hardware Scanners:** Optical characteristics and compression variations between Aperio (ScanScope), Leica (Aperio GT 450), Hamamatsu (NanoZoomer), and Philips Ultra Fast scanners.
- **Vision Transformer Impact:** While self-supervised Vision Transformers (Meta DINO ViT-S/16) exhibit superior domain invariance over supervised ImageNet CNNs, extreme color deviations still induce shifts in the 384-dimensional patch latent space.
- **Engineering Specification:**
  - Implement **Macenko Stain Normalization** in the patch extraction pipeline. Extract optical density (OD) vectors via SVD:
    $$\mathbf{OD} = -\log_{10}(\mathbf{I} / 255)$$
  - Map optical density extremes onto a standardized target reference matrix before feeding patches into DINO ViT-S/16.

---

### 2.3 Variable Tissue Surface Area & Dynamic Patch Budgets
- **The Challenge:** Surgical tumor resections yield thousands of high-cellularity patches, whereas core needle biopsies or transurethral resections (TURBT) with thermal artifacts may yield fewer than 200 viable tissue patches.
- **Model Expectation:** The MIL Transformer and Cross-Attention Fusion were trained with a fixed budget of $N = 1,024$ patches.
- **Engineering Specification:**
  - **Dynamic Sampling with Replacement:** If viable tissue count $K < 1024$, sample $1,024$ tiles with stochastic replacement, or:
  - **Attention Masking:** Pass a boolean key padding mask $\mathbf{M}_{\text{pad}} \in \{0, 1\}^{1 \times 1024}$ to the Multi-Head Cross-Attention layer:
    $$\text{Attention}(Q, K, V, \mathbf{M}_{\text{pad}}) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}} + (1 - \mathbf{M}_{\text{pad}}) \cdot (-10^9)\right) V$$

---

### 2.4 Out-of-Distribution (OOD) Organ Calibration
- **The Challenge:** OncoBot is trained and validated on Bladder Urothelial Carcinoma (`TCGA-BLCA`). If an external user uploads a breast (`TCGA-BRCA`) or lung (`TCGA-LUAD`) resection, bladder-specific prognostic markers (e.g., `KEGG_BLADDER_CANCER` FGFR3/HRAS alterations) become clinically irrelevant.
- **Engineering Specification:**
  - Implement an **OOD Confidence Gate**: compute the Mahalanobis distance of the extracted fused representation $\mathbf{z}_{\text{patient}}$ against the TCGA-BLCA training centroid:
    $$D_M(\mathbf{z}) = \sqrt{(\mathbf{z} - \boldsymbol{\mu}_{\text{train}})^T \boldsymbol{\Sigma}_{\text{train}}^{-1} (\mathbf{z} - \boldsymbol{\mu}_{\text{train}})}$$
  - If $D_M > \tau_{\text{threshold}}$, flag the report with: *"Elevated Out-of-Distribution Index: Specimen morphology exhibits substantial divergence from bladder urothelial reference cohort."*

---

## 3. Systems & Computational Architecture (Systems POV)

### 3.1 The In-Flight Latency & Timeout Problem
- Synchronous HTTP POST requests fail for gigapixel files due to browser and reverse proxy timeouts (default 60s):
  - 3GB File Upload over residential broadband: ~45–180 seconds.
  - OpenSlide tissue segmentation and tile parsing: ~20–40 seconds.
  - DINO ViT-S/16 feature extraction ($1,024 \times 256\text{px}$):
    - On NVIDIA T4 / A10G: ~15–25 seconds.
    - On Cloud CPU (2–4 vCPUs): ~5–8 minutes.
- **Architecture Mandate:** Synchronous HTTP cannot be used for arbitrary in-flight extraction.

---

### 3.2 The Enterprise Asynchronous Worker Pattern (Target Architecture)

```
[Browser Client]
       │
       │ 1. POST /api/v1/jobs/upload-request { filename, size }
       ▼
[FastAPI Gateway]
       │
       │ 2. Issues S3 Pre-Signed Multipart Upload URL
       ▼
[AWS S3 Bucket]
       │
       │ 3. Client uploads directly to S3 (Bypasses Backend RAM)
       ▼
[Message Broker (Redis / RabbitMQ / AWS SQS)]
       │
       │ 4. Enqueues job: { job_id, s3_wsi_uri, s3_rna_uri }
       ▼
[GPU Compute Worker Node (Celery / Ray / Kubernetes Pod)]
       ├── Step A: OpenSlide multiprocessing patch extraction (1024 tiles)
       ├── Step B: DINO ViT-S/16 forward pass -> saves [1024, 384] tensor
       ├── Step C: Canonical RNA gene mapper -> [1, 4500] tensor
       └── Step D: Cross-Attention + Cox-PH -> Hazard score & attention weights
       │
       │ 5. Writes inference results & attention grid JSON to Redis / Database
       ▼
[Client Web UI (Polling / SSE / WebSocket)]
       ├── Progress Stage 1: "Streaming & segmenting tissue morphology (25%)"
       ├── Progress Stage 2: "Extracting 1,024 DINO ViT-S/16 patch tokens (50%)"
       ├── Progress Stage 3: "Synthesizing Cross-Attention KEGG matrices (75%)"
       └── Progress Stage 4: "Completed! Viewing Interactive Console & PDF (100%)"
```

---

## 4. Current State vs. Production Arbitrary State

| Component | Current State (Demo Showcase) | Future State (Arbitrary Public Ingestion) |
| :--- | :--- | :--- |
| **Cohort Slides** | 403 TCGA cases pre-extracted on Kaggle GPU; instant load (<0.2s). | Preserved as rapid demo test cases. |
| **Arbitrary `.svs`** | Slide uploaded & thumbnailed; features mapped via representative baseline. | Asynchronous Celery GPU worker extracting patches via DINO ViT-S/16. |
| **Arbitrary RNA** | Ingests numeric matrix; assumes canonical order. | Automated HGNC-to-Ensembl alias resolver and $\log_2(\text{TPM}+1)$ standardizer. |
| **API Contract** | Synchronous REST (`/api/upload-patient` -> `/api/run-inference`). | Asynchronous Job API (`/api/jobs/create` -> `/api/jobs/status/{id}`). |
| **Hardware** | Standard CPU / Mac / portable Docker container. | GPU Worker instance (AWS EC2 G4dn.xlarge / RunPod / GCP T4). |

---

## 5. Summary & Actionable Recommendations

1. **For Presenting & Showcasing Right Now:**
   - Present the current implementation as the **Edge Inference & Cohort Caching Tier**: Explain to interviewers that the gigapixel heavy feature extraction was distributed across cloud GPU clusters (Kaggle MLOps phase) to allow real-time sub-second inference on edge devices without requiring a persistent \$500/month GPU server.
2. **For the Next Milestone:**
   - Implement the Celery/Redis worker queue and S3 streaming pipeline as the cloud-native production backend.
