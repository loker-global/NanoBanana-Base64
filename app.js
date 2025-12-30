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
    initLaunchMode(); // Initialize Launch Mode
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
    currentJSON: null,
    availableModels: null
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

    // Make function globally accessible and call it initially
    window.updateLaunchButtonVisibility = updateLaunchButtonVisibility;
    updateLaunchButtonVisibility();

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
    setApiKeyBtn.addEventListener('click', async () => {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showToast('Please enter an API key', 'error');
            return;
        }

        // Show loading while validating
        setApiKeyBtn.disabled = true;
        setApiKeyBtn.textContent = 'Validating...';
        showLoading();
        document.getElementById('loadingOverlay').querySelector('.loading-text').textContent = 'Validating API key...';

        try {
            // Validate the API key
            const validation = await validateApiKey(apiKey);
            
            if (!validation.isValid) {
                hideLoading();
                setApiKeyBtn.disabled = false;
                setApiKeyBtn.textContent = 'Set API Key';
                showToast(validation.error, 'error');
                return;
            }

            // Store API key and available models
            launchModeState.apiKey = apiKey;
            launchModeState.categorizedModels = validation.categorizedModels;

            hideLoading();
            setApiKeyBtn.disabled = false;
            setApiKeyBtn.textContent = 'Set API Key';

            // Hide API key section, show main interface
            document.getElementById('apiKeySection').style.display = 'none';
            document.getElementById('launchInterface').style.display = 'block';

            // Add model selector to the interface
            addModelSelectorToInterface(validation.categorizedModels);

            // Clear input for security
            apiKeyInput.value = '';

            const totalModels = validation.totalModels;
            const textCount = validation.categorizedModels.textGeneration.length;
            const imageCount = validation.categorizedModels.imageGeneration.length;
            
            showToast(`✅ API key validated! Found ${totalModels} models (${textCount} text, ${imageCount} image)`, 'success');
            console.log('Model categories:', validation.categorizedModels);
            
        } catch (error) {
            hideLoading();
            setApiKeyBtn.disabled = false;
            setApiKeyBtn.textContent = 'Set API Key';
            console.error('API key validation error:', error);
            showToast('Failed to validate API key. Please try again.', 'error');
        }
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
}

/**
 * Add Model Selector to Interface
 */
