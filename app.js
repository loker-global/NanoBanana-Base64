// ===================================
// NanoBanana-Base64 - Main Application
// ===================================

/**
 * Configuration Constants
 */
const CONFIG = {
    // Token estimation (adjust based on your LLM model)
    CHARS_PER_TOKEN: 4,  // ~4 characters per token for Base64
    COST_PER_1K_TOKENS: 0.002,  // $0.002 per 1K tokens (adjust for your model)
};

/**
 * Application State
 */
const state = {
    images: [],
    currentImageCount: 0,
    compressionSettings: {
        enabled: true,
        quality: 0.6,  // Reduced quality for smaller files
        maxWidth: 800,  // Reduced max dimensions
        maxHeight: 800,
        convertPngToJpeg: true,  // Always convert PNG to JPEG for better compression
        targetMaxSize: 100000  // Target max size in bytes (100KB)
    }
};

/**
 * DOM Elements
 */
const elements = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    gallery: document.getElementById('gallery'),
    gallerySection: document.getElementById('gallerySection'),
    emptyState: document.getElementById('emptyState'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    compressionToggle: null,
    qualitySlider: null,
    qualityValue: null,
    maxDimensionSelect: null,
    settingsContent: null,
    tokenCost: null,
    totalSize: null,
    targetSize: null
};

/**
 * Initialize Application
 */
function init() {
    // Get compression settings elements after DOM is ready
    elements.compressionToggle = document.getElementById('compressionToggle');
    elements.qualitySlider = document.getElementById('qualitySlider');
    elements.qualityValue = document.getElementById('qualityValue');
    elements.maxDimensionSelect = document.getElementById('maxDimensionSelect');
    elements.settingsContent = document.getElementById('settingsContent');
    elements.tokenCost = document.getElementById('tokenCost');
    elements.totalSize = document.getElementById('totalSize');
    elements.targetSize = document.getElementById('targetSize');
    
    // Set target size display
    if (elements.targetSize) {
        elements.targetSize.textContent = formatFileSize(state.compressionSettings.targetMaxSize);
    }
    
    setupEventListeners();
    setupCompressionSettings();
    console.log('🍌 NanoBanana-Base64 initialized with compression!');
}

/**
 * Setup Compression Settings
 */
function setupCompressionSettings() {
    // Toggle compression on/off
    elements.compressionToggle.addEventListener('change', (e) => {
        state.compressionSettings.enabled = e.target.checked;
        elements.settingsContent.style.display = e.target.checked ? 'block' : 'none';
        updateTokenCostEstimate();
    });
    
    // Quality slider
    elements.qualitySlider.addEventListener('input', (e) => {
        const quality = parseInt(e.target.value);
        state.compressionSettings.quality = quality / 100;
        elements.qualityValue.textContent = quality + '%';
        updateTokenCostEstimate();
    });
    
    // Max dimensions select
    elements.maxDimensionSelect.addEventListener('change', (e) => {
        const maxDimension = parseInt(e.target.value);
        state.compressionSettings.maxWidth = maxDimension;
        state.compressionSettings.maxHeight = maxDimension;
        updateTokenCostEstimate();
    });
    
    // Initial cost estimate
    updateTokenCostEstimate();
}

/**
 * Update Token Cost and Size Estimates
 */
function updateTokenCostEstimate() {
    if (!elements.tokenCost) return;
    
    if (state.images.length === 0) {
        elements.tokenCost.textContent = '~$0.00';
        if (elements.totalSize) {
            elements.totalSize.textContent = '0 B';
        }
        return;
    }
    
    // Calculate total Base64 size
    let totalBase64Length = 0;
    let totalByteSize = 0;
    state.images.forEach(img => {
        totalBase64Length += img.base64.length;
        totalByteSize += Math.round((img.base64.length * 3) / 4);
    });
    
    // Update total size display
    if (elements.totalSize) {
        elements.totalSize.textContent = formatFileSize(totalByteSize);
        
        // Add warning color if over target per image
        const averageSizePerImage = totalByteSize / state.images.length;
        if (averageSizePerImage > state.compressionSettings.targetMaxSize) {
            elements.totalSize.style.color = '#ff9800';
        } else {
            elements.totalSize.style.color = 'var(--primary-color)';
        }
    }
    
    // Estimate tokens using configurable ratio
    const estimatedTokens = Math.ceil(totalBase64Length / CONFIG.CHARS_PER_TOKEN);
    
    // Estimate cost using configurable price
    const estimatedCost = (estimatedTokens / 1000) * CONFIG.COST_PER_1K_TOKENS;
    
    elements.tokenCost.textContent = estimatedCost < 0.01 
        ? '< $0.01' 
        : `~$${estimatedCost.toFixed(2)}`;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // File input change event
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drop zone drag and drop events
    elements.dropZone.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);
    
    // Prevent default drag and drop behavior on the whole page
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
}

