---
name: msa-paper-research
status: complete
created: 2026-03-22T10:00:00Z
updated: 2026-03-22T10:00:00Z
---

# MSA: Memory Sparse Attention - Complete Technical Research

## Paper Metadata

- **Title**: MSA: Memory Sparse Attention for Efficient End-to-End Memory Model Scaling to 100M Tokens
- **Authors**: Yu Chen, Runkai Chen, Sheng Yi, Xinda Zhao, Xiaohong Li, Jianjin Zhang, Jun Sun, Chuanrui Hu, Yunyun Han, Lidong Bing, Yafeng Deng, Tianqiao Chen
- **Affiliations**: Evermind, Shanda Group, Peking University
- **Date**: March 2026
- **Publisher**: Zenodo (DOI: 10.5281/zenodo.19103670)
- **Venue**: Preprint (not yet peer-reviewed at a conference)
- **Backbone Model**: Qwen3-4B-Instruct-2507
- **License**: MIT
- **Code/Models**: "Coming Soon" (not yet released)

## Core Problem Statement

LLMs are limited to 128K-1M effective context length. Human lifelong memory is estimated at 200-300M tokens (based on 10^9 bits functional capacity at 3-5 bits/token). Three existing paradigms all fall short:

1. **Parameter-Based Memory** (LoRA, Titans): High precision but no capacity scalability, catastrophic forgetting
2. **External Storage-Based Memory** (RAG, MemAgent): Scales in capacity but lacks end-to-end differentiability, capped at medium precision
3. **Latent State-Based Memory** (DSA, DeltaNet/RWKV, MemGen): Either prohibitive compute (KV-centric) or lossy compression (linear attention)

**The two fundamental limitations**: (1) limited scalability of high-fidelity memory, (2) lack of end-to-end trainability.

## Key Innovation Points (5)

### 1. Memory-Sparse Attention Architecture
End-to-end trainable sparse attention that integrates top-k document selection with sparse attention while remaining differentiable. Achieves O(L) complexity and <9% degradation from 16K to 100M tokens.

### 2. Document-wise RoPE (Parallel + Global)
- **Parallel RoPE**: Each document resets position IDs from 0, decoupling positional semantics from total document count. Enables train-on-64K, infer-on-100M extrapolation.
- **Global RoPE**: Active context (query + generation) position IDs offset by k (Top-k count), preserving causal ordering: background -> query -> generation.

### 3. KV Cache Compression + Memory Parallel
- Chunk-mean pooling compresses K, V, K^R into compact representations (chunk size P=64)
- Tiered storage: GPU-resident routing keys K^R (~56GB for 100M), CPU-offloaded content KVs (K, V)
- Memory Parallel: query broadcast -> local GPU scoring -> global reduce for Top-k
- Enables 100M-token inference on 2xA800 GPUs (160GB VRAM total)

### 4. Memory Interleave
Adaptive multi-hop reasoning: iteratively alternates between "generative retrieval" (generate document IDs) and "context expansion" (append retrieved text). The number of documents per round is adaptively determined by the model. Continues until model generates final answer instead of more document IDs.

### 5. Auxiliary Routing Loss with Two-Phase Training
Supervised contrastive loss on router projectors during continuous pre-training (158.95B tokens). Two-phase schedule: warmup (L = 0.1*L_LLM + L_aux, lr=1e-4) then main (L = L_LLM + 0.1*L_aux, lr=6e-6).

## Architecture Description (Detailed Flowchart)

### MSA Layer Structure (left side of Fig 2)
```
Input: Docs + Query hidden states
    |
    v
[RMSNorm]
    |
    v
[MSA Block] -- contains two parallel Attention heads
    |           (one for docs self-attention, one for query-to-memory)
    + (residual)
    |
    v
[RMSNorm]
    |
    v
[Multi-head Attention]  -- standard attention
    + (residual)
    |
    v
[FFN]
    + (residual)
    |
    v
Output
```

### Document Processing Pipeline (center of Fig 2)
```
Documents (each independently)
    |
    v
[Doc-wise RoPE] -- position IDs reset from 0 per document
    |
    v
[Multi-head Attention] -- intra-document self-attention
    |
    v
Project to: Q, K, V, K^R (4 separate projection matrices)
    |
    v
[Token-wise Mean Pooling] -- chunk size P=64
    |
    v
Compressed: K_bar, V_bar, K^R_bar
```