function addModelSelectorToInterface(categorizedModels) {
    // Find the parameters section to add the model selector
    const parametersSection = document.querySelector('.parameters-section');
    
    if (!parametersSection) {
        console.error('Parameters section not found');
        return;
    }
    
    // Create model selector HTML
    const modelSelectorHTML = `
        <div class="model-selector-section">
            <h3>🤖 Model Selection</h3>
            <div class="model-selector-grid">
                <div class="model-category">
                    <label for="generationType">Generation Type:</label>
                    <select id="generationType" class="generation-type-select">
                        <option value="text">Text/Prompt Enhancement</option>
                        <option value="image">Image Descriptions & Visual Concepts</option>
                        <option value="all">Show All Available Models</option>
                    </select>
                </div>
                <div class="model-category">
                    <label for="selectedModel">Available Models:</label>
                    <select id="selectedModel" class="model-select">
                        <!-- Will be populated based on generation type -->
                    </select>
                </div>
                <div class="model-info" id="modelInfo">
                    <span class="model-info-text">Select a model to see details</span>
                </div>
            </div>
        </div>
    `;
    
    // Insert the model selector at the beginning of the parameters section
    parametersSection.insertAdjacentHTML('afterbegin', modelSelectorHTML);
    
    // Add event listeners for the selectors
    const generationTypeSelect = document.getElementById('generationType');
    const modelSelect = document.getElementById('selectedModel');
    const modelInfo = document.getElementById('modelInfo');
    
    // Function to populate model select based on generation type
    function populateModelSelect(type) {
        let models;
        
        if (type === 'all') {
            models = categorizedModels.allModels || [];
        } else {
            models = type === 'text' 
                ? categorizedModels.textGeneration 
                : categorizedModels.imageGeneration;
        }
        
        console.log(`🔍 Populating ${type} models:`, models.map(m => ({
            name: m.name,
            displayName: m.displayName,
            methods: m.supportedGenerationMethods
        })));
        
        modelSelect.innerHTML = '';
        
        if (models.length === 0) {
            modelSelect.innerHTML = '<option value="">No models available</option>';
            modelInfo.innerHTML = '<span class="model-info-text">No models available for this type</span>';
            console.warn(`⚠️ No ${type} models available`);
            return;
        }
        
        // Add models to select
        models.forEach(model => {
            const option = document.createElement('option');
            const modelName = model.name.replace('models/', '');
            option.value = modelName;
            
            // Enhanced display name logic for custom models
            let displayName = model.displayName || modelName;
            
            // Special handling for Nano Banana models
            if (modelName.toLowerCase().includes('nano') || 
                modelName.toLowerCase().includes('banana') ||
                displayName.toLowerCase().includes('nano') || 
                displayName.toLowerCase().includes('banana')) {
                // Add emoji and format for Nano Banana models
                if (!displayName.includes('🍌')) {
                    displayName = `🍌 ${displayName}`;
                }
            } else if (modelName.includes('gemini')) {
                // Add emoji for Gemini models
                if (!displayName.includes('✨')) {
                    displayName = `✨ ${displayName}`;
                }
            } else if (modelName.includes('imagen')) {
                // Add emoji for Imagen models
                if (!displayName.includes('🎨')) {
                    displayName = `🎨 ${displayName}`;
                }
            }
            
            option.textContent = displayName;
            option.dataset.fullModel = JSON.stringify(model);
            modelSelect.appendChild(option);
        });
        
        // Select the first model by default
        if (models.length > 0) {
            modelSelect.selectedIndex = 0;
            updateModelInfo();
        }
    }
    
    // Function to update model info display
    function updateModelInfo() {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (!selectedOption || !selectedOption.dataset.fullModel) {
            modelInfo.innerHTML = '<span class="model-info-text">Select a model to see details</span>';
            return;
        }
        
        const model = JSON.parse(selectedOption.dataset.fullModel);
        const inputLimit = model.inputTokenLimit ? `${model.inputTokenLimit.toLocaleString()} tokens` : 'Not specified';
        const outputLimit = model.outputTokenLimit ? `${model.outputTokenLimit.toLocaleString()} tokens` : 'Not specified';
        const methods = model.supportedGenerationMethods ? model.supportedGenerationMethods.join(', ') : 'Not specified';
        
        modelInfo.innerHTML = `
            <div class="model-details">
                <p><strong>Description:</strong> ${model.description || 'No description available'}</p>
                <p><strong>Input Limit:</strong> ${inputLimit}</p>
                <p><strong>Output Limit:</strong> ${outputLimit}</p>
                <p><strong>Methods:</strong> ${methods}</p>
                <p><strong>Version:</strong> ${model.version}</p>
            </div>
        `;
    }
    
    // Event listeners
    generationTypeSelect.addEventListener('change', (e) => {
        populateModelSelect(e.target.value);
        
        // Show/hide prompt enhancement sections based on selection
        const promptSection = document.querySelector('.prompt-section');
        const jsonPreviewSection = document.querySelector('.json-preview-section');
        const sendBtn = document.getElementById('sendToGoogleBtn');
        
        if (e.target.value === 'text') {
            // Show prompt enhancement sections
            if (promptSection) promptSection.style.display = 'block';
            if (jsonPreviewSection) jsonPreviewSection.style.display = 'block';
            if (sendBtn) sendBtn.textContent = '🚀 Enhance Prompt with AI';
        } else if (e.target.value === 'image') {
            // Hide prompt enhancement sections for direct image generation
            if (promptSection) promptSection.style.display = 'block'; // Keep prompt for image generation
            if (jsonPreviewSection) jsonPreviewSection.style.display = 'none';
            if (sendBtn) sendBtn.textContent = '🎨 Generate Image Description';
        } else if (e.target.value === 'all') {
            // Show all sections for all models view
            if (promptSection) promptSection.style.display = 'block';
            if (jsonPreviewSection) jsonPreviewSection.style.display = 'block';
            if (sendBtn) sendBtn.textContent = '🔍 Test Selected Model';
        }
    });
    
    modelSelect.addEventListener('change', updateModelInfo);
    
    // Initialize with text generation
    populateModelSelect('text');
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
 * Format our JSON structure into a text prompt for Gemini
 */
function formatPromptForGemini(jsonData) {
    // Safe property access with defaults
    const masterPrompt = jsonData.prompt?.text || 'No prompt specified';
    const negativePrompts = jsonData.prompt?.negative?.join(', ') || 'None';
    
    const composition = jsonData.composition || {};
    const style = jsonData.style_parameters || {};
    const tech = jsonData.technical_specifications || {};
    const camera = tech.camera || {};
    const lighting = tech.lighting || {};
    const output = jsonData.output_settings || {};
    const resolution = output.resolution || {};

    const prompt = `I need you to create an extremely detailed and professional image generation prompt based on these specifications. This prompt will be used with image generation AI models like Midjourney, DALL-E, or Stable Diffusion.

ORIGINAL SPECIFICATIONS:
Master Prompt: ${masterPrompt}
Negative Prompts: ${negativePrompts}

Composition: ${composition.framing || 'not specified'}, ${composition.perspective || 'not specified'}, ${composition.subject_placement || 'not specified'}, ${composition.background || 'not specified'}

Style: ${style.genre || 'not specified'}, ${style.mood || 'not specified'}, ${style.color_grading || 'not specified'}, ${style.texture || 'not specified'}

Technical: ${camera.look || 'not specified'}, ${camera.focal_length || 'not specified'}, ${camera.aperture || 'not specified'}, ${lighting.type || 'not specified'}

Output: ${output.aspect_ratio || 'not specified'}, ${resolution.width || 'not specified'}x${resolution.height || 'not specified'}, ${output.format || 'not specified'}

Please create:
1. An ENHANCED MAIN PROMPT (150-200 words) that combines all these elements into a cohesive, detailed description
2. An OPTIMIZED NEGATIVE PROMPT list (comma-separated)
3. TECHNICAL TAGS for camera settings and quality
4. STYLE KEYWORDS for artistic direction

Format your response clearly with headers for each section. Make the language vivid and specific for best image generation results.`;

    return prompt;
}

/**
 * Try different Gemini models in order of preference
 */
async function tryGeminiModels(requestData, apiKey) {
    // Use validated available models if available, otherwise fall back to default list
    const availableModels = launchModeState.availableModels;
    const defaultModels = [
        'gemini-1.5-flash',
        'gemini-1.5-pro', 
        'gemini-pro',
        'gemini-1.0-pro'
    ];
    
    const modelsToTry = availableModels && availableModels.length > 0 ? availableModels : defaultModels;
    console.log('Models to try:', modelsToTry);
    
    for (const model of modelsToTry) {
        try {
            const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            console.log(`Trying model: ${model}`);
            
            const response = await axios.post(apiEndpoint, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });
            
            console.log(`✅ Success with model: ${model}`);
            return { response, model };
            
        } catch (error) {
            console.log(`❌ Failed with model: ${model}`, error.response?.status, error.response?.data?.error?.message);
            
            // If it's not a 404 (model not found), throw the error
            if (error.response?.status !== 404) {
                throw error;
            }
            // Continue to next model if 404
        }
    }
    
    throw new Error('All available Gemini models failed. This should not happen if API key was validated properly.');
}