/**
 * Handle File Select from Input
 */
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

/**
 * Handle Drag Over Event
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    elements.dropZone.classList.add('drag-over');
}

/**
 * Handle Drag Leave Event
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    elements.dropZone.classList.remove('drag-over');
}

/**
 * Handle Drop Event
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    elements.dropZone.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

/**
 * Process Files
 */
function processFiles(files) {
    // Filter for image files only
    const imageFiles = Array.from(files).filter(file => {
        return file.type.startsWith('image/');
    });
    
    if (imageFiles.length === 0) {
        showToast('Please select valid image files', 'error');
        return;
    }
    
    // Show loading overlay
    showLoading();
    
    // Process each image
    imageFiles.forEach((file, index) => {
        setTimeout(() => {
            processImage(file);
            
            // Hide loading after last image
            if (index === imageFiles.length - 1) {
                setTimeout(() => {
                    hideLoading();
                    showToast(`${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} loaded successfully!`, 'success');
                }, 300);
            }
        }, index * 100); // Stagger image loading for smooth animation
    });
}

/**
 * Process Single Image
 */
function processImage(file) {
    // Check file size before processing
    const maxFileSize = 50 * 1024 * 1024; // 50MB limit for input files
    if (file.size > maxFileSize) {
        showToast(`File too large: ${file.name} (${formatFileSize(file.size)}). Maximum input size is 50MB.`, 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        // Check if compression is enabled
        if (state.compressionSettings.enabled) {
            try {
                const compressedData = await compressImage(e.target.result, file.type);
                const originalSize = file.size;
                const compressedSize = Math.round((compressedData.length * 3) / 4); // Approximate Base64 to bytes
                
                // Final size check after compression
                if (compressedSize > state.compressionSettings.targetMaxSize) {
                    showToast(`Warning: ${file.name} compressed to ${formatFileSize(compressedSize)} (target: ${formatFileSize(state.compressionSettings.targetMaxSize)}). This may cause quota issues.`, 'warning');
                }
                
                const imageData = {
                    id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: formatFileSize(compressedSize),
                    originalSize: formatFileSize(originalSize),
                    compressionRatio: ((1 - compressedSize / originalSize) * 100).toFixed(1),
                    base64: compressedData,
                    preview: compressedData
                };
                
                state.images.push(imageData);
                addImageToGallery(imageData);
                updateEmptyState();
                updateTokenCostEstimate();
            } catch (error) {
                console.error('Compression failed:', error);
                showToast(`Compression failed for: ${file.name}. Please try a smaller image.`, 'error');
            }
        } else {
            // No compression - warn about large files
            if (file.size > state.compressionSettings.targetMaxSize) {
                showToast(`Warning: ${file.name} is ${formatFileSize(file.size)}. Enable compression to reduce size and avoid quota issues.`, 'warning');
            }
            
            const imageData = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: formatFileSize(file.size),
                originalSize: formatFileSize(file.size),
                compressionRatio: '0',
                base64: e.target.result,
                preview: e.target.result
            };
            
            state.images.push(imageData);
            addImageToGallery(imageData);
            updateEmptyState();
            updateTokenCostEstimate();
        }
    };
    
    reader.onerror = () => {
        showToast('Error reading file: ' + file.name, 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Compress Image using Canvas with aggressive compression to stay under 100KB
 */
async function compressImage(dataURL, mimeType) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Start with more aggressive dimensions to ensure smaller file size
            let width = img.width;
            let height = img.height;
            let maxWidth = state.compressionSettings.maxWidth;
            let maxHeight = state.compressionSettings.maxHeight;
            
            // First pass: resize to max dimensions
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            
            // Helper function to get file size from data URL
            const getDataURLSize = (dataURL) => {
                const base64 = dataURL.split(',')[1];
                return Math.round((base64.length * 3) / 4);
            };
            
            // Helper function to compress with specific quality and dimensions
            const compressWithSettings = (w, h, quality) => {
                canvas.width = w;
                canvas.height = h;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);
                
                // Always use JPEG for better compression
                return canvas.toDataURL('image/jpeg', quality);
            };
            
            let quality = state.compressionSettings.quality;
            let currentWidth = width;
            let currentHeight = height;
            let compressedDataURL = compressWithSettings(currentWidth, currentHeight, quality);
            let currentSize = getDataURLSize(compressedDataURL);
            
            // If still too large, iteratively reduce quality and/or dimensions
            const targetSize = state.compressionSettings.targetMaxSize;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (currentSize > targetSize && attempts < maxAttempts) {
                attempts++;
                
                if (attempts % 2 === 1) {
                    // Odd attempts: reduce quality
                    quality = Math.max(0.1, quality - 0.1);
                } else {
                    // Even attempts: reduce dimensions
                    const reductionFactor = 0.9;
                    currentWidth = Math.round(currentWidth * reductionFactor);
                    currentHeight = Math.round(currentHeight * reductionFactor);
                    
                    // Don't go below minimum reasonable dimensions
                    if (currentWidth < 100 || currentHeight < 100) {
                        currentWidth = Math.max(100, currentWidth);
                        currentHeight = Math.max(100, currentHeight);
                        quality = Math.max(0.1, quality - 0.1);
                    }
                }
                
                compressedDataURL = compressWithSettings(currentWidth, currentHeight, quality);
                currentSize = getDataURLSize(compressedDataURL);
            }
            
            // Final check - if still too large, use minimum settings
            if (currentSize > targetSize) {
                compressedDataURL = compressWithSettings(
                    Math.min(400, currentWidth), 
                    Math.min(400, currentHeight), 
                    0.1
                );
            }
            
            resolve(compressedDataURL);
        };
        
        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };
        
        img.src = dataURL;
    });
}