### Query Routing Pipeline (right side of Fig 2)
```
Query hidden states
    |
    v
Project to: Q^R (Router Q Projector), V, K, Q
    |
    v
Q^R x K^R_bar -- cosine similarity scoring
    |
    v
[Mean pooling across heads]
    |
    v
[Max pooling across query tokens] -- per-chunk score
    |
    v
[Max pooling across chunks per doc] -- per-document score
    |
    v
[Top-k Selection] -- select k=16 documents
    |
    v
L_aux -- contrastive loss on routing decisions
    |
    v
[Select K_bar, V_bar of Top-k docs]
    |
    v
[Concat: {K_bar_topk; K_q}, {V_bar_topk; V_q}]
    |
    v
[Global RoPE] -- query starts at position k
    |
    v
[Multi-head Attention] -- Q_q attends to concatenated context
    |
    v
Output (autoregressive generation)
```

### Three-Stage Inference Pipeline (Fig 3)
```
Stage 1: Global Memory Encoding (OFFLINE, one-time)
    Corpus -> Forward pass per document -> Cache (K_bar, V_bar, K^R_bar)
    Complexity: O(LG), amortized across all queries

Stage 2: Routing and Context Assembly (ONLINE, per query)
    Query -> Router Q Projector -> Q^R
    Q^R matched against all cached K^R_bar -> relevance scores
    Top-k document indices identified
    Load K_bar, V_bar for selected docs from CPU DRAM
    Concatenate with local K_q, V_q
    Complexity: O(ML/P) = O(L)

Stage 3: Sparse Generation (ONLINE)
    Q_q attends to [{K_bar_topk}; K_q] autoregressive generation
    Complexity: O(T * (M + kG/P)^2), independent of L
```

### Memory Interleave (Multi-hop, shown in Fig 3 example)
```
Example: "When was Erik Watts' father born?"

Round 1: Query -> generates doc ID [4]
    -> Retrieves "[4]. Erik Watts ... is the son of Bill Watts."
    -> Appends to context

Round 2: Query + Doc[4] -> generates doc ID [3]
    -> Retrieves "[3]. Bill Watts (born May 5, 1939) ..."
    -> Appends to context

Round 3: Query + Doc[4] + Doc[3] -> generates <End-of-Retrieve>
    -> Final answer: "May 5, 1939"
```

### Key Design Decisions
- MSA routing applied ONLY to upper half of layers (lower layers lack high-level semantic abstractions needed for routing)
- Lower layers: independent document processing + local-only generation (no memory KV attention)
- Router Projectors: W_{Q_R} and W_{K_R} are NEW parameters (randomly initialized), backbone projections W_Q, W_K, W_V are initialized from pre-trained weights

## Core Algorithm Pseudocode

### Scoring Algorithm
```
function ComputeDocumentScore(Q_R, K_R_bar, num_heads, num_docs):
    # Q_R: [query_len, num_heads, head_dim]
    # K_R_bar: [num_docs, num_chunks_per_doc, num_heads, head_dim]

    for each document i, chunk j:
        # Cosine similarity per head per token
        sim[t, h] = cos(Q_R[t, h], K_R_bar[i, j, h])

        # Mean pool across heads
        sim_mean[t] = mean_h(sim[t, h])

        # Max pool across query tokens
        S_ij = max_t(sim_mean[t])

    # Document-level score = max over chunks
    s_i = max_j(S_ij)

    # Select Top-k documents
    I = argsort(s)[:k]  # k=16 by default

    return I
```

### Sparse Attention Assembly
```
function SparseAttention(Q_q, K_q, V_q, memory_bank, top_k_indices):
    # Gather compressed KVs for selected documents
    K_ctx = concat([memory_bank.K_bar[i] for i in top_k_indices], K_q)
    V_ctx = concat([memory_bank.V_bar[i] for i in top_k_indices], V_q)

    # Apply Global RoPE: query positions start at k
    apply_rope(Q_q, start_pos=k)
    apply_rope(K_ctx[:topk_portion], doc_wise_rope)  # each doc from 0
    apply_rope(K_ctx[topk_portion:], start_pos=k)     # query portion

    # Standard attention
    output = softmax(Q_q @ K_ctx.T / sqrt(d)) @ V_ctx
    return output
```