/**
 * Send to Google API
 */
async function sendToGoogleAPI() {
    showLoading();
    
    try {
        // Get selected model and generation type
        const generationType = document.getElementById('generationType')?.value || 'text';
        const selectedModelName = document.getElementById('selectedModel')?.value;
        
        if (!selectedModelName) {
            throw new Error('Please select a model first');
        }
        
        console.log('🚀 Sending request to API...');
        console.log('Generation type:', generationType);
        console.log('Selected model:', selectedModelName);
        console.log('API Key length:', launchModeState.apiKey?.length);
        
        // Determine actual API call type
        let actualGenerationType = generationType;
        
        // For "all" option, determine the type based on the model name
        if (generationType === 'all') {
            const modelNameLower = selectedModelName.toLowerCase();
            if (modelNameLower.includes('imagen') || modelNameLower.includes('veo')) {
                actualGenerationType = 'image';
            } else {
                actualGenerationType = 'text'; // Default to text for custom models like Nano Banana
            }
            console.log(`🔍 Auto-detected generation type for ${selectedModelName}: ${actualGenerationType}`);
        }
        
        if (actualGenerationType === 'image') {
            document.getElementById('loadingOverlay').querySelector('.loading-text').textContent = 'Generating image...';
            await handleImageGeneration(selectedModelName);
        } else {
            document.getElementById('loadingOverlay').querySelector('.loading-text').textContent = 'Enhancing prompt...';
            await handleTextGeneration(selectedModelName);
        }

    } catch (error) {
        hideLoading();
        console.error('API Error:', error);

        let errorMessage = 'Failed to generate content. ';
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data?.error;
            
            if (status === 404) {
                errorMessage += 'Model not found. Please try a different model. ';
            } else if (status === 403) {
                errorMessage += 'Invalid API key or insufficient permissions. Please check your Google AI Studio API key. ';
            } else if (status === 401) {
                errorMessage += 'Authentication failed. Please verify your API key is correct. ';
            } else if (status === 429) {
                errorMessage += 'Rate limit exceeded. Please wait and try again. ';
            } else {
                errorMessage += `Status: ${status}. ${errorData?.message || ''}`;
            }
        } else if (error.request) {
            errorMessage += 'No response from server. Check your internet connection.';
        } else {
            errorMessage += error.message;
        }

        showToast(errorMessage, 'error');
    }
}