/**
 * Add Image to Gallery
 */
function addImageToGallery(imageData) {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.dataset.id = imageData.id;
    
    // Show compression info if available
    const compressionInfo = imageData.compressionRatio > 0 
        ? `<div class="compression-badge">-${imageData.compressionRatio}%</div>` 
        : '';
    
    const sizeInfo = imageData.compressionRatio > 0
        ? `<div class="gallery-item-size">${imageData.size} (was ${imageData.originalSize})</div>`
        : `<div class="gallery-item-size">${imageData.size}</div>`;
    
    galleryItem.innerHTML = `
        <img src="${imageData.preview}" alt="${imageData.name}">
        ${compressionInfo}
        <div class="gallery-item-overlay">
            <div class="gallery-item-text">
                <span class="icon">📋</span>
                <p>Click to Copy Base64</p>
            </div>
        </div>
        <div class="gallery-item-info">
            <div class="gallery-item-name" title="${imageData.name}">${imageData.name}</div>
            ${sizeInfo}
        </div>
    `;
    
    // Add click event to copy Base64
    galleryItem.addEventListener('click', () => {
        copyToClipboard(imageData.base64, imageData.name);
    });
    
    elements.gallery.appendChild(galleryItem);
    
    // Update launch button visibility
    if (window.updateLaunchButtonVisibility) {
        window.updateLaunchButtonVisibility();
    }
}

/**
 * Copy Base64 to Clipboard
 */
async function copyToClipboard(base64, imageName) {
    try {
        // Use modern Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(base64);
            showToast(`Base64 copied for "${imageName}"!`, 'success');
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = base64;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                showToast(`Base64 copied for "${imageName}"!`, 'success');
            } catch (err) {
                showToast('Failed to copy to clipboard', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy to clipboard', 'error');
    }
}

/**
 * Show Toast Notification
 */
function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    
    // Update icon based on type
    const icon = elements.toast.querySelector('.toast-icon');
    if (type === 'success') {
        icon.textContent = '✅';
        elements.toast.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
    } else if (type === 'error') {
        icon.textContent = '❌';
        elements.toast.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
    } else if (type === 'warning') {
        icon.textContent = '⚠️';
        elements.toast.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
    }
    
    elements.toast.classList.add('show');
    
    // Hide toast after 3 seconds (longer for warnings)
    const duration = type === 'warning' ? 5000 : 3000;
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

/**
 * Show Loading Overlay
 */
function showLoading() {
    elements.loadingOverlay.classList.add('show');
}

/**
 * Hide Loading Overlay
 */
function hideLoading() {
    elements.loadingOverlay.classList.remove('show');
}

/**
 * Update Empty State Visibility
 */
function updateEmptyState() {
    if (state.images.length > 0) {
        elements.emptyState.classList.add('hidden');
    } else {
        elements.emptyState.classList.remove('hidden');
    }
}

/**
 * Format File Size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Clear Gallery (optional feature)
 */
function clearGallery() {
    state.images = [];
    elements.gallery.innerHTML = '';
    updateEmptyState();
    updateTokenCostEstimate();
    showToast('Gallery cleared', 'success');
}

/**
 * Keyboard Shortcuts
 */
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + O to open file picker
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        elements.fileInput.click();
    }
    
    // Ctrl/Cmd + K to clear gallery (optional)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (state.images.length > 0 && confirm('Clear all images?')) {
            clearGallery();
        }
    }
});

