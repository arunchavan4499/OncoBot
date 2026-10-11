# Machine Learning Challenges & Arbitrary Data Ingestion Roadmap

**Document Reference:** `docs/ML_CHALLENGES_AND_ARBITRARY_DATA_ROADMAP.md`  
**Also preserved in:** `.claude/state/arbitrary_data_ingestion_mlops_log.md`  
**Date:** October 12, 2026  

---

## Overview

This document records the complete technical evaluation of OncoBot regarding **arbitrary user-uploaded data** (unseen `.svs` Whole Slide Images and external RNA-Seq count files). It details the biological, algorithmic, and computational barriers, along with the enterprise architecture required to address them.

---

## 1. Machine Learning & Algorithmic Obstacles (ML POV)

### 1.1 The Gene Annotation Mismatch
- **Problem:** External institutions report RNA expression in different formats (Ensembl IDs vs. HGNC Gene Symbols vs. Entrez IDs), and with differing normalization units (raw counts vs. TPM vs. FPKM).
- **Impact on PAMT:** OncoBot uses a 320-pathway $\times$ 4,500-gene biological mask. Misaligned columns cause random signals to feed into unrelated pathway nodes.
- **Solution:** Canonical Gene Alias Resolver (Ensembl $\leftrightarrow$ HGNC dictionary) + automatic $\log_2(\text{TPM} + 1)$ standardizer.

### 1.2 Histopathology Stain Variations (Batch Effects)
- **Problem:** Slide scanners (Aperio, Leica, Hamamatsu) and lab staining protocols introduce significant color variability (deep purple vs. pale pink).
- **Impact on Vision Transformer:** Shifts DINO ViT-S/16 384-dimensional feature embeddings.
- **Solution:** Macenko Optical Density Stain Normalization applied prior to patch feature extraction.

### 1.3 Variable Patch Counts (Biopsies vs. Resections)
- **Problem:** Core biopsies may yield $<200$ patches, while the model expects $1,024$.
- **Solution:** Stochastic sampling with replacement or boolean attention key-padding masks.

### 1.4 Out-of-Distribution (OOD) Organ Types
- **Problem:** Model is calibrated for Bladder Urothelial Carcinoma (`TCGA-BLCA`). Non-bladder uploads need explicit detection.
- **Solution:** Latent Mahalanobis distance OOD detection with confidence score warnings.

---

## 2. Systems & Hardware Obstacles (Systems POV)

### 2.1 The Latency Barrier
- 2–4 GB `.svs` upload: ~45–180s.
- OpenSlide tile segmentation: ~20–40s.
- DINO ViT-S/16 extraction ($1024 \times 256\text{px}$):
  - **GPU (T4/A10G):** ~15–30s.
  - **CPU (Cloud Container / Laptop):** ~4–8 minutes.
- Synchronous web requests time out after 60s.

### 2.2 Concurrency & RAM Limits
- Multiple simultaneous 3GB slide uploads will crash web servers with $<8\text{GB}$ RAM due to memory spikes.

---

## 3. The Production Asynchronous Solution

```
Client Upload -> S3 Pre-Signed URL -> S3 Event -> Celery/Redis Queue -> Dedicated GPU Worker -> Result Database -> Client WebSocket Progress Stepper
```

---

## 4. How to Frame This in an Interview or Showcase

Explain to interviewers:
> *"In OncoBot, we implemented a dual-tier MLOps architecture. The heavy gigapixel feature extraction for our clinical cohort was distributed across cloud GPU clusters (Phase 1 MLOps), compiling lightweight feature tensors. This allows our clinical web dashboard to run instantaneous, sub-second multimodal inference with real PyTorch weights on portable edge workstations without incurring persistent \$500/month cloud GPU costs. In our production enterprise roadmap, arbitrary in-flight uploads are routed through asynchronous S3 multipart streaming and a Celery GPU worker queue."*