/**
 * Handle Text Generation (Prompt Enhancement)
 */
async function handleTextGeneration(selectedModelName) {
    console.log('Current JSON exists:', !!launchModeState.currentJSON);
    
    if (!launchModeState.currentJSON) {
        throw new Error('Please generate JSON first');
    }
    
    // Build API endpoint
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelName}:generateContent?key=${launchModeState.apiKey}`;
    console.log('Endpoint:', apiEndpoint.replace(launchModeState.apiKey, 'API_KEY_HIDDEN'));
    
    // Transform our JSON to Gemini API format
    const promptText = formatPromptForGemini(launchModeState.currentJSON);
    console.log('Generated prompt length:', promptText.length);
    
    const geminiRequest = {
        contents: [{
            parts: [{
                text: promptText
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };
    
    console.log('Request payload:', JSON.stringify(geminiRequest, null, 2));
    
    const response = await axios.post(apiEndpoint, geminiRequest, {
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 60000
    });
    
    console.log(`✅ API call successful with model: ${selectedModelName}`);
    hideLoading();

    // Extract the generated content from response
    const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
        displayGeminiResponse(generatedText);
        showToast('Enhanced prompt generated successfully!', 'success');
    } else {
        throw new Error('No content generated from API');
    }
}

/**
 * Handle Image Generation
 */
async function handleImageGeneration(selectedModelName) {
    // Get the master prompt for image generation
    const masterPrompt = document.getElementById('masterPrompt')?.value || 'A beautiful image';
    
    console.log('Image generation prompt:', masterPrompt);
    
    // For Gemini models with image generation capability, use generateContent endpoint
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelName}:generateContent?key=${launchModeState.apiKey}`;
    console.log('Endpoint:', apiEndpoint.replace(launchModeState.apiKey, 'API_KEY_HIDDEN'));
    
    // Different request structure for image generation with Gemini models
    const imageRequest = {
        contents: [{
            parts: [{
                text: `Generate an image: ${masterPrompt}`
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };
    
    console.log('Image request payload:', JSON.stringify(imageRequest, null, 2));
    
    const response = await axios.post(apiEndpoint, imageRequest, {
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 120000 // Longer timeout for image generation
    });
    
    console.log(`✅ Image generation API call successful with model: ${selectedModelName}`);
    hideLoading();

    // Most Gemini models return text content, even for "image generation"
    // They provide detailed descriptions or instructions rather than actual images
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const generatedText = response.data.candidates[0].content.parts[0].text;
        displayGeminiResponse(generatedText);
        showToast('Image description generated successfully!', 'success');
    } else if (response.data?.candidates?.[0]?.image) {
        // Actual image data (rare with current Gemini models)
        displayImageResponse(response.data.candidates[0].image, selectedModelName);
        showToast('Image generated successfully!', 'success');
    } else if (response.data?.image) {
        // Alternative image response format
        displayImageResponse(response.data.image, selectedModelName);
        showToast('Image generated successfully!', 'success');
    } else {
        console.log('Full response:', response.data);
        displayAPIResponse(response.data);
        showToast('Image generation completed!', 'success');
    }
}

/**
 * Display Image Response
 */
function displayImageResponse(imageData, modelName) {
    const responseSection = document.getElementById('responseSection');
    const responseContent = document.getElementById('responseContent');
    
    let imageHtml = '';
    
    // Handle different image response formats
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        // Base64 image data
        imageHtml = `<img src="${imageData}" alt="Generated Image" class="response-image">`;
    } else if (imageData.url) {
        // Image URL
        imageHtml = `<img src="${imageData.url}" alt="Generated Image" class="response-image">`;
    } else if (imageData.base64) {
        // Base64 in object format
        const mimeType = imageData.mimeType || 'image/png';
        imageHtml = `<img src="data:${mimeType};base64,${imageData.base64}" alt="Generated Image" class="response-image">`;
    } else {
        // Fallback - show raw data
        imageHtml = `<pre class="json-preview">${JSON.stringify(imageData, null, 2)}</pre>`;
    }
    
    responseContent.innerHTML = `
        <div class="image-response">
            <h4>🎨 Generated Image</h4>
            <div class="generated-image-container">
                ${imageHtml}
            </div>
            <div class="image-info">
                <p><strong>Model:</strong> ${modelName}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="image-actions">
                <button class="btn-primary" onclick="downloadGeneratedImage()">
                    💾 Download Image
                </button>
                <button class="btn-secondary" onclick="copyImageToClipboard()">
                    📋 Copy Image
                </button>
            </div>
        </div>
    `;

    responseSection.style.display = 'block';
    responseSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Download Generated Image
 */
function downloadGeneratedImage() {
    const img = document.querySelector('.response-image');
    if (!img) {
        showToast('No image to download', 'error');
        return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Image downloaded!', 'success');
    });
}

/**
 * Copy Image to Clipboard
 */
async function copyImageToClipboard() {
    const img = document.querySelector('.response-image');
    if (!img) {
        showToast('No image to copy', 'error');
        return;
    }
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showToast('Image copied to clipboard!', 'success');
        });
    } catch (error) {
        console.error('Failed to copy image:', error);
        showToast('Failed to copy image to clipboard', 'error');
    }
}