/**
 * Note: beforeunload protection removed as Base64 conversion is quick
 * and non-destructive. Users can freely navigate away.
 */

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===================================
// LAUNCH MODE Functionality
// ===================================

/**
 * Launch Mode State
 */
const launchModeState = {
    apiKey: null,
    referenceImages: [],
    currentJSON: null
};

/**
 * Initialize Launch Mode
 */
function initLaunchMode() {
    const launchModeBtn = document.getElementById('launchModeBtn');
    const backToGalleryBtn = document.getElementById('backToGalleryBtn');
    const setApiKeyBtn = document.getElementById('setApiKeyBtn');
    const generateJsonBtn = document.getElementById('generateJsonBtn');
    const sendToGoogleBtn = document.getElementById('sendToGoogleBtn');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    const downloadResultBtn = document.getElementById('downloadResultBtn');

    // Show/hide launch mode button based on images
    function updateLaunchButtonVisibility() {
        if (state.images.length > 0) {
            launchModeBtn.style.display = 'block';
        } else {
            launchModeBtn.style.display = 'none';
        }
    }

    // Toggle between gallery and launch mode
    launchModeBtn.addEventListener('click', () => {
        document.getElementById('gallerySection').style.display = 'none';
        document.getElementById('launchModeSection').style.display = 'block';
        populateReferenceImages();
    });

    backToGalleryBtn.addEventListener('click', () => {
        document.getElementById('launchModeSection').style.display = 'none';
        document.getElementById('gallerySection').style.display = 'block';
    });

    // API Key handling
    setApiKeyBtn.addEventListener('click', () => {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showToast('Please enter an API key', 'error');
            return;
        }

        // Store API key in memory only (never persisted)
        launchModeState.apiKey = apiKey;

        // Hide API key section, show main interface
        document.getElementById('apiKeySection').style.display = 'none';
        document.getElementById('launchInterface').style.display = 'block';

        // Clear input for security
        apiKeyInput.value = '';

        showToast('API Key set successfully! (stored in memory only)', 'success');
    });

    // Parameter tabs
    const paramTabs = document.querySelectorAll('.param-tab');
    paramTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs and contents
            paramTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.param-content').forEach(c => c.classList.remove('active'));

            // Add active to clicked tab and its content
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Generate JSON
    generateJsonBtn.addEventListener('click', () => {
        const json = generateJSON();
        launchModeState.currentJSON = json;
        document.getElementById('jsonPreview').textContent = JSON.stringify(json, null, 2);
        showToast('JSON generated successfully!', 'success');
    });

    // Send to Google API
    sendToGoogleBtn.addEventListener('click', async () => {
        if (!launchModeState.apiKey) {
            showToast('Please set your API key first', 'error');
            return;
        }

        if (!launchModeState.currentJSON) {
            showToast('Please generate JSON first', 'error');
            return;
        }

        await sendToGoogleAPI();
    });

    // Download JSON
    downloadJsonBtn.addEventListener('click', () => {
        if (!launchModeState.currentJSON) {
            showToast('Please generate JSON first', 'error');
            return;
        }

        downloadJSON(launchModeState.currentJSON);
    });

    // Download result
    downloadResultBtn.addEventListener('click', () => {
        // Will be implemented based on API response
        showToast('Download functionality will be available after generation', 'success');
    });

    // Call this when images are added/removed
    window.updateLaunchButtonVisibility = updateLaunchButtonVisibility;
}

/**
 * Populate Reference Images
 */
