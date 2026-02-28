// ═══════════════════════════════════════════════════════════
// VisionProcessingArbiter.js - Multi-Modal Vision Processing
// GPU-Accelerated CLIP for image understanding
// ═══════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';

/**
 * VisionProcessingArbiter
 *
 * Multi-modal vision processing with CLIP
 * - Image understanding and classification
 * - Text-to-image similarity
 * - Visual memory storage
 * - Batch processing for GPU efficiency
 * - Zero-shot image classification
 */
export class VisionProcessingArbiter extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = config.name || 'VisionProcessingArbiter';
    this.batchSize = config.batchSize || 32;
    this.loadPipeline = config.loadPipeline || null;

    // CLIP model for vision-language understanding
    this.clipModel = null;
    this.imageProcessor = null;

    // Vision memory cache
    this.visualMemories = new Map();

    // Metrics
    this.metrics = {
      imagesProcessed: 0,
      classificationsRun: 0,
      similaritySearches: 0,
      batchesProcessed: 0,
      averageProcessingTime: 0
    };

    this.storagePath = path.join(process.cwd(), '.soma', 'visual_memory.json');

    console.log(`[${this.name}] 👁️  Vision Processing Arbiter initialized`);
    console.log(`[${this.name}]    Batch Size: ${this.batchSize}`);
  }

  async initialize() {
    console.log(`[${this.name}] Initializing vision processing system...`);

    try {
      // Get GPU info if available (with defensive null checks)
      if (this.loadPipeline) {
        try {
          const status = this.loadPipeline.getStatus();
          const gpuAvailable = status?.hardware?.gpu?.available ?? false;
          const gpuType = status?.hardware?.gpu?.type ?? 'Unknown';
          console.log(`[${this.name}]    GPU: ${gpuAvailable ? gpuType : 'CPU only'}`);
        } catch (gpuError) {
          console.warn(`[${this.name}]    GPU detection failed: ${gpuError.message}. Using CPU.`);
        }
      } else {
        console.log(`[${this.name}]    GPU: CPU only (no LoadPipeline)`);
      }

      // Load memories from disk
      await this.loadMemories();

      // Load CLIP model (this will use GPU if available)
      console.log(`[${this.name}]    Loading CLIP model (may take a moment)...`);

      // Load zero-shot classification (this gives us full CLIP access)
      this.zeroShotClassifier = await pipeline(
        'zero-shot-image-classification',
        'Xenova/clip-vit-base-patch32'
      );

      console.log(`[${this.name}]    ✅ CLIP model loaded successfully`);

      console.log(`[${this.name}] ✅ Vision processing system ready`);
      this.emit('initialized');

      return { success: true };
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to initialize:`, error.message);
      throw error;
    }
  }

  async loadMemories() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });

      const data = await fs.readFile(this.storagePath, 'utf8');
      const memories = JSON.parse(data);
      
      this.visualMemories = new Map(memories);
      console.log(`[${this.name}]    Loaded ${this.visualMemories.size} visual memories from disk`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`[${this.name}]    No existing visual memory file found. Starting fresh.`);
      } else {
        console.error(`[${this.name}]    Failed to load memories:`, error.message);
      }
    }
  }

  async saveMemories() {
    try {
      const data = JSON.stringify(Array.from(this.visualMemories.entries()), null, 2);
      await fs.writeFile(this.storagePath, data, 'utf8');
      // console.log(`[${this.name}]    Saved ${this.visualMemories.size} visual memories to disk`);
    } catch (error) {
      console.error(`[${this.name}]    Failed to save memories:`, error.message);
    }
  }

  /**
   * Process a single image and get its embedding
   */
  async processImage(imagePathOrURL) {
    const startTime = Date.now();

    try {
      // Use the zero-shot classifier to get image features
      // We pass a dummy label just to get the embedding
      const result = await this.zeroShotClassifier(imagePathOrURL, ['dummy']);

      // Extract embeddings from the model's internal state
      // For now, use the classifier result as a proxy
      const embedding = result.map(r => r.score);

      const duration = Date.now() - startTime;

      this.metrics.imagesProcessed++;
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime * (this.metrics.imagesProcessed - 1) + duration) /
        this.metrics.imagesProcessed;

      return {
        embedding,
        dimensions: [embedding.length],
        processingTime: duration
      };
    } catch (error) {
      console.error(`[${this.name}] Error processing image:`, error.message);
      throw error;
    }
  }

  /**
   * Process multiple images in batches (GPU efficient)
   */
  async processBatch(imagePaths) {
    console.log(`[${this.name}] Processing batch of ${imagePaths.length} images...`);

    const startTime = Date.now();
    const embeddings = [];

    // Split into chunks of batchSize
    for (let i = 0; i < imagePaths.length; i += this.batchSize) {
      const batch = imagePaths.slice(i, i + this.batchSize);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(img => this.processImage(img))
      );

      embeddings.push(...batchResults);
      this.metrics.batchesProcessed++;

      console.log(`[${this.name}]    Batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(imagePaths.length / this.batchSize)} complete`);
    }

    const duration = Date.now() - startTime;
    console.log(`[${this.name}] ✅ Processed ${imagePaths.length} images in ${duration}ms`);
    console.log(`[${this.name}]    Throughput: ${((imagePaths.length / duration) * 1000).toFixed(2)} images/sec`);

    return embeddings;
  }

  /**
   * Zero-shot image classification
   */
  async classifyImage(imagePathOrURL, candidateLabels) {
    console.log(`[${this.name}] Classifying image with labels:`, candidateLabels);

    const startTime = Date.now();

    try {
      const result = await this.zeroShotClassifier(imagePathOrURL, candidateLabels);

      const duration = Date.now() - startTime;
      this.metrics.classificationsRun++;

      console.log(`[${this.name}]    Classification: ${result[0].label} (${(result[0].score * 100).toFixed(2)}%)`);

      return {
        classifications: result.map(r => ({
          label: r.label,
          score: r.score,
          confidence: r.score
        })),
        topPrediction: result[0].label,
        confidence: result[0].score,
        processingTime: duration
      };
    } catch (error) {
      console.error(`[${this.name}] Error classifying image:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate similarity between text and image
   */
  async textImageSimilarity(text, imagePathOrURL) {
    console.log(`[${this.name}] Computing text-image similarity...`);

    try {
      // Use zero-shot classification with the text as a label
      // CLIP gives us the probability that the image matches the text
      const result = await this.zeroShotClassifier(imagePathOrURL, [text, 'something else']);

      // The score for our text label is the similarity
      const similarity = result[0].label === text ? result[0].score : result[1].score;

      console.log(`[${this.name}]    Similarity: ${(similarity * 100).toFixed(2)}%`);

      return {
        similarity,
        text,
        image: imagePathOrURL
      };
    } catch (error) {
      console.error(`[${this.name}] Error computing similarity:`, error.message);
      throw error;
    }
  }

  /**
   * Find similar images from stored memories
   */
  async findSimilarImages(queryText, topK = 5) {
    console.log(`[${this.name}] Searching for ${topK} similar images...`);

    this.metrics.similaritySearches++;

    if (this.visualMemories.size === 0) {
      console.warn(`[${this.name}]    No visual memories stored yet`);
      return [];
    }

    try {
      // Calculate similarities using zero-shot classification
      const similarities = [];

      for (const [id, memory] of this.visualMemories) {
        // Use CLIP to check how well the query matches this image
        const result = await this.zeroShotClassifier(memory.path, [queryText, 'something else']);
        const similarity = result[0].label === queryText ? result[0].score : 1 - result[0].score;

        similarities.push({
          id,
          similarity,
          path: memory.path,
          metadata: memory.metadata
        });
      }

      // Sort by similarity and return top K
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      console.log(`[${this.name}]    Found ${results.length} similar images`);

      return results;
    } catch (error) {
      console.error(`[${this.name}] Error searching images:`, error.message);
      throw error;
    }
  }

  /**
   * Store a visual memory
   */
  async storeVisualMemory(imagePathOrURL, metadata = {}) {
    const memoryId = `vis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${this.name}] Storing visual memory: ${memoryId}`);

    try {
      // Process image and get embedding
      const result = await this.processImage(imagePathOrURL);

      // Store in memory
      this.visualMemories.set(memoryId, {
        id: memoryId,
        path: imagePathOrURL,
        embedding: result.embedding,
        metadata: {
          ...metadata,
          storedAt: Date.now(),
          dimensions: result.dimensions
        }
      });

      await this.saveMemories();

      console.log(`[${this.name}]    Stored visual memory: ${memoryId}`);

      this.emit('visual_memory_stored', { id: memoryId, path: imagePathOrURL });

      return { id: memoryId, success: true };
    } catch (error) {
      console.error(`[${this.name}] Error storing visual memory:`, error.message);
      throw error;
    }
  }

  /**
   * Cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get arbiter status
   */
  getStatus() {
    return {
      name: this.name,
      modelLoaded: !!this.clipModel,
      visualMemoriesStored: this.visualMemories.size,
      metrics: this.metrics,
      batchSize: this.batchSize
    };
  }

  /**
   * Object detection with bounding boxes using DETR.
   * Returns objects found in the image with pixel coordinates and center points.
   * Center points can be passed directly to ComputerControl.executeAction for precise clicking.
   *
   * Falls back to classifyImage (whole-image CLIP) if DETR isn't available.
   */
  async detectObjects(imagePathOrURL, threshold = 0.7) {
    console.log(`[${this.name}] 🔍 Detecting objects (threshold: ${threshold})`);
    const startTime = Date.now();

    try {
      // Lazy-load DETR detector (separate from CLIP classifier)
      if (!this._objectDetector) {
        console.log(`[${this.name}]    Loading DETR object detection model...`);
        this._objectDetector = await pipeline(
          'object-detection',
          'Xenova/detr-resnet-50',
          { revision: 'no_timm' }
        );
        console.log(`[${this.name}]    ✅ DETR model ready`);
      }

      const results = await this._objectDetector(imagePathOrURL, { threshold });

      const objects = (results || []).map(r => ({
        label:      r.label,
        confidence: parseFloat((r.score || 0).toFixed(3)),
        box:        r.box,  // { xmin, ymin, xmax, ymax } in pixels
        center: {           // ready for mouse_action { type:'click', x, y }
          x: Math.round(((r.box?.xmin || 0) + (r.box?.xmax || 0)) / 2),
          y: Math.round(((r.box?.ymin || 0) + (r.box?.ymax || 0)) / 2)
        }
      }));

      this.metrics.classificationsRun++;
      console.log(`[${this.name}]    Found ${objects.length} object(s) in ${Date.now() - startTime}ms`);
      return { objects, count: objects.length, processingTime: Date.now() - startTime };

    } catch (detrErr) {
      console.warn(`[${this.name}] DETR unavailable (${detrErr.message}), falling back to CLIP classification`);
      // Graceful fallback: CLIP whole-image classification (no bounding boxes)
      try {
        const labels = ['person', 'car', 'button', 'text', 'window', 'icon', 'image'];
        const clip = await this.classifyImage(imagePathOrURL, labels);
        return {
          objects: clip.classifications.filter(c => c.score > threshold).map(c => ({
            label: c.label, confidence: c.score, box: null, center: null
          })),
          count: clip.classifications.filter(c => c.score > threshold).length,
          processingTime: Date.now() - startTime,
          fallback: 'CLIP (no bounding boxes)'
        };
      } catch (clipErr) {
        return { error: `Object detection failed: ${detrErr.message}`, objects: [], count: 0 };
      }
    }
  }

  async shutdown() {
    console.log(`[${this.name}] Shutting down...`);

    // Clear memories
    this.visualMemories.clear();

    this.emit('shutdown');
    return { success: true };
  }
}

export default VisionProcessingArbiter;