/**
 * Display API Response (Fallback)
 */
function displayAPIResponse(data) {
    const responseSection = document.getElementById('responseSection');
    const responseContent = document.getElementById('responseContent');

    // Generic response display for unexpected formats
    responseContent.innerHTML = `
        <div class="api-response">
            <h4>📋 API Response</h4>
            <pre class="json-preview">${JSON.stringify(data, null, 2)}</pre>
            <p class="response-note">The API returned data in an unexpected format. This is the raw response.</p>
        </div>
    `;

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
        enhanced_prompt: `🎨 ENHANCED MAIN PROMPT:
A stunning editorial cinematic portrait featuring a subject in medium close-up framing, captured with cinema DSLR equipment using a 50mm portrait lens at f/4.0. The composition employs eye-level perspective with centered subject placement against a minimal, clean, dark-neutral background. The image conveys a grounded, intense mood with calm authority, rendered in an editorial cinematic portrait genre with neutral, low saturation color grading and premium contrast. Real skin texture and natural pores are emphasized for authentic detail. Professional studio lighting setup provides soft directional key light from a three-quarter direction with neutral-warm color temperature. Ultra-high detail and very high realism ensure exceptional quality with soft background separation through depth of field techniques.

🚫 OPTIMIZED NEGATIVE PROMPTS:
mystical clichés, chakra symbols, aura glow, smoke, oversaturation, artificial smoothing, plastic skin, harsh lighting, cluttered background, amateur photography

⚙️ TECHNICAL TAGS:
cinema DSLR, 50mm portrait lens, f/4.0 aperture, studio lighting, professional photography, editorial quality, cinematic composition, premium production value

🎭 STYLE KEYWORDS:
editorial, cinematic, portrait, professional, grounded, intense, calm authority, neutral tones, premium contrast, authentic texture, studio quality`
    };

    displayGeminiResponse(mockData.enhanced_prompt);
    showToast('Mock response displayed for testing!', 'success');
}