function populateReferenceImages() {
    const container = document.getElementById('referenceImagesList');
    container.innerHTML = '';

    launchModeState.referenceImages = [];

    state.images.forEach((image, index) => {
        const card = document.createElement('div');
        card.className = 'reference-image-card';

        card.innerHTML = `
            <img src="${image.preview}" alt="${image.name}" class="reference-image-preview">
            <div class="reference-image-controls">
                <div>
                    <label>Type:</label>
                    <select class="ref-type" data-index="${index}">
                        <option value="identity" ${index === 0 ? 'selected' : ''}>Identity</option>
                        <option value="style" ${index === 1 ? 'selected' : ''}>Style</option>
                        <option value="composition">Composition</option>
                        <option value="reference">Reference</option>
                    </select>
                </div>
                <div>
                    <label>Weight (0.0-1.0):</label>
                    <input type="number" class="ref-weight" data-index="${index}" 
                           min="0" max="1" step="0.05" value="${index === 0 ? '0.9' : '0.45'}">
                </div>
                <div>
                    <label>Lock Features (comma-separated):</label>
                    <input type="text" class="ref-lock" data-index="${index}" 
                           value="${index === 0 ? 'face, facial_proportions, skin_tone' : 'lighting_mood, color_palette'}"
                           placeholder="e.g., face, lighting">
                </div>
            </div>
        `;

        container.appendChild(card);

        // Store reference
        launchModeState.referenceImages.push({
            id: `ref_${index + 1}`,
            image: image,
            type: index === 0 ? 'identity' : 'style',
            weight: index === 0 ? 0.9 : 0.45,
            lock: []
        });
    });

    // Add event listeners for updates
    document.querySelectorAll('.ref-type').forEach(el => {
        el.addEventListener('change', updateReferenceImage);
    });
    document.querySelectorAll('.ref-weight').forEach(el => {
        el.addEventListener('input', updateReferenceImage);
    });
    document.querySelectorAll('.ref-lock').forEach(el => {
        el.addEventListener('input', updateReferenceImage);
    });
}

/**
 * Update Reference Image Settings
 */
function updateReferenceImage(event) {
    const index = parseInt(event.target.dataset.index);
    const ref = launchModeState.referenceImages[index];

    if (event.target.classList.contains('ref-type')) {
        ref.type = event.target.value;
    } else if (event.target.classList.contains('ref-weight')) {
        ref.weight = parseFloat(event.target.value);
    } else if (event.target.classList.contains('ref-lock')) {
        const lockText = event.target.value;
        ref.lock = lockText.split(',').map(s => s.trim()).filter(s => s);
    }
}

/**
 * Generate JSON Payload
 */
function generateJSON() {
    // Get all form values
    const masterPrompt = document.getElementById('masterPrompt').value;
    const negativePrompts = document.getElementById('negativePrompts').value
        .split(',').map(s => s.trim()).filter(s => s);

    // Reference images
    const referenceImages = launchModeState.referenceImages.map((ref, index) => {
        const imageObj = {
            id: ref.id,
            type: ref.type,
            image_base64: ref.image.base64,
            weight: ref.weight
        };
        
        // Only include lock if it has values
        if (ref.lock && ref.lock.length > 0) {
            imageObj.lock = ref.lock;
        }
        
        return imageObj;
    });

    // Composition
    const composition = {
        framing: document.getElementById('framing').value,
        perspective: document.getElementById('perspective').value,
        subject_placement: document.getElementById('subjectPlacement').value,
        background: document.getElementById('background').value,
        rule_of_thirds: false
    };

    // Style
    const styleParameters = {
        genre: document.getElementById('genre').value,
        mood: document.getElementById('mood').value,
        color_grading: document.getElementById('colorGrading').value,
        texture: document.getElementById('texture').value
    };

    // Technical
    const technicalSpecifications = {
        camera: {
            look: document.getElementById('cameraLook').value,
            focal_length: document.getElementById('focalLength').value,
            aperture: document.getElementById('aperture').value,
            depth_of_field: "soft background separation"
        },
        lighting: {
            type: document.getElementById('lightingType').value,
            setup: "soft directional key light",
            direction: "three-quarter",
            color_temperature: "neutral-warm"
        },
        quality: {
            detail: "ultra-high",
            realism: "very high"
        }
    };

    // Output
    const aspectRatio = document.getElementById('aspectRatio').value;
    const outputWidth = parseInt(document.getElementById('outputWidth').value);
    const outputHeight = parseInt(document.getElementById('outputHeight').value);
    const outputFormat = document.getElementById('outputFormat').value;

    const outputSettings = {
        aspect_ratio: aspectRatio,
        resolution: {
            width: outputWidth,
            height: outputHeight
        },
        format: outputFormat,
        deliverables: ["generated_image"]
    };

    // Build complete JSON
    const json = {
        model: "nano-banana-pro",
        consistency_id: `generation_${Date.now()}`,
        prompt: {
            text: masterPrompt,
            language: "en",
            negative: negativePrompts
        },
        reference_images: referenceImages,
        composition: composition,
        style_parameters: styleParameters,
        technical_specifications: technicalSpecifications,
        output_settings: outputSettings
    };

    return json;
}

