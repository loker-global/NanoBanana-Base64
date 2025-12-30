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

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        state,
        formatFileSize,
        copyToClipboard,
        processFiles
    };
}