/**
 * Categorize Models by Type
 */
function categorizeModels(models) {
    const categories = {
        textGeneration: [],
        imageGeneration: [],
        embedding: [],
        other: []
    };
    
    models.forEach(model => {
        const name = model.name.toLowerCase();
        const displayName = (model.displayName || '').toLowerCase();
        const methods = model.supportedGenerationMethods || [];
        
        // Check for embedding models first
        if (name.includes('embedding') || displayName.includes('embedding')) {
            categories.embedding.push(model);
        }
        // Check for actual image generation models (Imagen series)
        else if (name.includes('imagen') || displayName.includes('imagen')) {
            categories.imageGeneration.push(model);
        }
        // Most Gemini models (including image-related ones) actually use text generation
        // They generate text descriptions or use generateContent endpoint
        else if (methods.includes('generateContent') || 
                 name.includes('gemini') || 
                 name.includes('nano') || 
                 name.includes('banana') || 
                 name.includes('veo') ||
                 displayName.includes('nano') || 
                 displayName.includes('banana') ||
                 displayName.includes('gemini') ||
                 displayName.includes('veo') ||
                 name.includes('image') || 
                 displayName.includes('image')) {
            categories.textGeneration.push(model);
        } 
        // Fallback for other models
        else {
            categories.other.push(model);
        }
    });
    
    // Log the categorization for debugging
    console.log('Model categorization results:');
    console.log('Text Generation models:', categories.textGeneration.map(m => m.displayName || m.name));
    console.log('Image Generation models:', categories.imageGeneration.map(m => m.displayName || m.name));
    console.log('Embedding models:', categories.embedding.map(m => m.displayName || m.name));
    console.log('Other models:', categories.other.map(m => m.displayName || m.name));
    
    return categories;
}

/**
 * Validate API Key and Check Available Models
 */