### Auxiliary Routing Loss
```
function AuxiliaryLoss(positive_scores, negative_scores, tau):
    # Supervised contrastive loss (InfoNCE-style)
    loss = 0
    for i in range(|P|):
        numerator = exp(s_plus[i] / tau)
        denominator = numerator + sum(exp(s_minus[i,j] / tau) for j in range(|N|))
        loss += -log(numerator / denominator)
    return loss / |P|
```

### Memory Interleave
```
function MemoryInterleave(query, memory_bank):
    context = query
    while True:
        # Generate document IDs autoregressively
        doc_ids = generate_until_delimiter(context, memory_bank)

        if doc_ids == "<End-of-Retrieve>":
            # Generate final answer
            answer = generate_answer(context, memory_bank)
            return answer

        # Retrieve and expand context
        for doc_id in doc_ids:
            original_text = get_original_text(doc_id)
            context = context + doc_id + original_text
```

## Mathematical Formulas (LaTeX)

### Projection (Eq. 1)
$$K_{i,h} = H_i W_K^h, \quad V_{i,h} = H_i W_V^h, \quad K_{i,h}^R = H_i W_{K_R}^h$$

### Chunk-Mean Pooling
$$\bar{K}_{i,h} = \phi(K_{i,h}), \quad \bar{V}_{i,h} = \phi(V_{i,h}), \quad \bar{K}_{i,h}^R = \phi(K_{i,h}^R)$$

where $\phi(\cdot)$ denotes chunk-wise mean pooling with chunk size $P=64$.

### Relevance Scoring (Eq. 2)
$$S_{ij} = \max_{t \in \text{token}} \left( \text{mean}_{h \in \text{head}} \left( \cos(Q_{q,h}^R)_t, \bar{K}_{ij,h}^R \right) \right)$$

Document-level score: $s_i = \max_j S_{ij}$

Top-k selection: $\mathcal{I} = \text{Top-k}(\{s_i\}_{i=1}^N)$

### Context Assembly (Eq. 3-4)
$$K_{\text{ctx}} = [\{\bar{K}_i\}_{i \in \mathcal{I}}; K_q], \quad V_{\text{ctx}} = [\{\bar{V}_i\}_{i \in \mathcal{I}}; V_q]$$
$$\text{Output} = \text{Attention}(Q_q, K_{\text{ctx}}, V_{\text{ctx}})$$

### Auxiliary Routing Loss (Eq. 5)
$$\mathcal{L}_{\text{aux}} = -\frac{1}{|P|} \sum_{i=1}^{|P|} \log \frac{\exp(s_i^+ / \tau)}{\exp(s_i^+ / \tau) + \sum_{j=1}^{|N|} \exp(s_{i,j}^- / \tau)}$$

### Training Loss Schedule
- Warmup phase: $\mathcal{L} = 0.1 \cdot \mathcal{L}_{\text{LLM}} + \mathcal{L}_{\text{aux}}$ (lr = 1e-4)
- Main phase: $\mathcal{L} = \mathcal{L}_{\text{LLM}} + 0.1 \cdot \mathcal{L}_{\text{aux}}$ (lr = 6e-6)

### Training Complexity (Eq. 6)
$$O_{\text{train}} = O(LG) + O(ML/P) + O\left((M + kG/P)^2\right) = O(LG)$$

### Inference Complexity (Eq. 7)
$$O_{\text{inference}} = O(ML/P) + O\left(T \cdot (M + kG/P)^2\right) = O(L)$$

## Benchmark Results

### Table 2: MSA vs Same-Backbone RAG (Qwen3-4B) - LLM Judge (0-5 scale)

| Dataset | Memory Size | RAG Best@k | RAG+Rerank Best@k | HippoRAG2 Best@k | **MSA @adaptive** |
|---------|-------------|------------|-------------------|------------------|-----------------|
| MS MARCO v1 | 7.34M | 3.011 | 3.032 | 3.019 | **4.141** |
| Natural Questions | 1.47M | 3.452 | 3.494 | 3.389 | **3.545** |
| DuReader | 277K | 3.726 | 3.848 | 3.485 | **4.155** |
| TriviaQA (10M) | 10M | 4.414 | 4.391 | 4.430 | **4.621** |
| NarrativeQA | 538K | 2.860 | **3.638** | 2.655 | 3.395 |
| PopQA | 1.18M | 3.299 | 3.315 | 3.249 | **3.433** |
| 2WikiMultiHopQA | 722K | 3.136 | 3.159 | 3.330 | **4.280** |
| HotpotQA | 1.35M | 3.787 | 4.022 | 3.970 | **4.061** |
| MuSiQue | 1.41M | 1.928 | 1.965 | 2.095 | **2.211** |
| **Average** | | 3.242 | 3.372 | 3.275 | **3.760** |