/**
 * Send to Google API
 */
async function sendToGoogleAPI() {
    showLoading();
    document.getElementById('loadingOverlay').querySelector('.loading-text').textContent = 'Sending to Google API...';

    try {
        // NOTE: This is a placeholder endpoint. Update with your actual API endpoint.
        // The nano-banana-pro model and endpoint should be configured based on your API provider.
        const apiEndpoint = 'https://your-api-endpoint.com/v1/generate';
        
        const response = await axios.post(apiEndpoint, launchModeState.currentJSON, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${launchModeState.apiKey}`
            },
            timeout: 60000  // 60 second timeout
        });

        hideLoading();

        // Display response
        displayAPIResponse(response.data);
        showToast('Image generated successfully!', 'success');

    } catch (error) {
        hideLoading();
        console.error('API Error:', error);

        let errorMessage = 'Failed to generate image. ';
        if (error.response) {
            errorMessage += `Status: ${error.response.status}. ${error.response.data?.error?.message || ''}`;
        } else if (error.request) {
            errorMessage += 'No response from server. Check your API key and internet connection.';
        } else {
            errorMessage += error.message;
        }

        showToast(errorMessage, 'error');

        // Offer mock response for testing without blocking confirm dialog
        setTimeout(() => {
            const mockBtn = document.createElement('button');
            mockBtn.textContent = '🧪 View Mock Response (Testing)';
            mockBtn.className = 'btn-secondary';
            mockBtn.style.marginTop = '20px';
            mockBtn.onclick = () => {
                displayMockResponse();
                mockBtn.remove();
            };
            
            const responseSection = document.getElementById('responseSection');
            if (responseSection) {
                responseSection.style.display = 'block';
                responseSection.innerHTML = '<h3>⚠️ API Call Failed</h3><p>You can test the interface with a mock response:</p>';
                responseSection.appendChild(mockBtn);
            }
        }, 500);
    }
}

/**
 * Display API Response
 */
function displayAPIResponse(data) {
    const responseSection = document.getElementById('responseSection');
    const responseContent = document.getElementById('responseContent');

    // Check if response contains an image
    if (data.image_base64) {
        responseContent.innerHTML = `
            <img src="${data.image_base64}" alt="Generated Image" class="response-image">
            <p>Generation ID: ${data.generation_id || 'N/A'}</p>
        `;
    } else if (data.image_url) {
        responseContent.innerHTML = `
            <img src="${data.image_url}" alt="Generated Image" class="response-image">
            <p>Generation ID: ${data.generation_id || 'N/A'}</p>
        `;
    } else {
        responseContent.innerHTML = `
            <pre class="json-preview">${JSON.stringify(data, null, 2)}</pre>
        `;
    }

    responseSection.style.display = 'block';
    responseSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Display Mock Response (for testing)
 */
function displayMockResponse() {
    const mockData = {
        generation_id: 'mock_' + Date.now(),
        status: 'completed',
        message: 'This is a mock response for testing purposes.',
        image_base64: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlRFU1QgR0VORVJBVEVEIFJFU1VMVC0gTU9DSyBJTUFHRTwvdGV4dD48L3N2Zz4='
    };

    displayAPIResponse(mockData);
}

/**
 * Download JSON
 */
function downloadJSON(json) {
    const jsonString = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nano-banana-generation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('JSON downloaded successfully!', 'success');
}

// Initialize Launch Mode when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLaunchMode);
} else {
    initLaunchMode();
}

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        state,
        formatFileSize,
        copyToClipboard,
        processFiles
    };
}