async function validateApiKey(apiKey) {
    try {
        console.log('🔑 Validating API key...');
        
        // Use the listModels endpoint to validate the API key
        const listModelsEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        
        const response = await axios.get(listModelsEndpoint, {
            timeout: 10000 // 10 second timeout
        });
        
        const models = response.data.models || [];
        console.log('✅ API key is valid!');
        console.log(`Found ${models.length} available models`);
        
        // Categorize models by type
        const categorized = categorizeModels(models);
        
        // Check for Nano Banana models specifically
        const nanoBananaModels = models.filter(model => 
            model.name.toLowerCase().includes('nano') || 
            model.name.toLowerCase().includes('banana') ||
            (model.displayName && (
                model.displayName.toLowerCase().includes('nano') || 
                model.displayName.toLowerCase().includes('banana')
            ))
        );
        
        console.log('Text Generation models:', categorized.textGeneration.length);
        console.log('Image Generation models:', categorized.imageGeneration.length);
        console.log('Embedding models:', categorized.embedding.length);
        
        if (nanoBananaModels.length > 0) {
            console.log('🍌 Nano Banana models found:', nanoBananaModels.map(m => m.displayName || m.name));
        } else {
            console.log('ℹ️ No Nano Banana models detected');
        }
        
        if (categorized.textGeneration.length === 0 && categorized.imageGeneration.length === 0) {
            throw new Error('No suitable models found. Your API key may not have access to generation models.');
        }
        
        return {
            isValid: true,
            allModels: models,
            categorizedModels: {
                ...categorized,
                allModels: models  // Add all models for the "Show All" option
            },
            totalModels: models.length
        };
        
    } catch (error) {
        console.error('❌ API key validation failed:', error);
        
        let errorMessage = 'API key validation failed. ';
        
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data?.error;
            
            if (status === 400) {
                errorMessage += 'Invalid API key format. Please check your key.';
            } else if (status === 403) {
                errorMessage += 'API key does not have permission to access models. Please check your Google AI Studio settings.';
            } else if (status === 401) {
                errorMessage += 'API key authentication failed. Please verify your key is correct.';
            } else {
                errorMessage += `Status: ${status}. ${errorData?.message || ''}`;
            }
        } else if (error.request) {
            errorMessage += 'Network error. Please check your internet connection.';
        } else {
            errorMessage += error.message;
        }
        
        return {
            isValid: false,
            error: errorMessage
        };
    }
}

/**
 * Display Gemini Response (Enhanced Prompt)
 */
function displayGeminiResponse(generatedText) {
    const responseSection = document.getElementById('responseSection');
    const responseContent = document.getElementById('responseContent');

    // Create a nice display for the enhanced prompt
    responseContent.innerHTML = `
        <div class="gemini-response">
            <h4>🎨 Enhanced Image Generation Prompt</h4>
            <div class="enhanced-prompt">
                <pre class="prompt-text">${generatedText}</pre>
            </div>
            <div class="next-steps">
                <h4>📋 Next Steps:</h4>
                <p>Copy the enhanced prompt above and use it with your preferred image generation AI:</p>
                <ul>
                    <li><strong>Midjourney:</strong> Paste in Discord with /imagine</li>
                    <li><strong>DALL-E:</strong> Use in ChatGPT or OpenAI platform</li>
                    <li><strong>Stable Diffusion:</strong> Use in ComfyUI, Automatic1111, or online tools</li>
                    <li><strong>Adobe Firefly:</strong> Use in Adobe Creative Suite</li>
                </ul>
                <button class="btn-primary copy-prompt-btn" onclick="copyEnhancedPrompt()">
                    📋 Copy Enhanced Prompt
                </button>
            </div>
        </div>
    `;

    responseSection.style.display = 'block';
    responseSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Copy Enhanced Prompt to Clipboard
 */
function copyEnhancedPrompt() {
    const promptText = document.querySelector('.prompt-text');
    if (!promptText) {
        showToast('No prompt text found to copy', 'error');
        return;
    }
    
    const textContent = promptText.textContent;
    copyToClipboard(textContent);
    showToast('Enhanced prompt copied to clipboard!', 'success');
}