**Relative improvements**: +16.0% over RAG, +11.5% over RAG+Rerank, +14.8% over HippoRAG2.

### Table 3: MSA vs Best-of-Breed RAG (Large Backbones)

| Config | Average Score |
|--------|---------------|
| KaLMv2 + Qwen3-235B (best@k) | 3.506 |
| KaLMv2 + Qwen3-235B + Rerank (best@k) | 3.580 |
| KaLMv2 + Llama-3.3-70B (best@k) | 3.396 |
| KaLMv2 + Llama-3.3-70B + Rerank (best@k) | 3.568 |
| **MSA-4B @adaptive** | **3.760** |

**Key takeaway**: A 4B model with MSA beats 70B and 235B models using SOTA RAG pipelines.

### RULER NIAH Results (32K to 1M tokens, average accuracy across 8 subtasks)

| Model | 32K | 64K | 128K | 256K | 512K | 1M |
|-------|-----|-----|------|------|------|-----|
| Qwen3-4B-Instruct | 0.95 | 1.00 | 0.99 | 0.48 | 0.42 | 0.25 |
| Qwen2.5-14B-1M | 1.00 | 0.99 | 0.97 | 0.90 | 0.68 | 0.53 |
| Qwen3-30B-A3B | 0.99 | 0.99 | 0.79 | 0.81 | 0.78 | 0.80 |
| Qwen3-Next-80B-A3B | 1.00 | 1.00 | 1.00 | 0.97 | 0.88 | 0.81 |
| RL-MemoryAgent-14B | 0.98 | 0.98 | 0.97 | 0.95 | 0.95 | 0.93 |
| **MSA (Ours)** | **0.99** | **0.98** | **0.98** | **0.98** | **0.97** | **0.95** |

**Key number**: MSA maintains 94.84% at 1M tokens. Backbone collapses to 24.69%.

### Context Degradation (MS MARCO, 16K to 100M)

| Context Length | MSA Score |
|----------------|-----------|
| 16K | 4.023 |
| 100M | 3.669 |
| **Degradation** | **8.8%** |

Competitors (GPT-4.1, DeepSeek-V3.2) start around 3.6-3.7 and decline sharply. Qwen3-4B backbone collapses below 1.5 at 512K.

### Ablation Study (Table 4, 4 benchmarks average on 0-5 scale)

| Model Variant | Average | Delta |
|---------------|---------|-------|
| MSA-S2 (Full, 2-stage curriculum) | 3.976 | baseline |
| MSA-S1 (1-stage only, 8k context) | 3.694 | -7.1% |
| w/o Memory Interleave | 3.497 | -5.3% from S1 |
| w/o Continual Pre-training | 2.537 | -31.3% from S1 |
| w/o Original Text | 2.325 | -37.1% from S1 |

## Figures List with Descriptions

### Figure 1: Scaling Curve (fig1_scaling.png)
Line chart showing QA score (LLM judge, 0-5 scale) vs context length from 16K to 100M tokens on MS MARCO. MSA (red, solid) stays flat around 4.0 down to ~3.7 at 100M. All competitors (Qwen3-4B, Qwen2.5-14B-1M, Qwen3-Next-80B-A3B, Qwen3-30B-A3B, MemAgent-14B, QwenLong-L1.5-30B-A3B, DeepSeek-V3.2, GPT-4.1) decline sharply, most ending below 3.0. Some curves terminate early due to context limits.

### Figure 2: MSA Layer Architecture (fig2_msa_layer.png)
Three-panel diagram:
- **Left panel**: MSA layer stack (RMSNorm -> MSA block with dual attention -> RMSNorm -> Multi-head Attention -> FFN, all with residual connections)
- **Center panel**: Document processing - Doc-wise RoPE -> Multi-head Attention -> Project to Q,K,V,K^R -> Token-wise Mean Pooling -> compressed K_bar, V_bar, K^R_bar
- **Right panel**: Query routing - Q^R scores against K^R_bar -> Pooling -> Top-k selection -> Select compressed KVs -> Concat with query KV -> Global RoPE -> Multi-head Attention for generation. L_aux loss arrow from routing scores.

### Figure 3: Three-Stage Inference with Memory Interleave (fig3_inference.png)
Flow diagram showing:
- Left: Global Memory Encoding (offline) - corpus -> memory storage
- Center: Routing and Context Assembly (online) - query matched against memory, top-k selection
- Right: Sparse Generation - autoregressive output
- Bottom shows Memory Interleave example: multi-hop question "When was Erik Watts' father born?" resolved in 3 rounds: retrieve Doc[4] (Erik Watts -> son of Bill Watts), then Doc[3] (Bill Watts born May 5, 1939), then generate final answer.

### Figure 4: RULER NIAH Heatmap (fig4_ruler_niah.png)
Heatmap (green=high, red=low) showing accuracy across 6 models x 6 context lengths (32K to 1M). MSA row is almost entirely deep green (0.95-0.99). Qwen3-4B-Instruct goes from green to red (collapses at 256K+). Other models show varying degrees of yellow/orange at longer lengths.

### Figure 5: Training Time vs Context Length (training_time_vs_context_length_updated.png)
Line chart comparing MSA (blue, nearly flat/linear) vs Full Attention (orange, quadratic curve) training time in seconds as context length increases from ~32K to ~400K tokens. Full Attention reaches ~23,000s at 400K while MSA stays under ~1,000s. Demonstrates near-linear vs quadratic scaling.

## Training Details

- **Pre-training corpus**: 158.95B tokens across 17.9M queries
- **Data sources**: 40+ datasets spanning scientific literature (S2ORC), general QA (Yahoo Answers, StackExchange, MS MARCO), news (CNN/DailyMail, XSum), domain-specific (Amazon reviews, CodeSearchNet)
- **Backbone**: Qwen3-4B-Instruct-2507 (parameters initialized from official weights)
- **New parameters**: Router Projectors W_{Q_R}, W_{K_R} (randomly initialized)
- **MSA layers**: Applied to upper half of layers only (18 layers in the 4B model context)
- **Compression**: Chunk size P=64 tokens
- **Top-k**: k=16 documents selected for attention
- **Post-training**: Two-stage SFT curriculum
  - Stage 1: Large-scale SFT at 8K context length (instruction following + reasoning)
  - Stage 2: Data cleaning + extension to 64K context (quality + length extrapolation)

## Hardware Requirements

- **Inference**: 2x NVIDIA A800 GPUs (80GB each, 160GB total)
- **Memory budget for 100M tokens**: ~169GB total compressed KV cache (P=64, 8 heads, dim 128, 18 layers, BF16)
  - Routing keys K^R alone: ~56GB (distributed across GPUs)
  - Content K, V: stored in CPU DRAM, fetched on-demand

## Limitations (from paper)

- Struggles when tasks require modeling **strong, tightly coupled dependencies across multiple documents**
- Memory Interleave helps but its effectiveness depends on more efficient designs for preserving inter-document relationships
- Performance gap on complex multi-hop tasks (MuSiQue) largely due to 4B parameter count vs 235B competitors

## Key Talking Points for Video

1. **Human memory equivalence**: 200-300M tokens estimated human lifelong memory. MSA scales to 100M with <9% degradation - approaching human scale.

2. **David vs Goliath**: A 4B parameter model with MSA beats 70B and 235B models using the best RAG pipelines. Architecture > raw parameter count for memory tasks.

3. **The elegant solution**: Instead of fighting the quadratic attention problem head-on, MSA compresses documents into latent states, routes queries to relevant docs, and only attends to selected compressed representations. Simple but powerful.

4. **Position encoding trick**: Document-wise RoPE is the key insight enabling train-short (64K) extrapolate-long (100M). Each document is positionally independent, so adding more documents doesn't shift position encodings.

5. **Practical deployment**: 100M tokens on just 2 GPUs. Tiered storage (GPU for routing, CPU for content) makes this feasible without exotic hardware.

6. **Memory Interleave**: The model can "think step by step" about retrieval - generating document IDs, reading them, then deciding if it needs more evidence before answering. This is crucial for multi-hop reasoning.
