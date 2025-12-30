// ===================================
// Banana - AI Image Generation Platform
// Professional JavaScript Implementation
// ===================================

/**
 * Configuration Constants
 */
const CONFIG = {
    MAX_REFERENCE_IMAGES: 3,  // Maximum reference images to send to API
    DEFAULT_COST_PER_GENERATION: 0.002,  // Base cost in USD
    COST_PER_IMAGE: 0.001,  // Additional cost per reference image
};
/**
 * Application State
 */
const state = {
    referenceImages: [],
    apiKey: null,
    selectedModel: 'gemini-1.5-flash-latest',  // Latest stable Gemini model
    currentJSON: null,  // Store generated Nano Banana JSON
    parameters: {
        aspectRatio: '9:16',
        stylePreset: 'photorealistic',
        quality: 'high',
        outputSize: '2048',
        lighting: 'studio',
        mood: 'professional',
        colorPalette: 'natural',
        cameraAngle: 'eye-level',
        creativity: 70,
        refStrength: 80,
        seed: null,
        variations: 1
    },
    compressionSettings: {
        enabled: true,
        quality: 0.7,  // 70% quality for compression
        maxWidth: 1024,  // Max dimensions for reference images
        maxHeight: 1024,
        convertPngToJpeg: true,  // Always convert PNG to JPEG for better compression
        targetMaxSize: 100000  // Target max size in bytes (100KB) - spirit of the project!
    },
    generationHistory: []
};

/**
 * DOM Elements
 */
const elements = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    referenceGallery: document.getElementById('referenceGallery'),
    positivePrompt: document.getElementById('positivePrompt'),
    negativePrompt: document.getElementById('negativePrompt'),
    apiKey: document.getElementById('apiKey'),
    modelSelect: document.getElementById('modelSelect'),
    generateBtn: document.getElementById('generateBtn'),
    enhancePromptBtn: document.getElementById('enhancePromptBtn'),
    resultsCard: document.getElementById('resultsCard'),
    resultsContent: document.getElementById('resultsContent'),
    clearResultsBtn: document.getElementById('clearResultsBtn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    costEstimate: document.getElementById('costEstimate')
};

/**
 * Initialize Application
 */
function init() {
    setupEventListeners();
    setupParameterListeners();
    setupKeyboardShortcuts();
    loadSavedSettings();
    console.log('🍌 Banana AI Platform initialized!');
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // File upload
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);
    
    // Prevent default drag/drop on page
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
    
    // Parameter tabs
    document.querySelectorAll('.param-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab));
    });
    
    // API Key
    elements.apiKey.addEventListener('change', () => {
        state.apiKey = elements.apiKey.value.trim();
        saveSettings();
    });
    
    // Add API key validation button functionality
    const validateKeyBtn = document.getElementById('validateKeyBtn');
    if (validateKeyBtn) {
        validateKeyBtn.addEventListener('click', async () => {
            const apiKey = state.apiKey;
            if (!apiKey) {
                showToast('Please enter an API key first', 'error');
                return;
            }
            
            validateKeyBtn.disabled = true;
            validateKeyBtn.textContent = 'Validating...';
            showLoading('Validating API key...');
            
            try {
                const validation = await validateApiKey(apiKey);
                hideLoading();
                
                if (validation.isValid) {
                    showToast(`✅ API key validated! Found ${validation.totalModels} models`, 'success');
                    populateModelSelect(validation.categorizedModels);
                } else {
                    showToast(validation.error, 'error');
                }
            } catch (error) {
                hideLoading();
                showToast('Failed to validate API key', 'error');
            }
            
            validateKeyBtn.disabled = false;
            validateKeyBtn.textContent = 'Validate Key';
        });
    }
    
    // Model selection
    elements.modelSelect.addEventListener('change', () => {
        state.selectedModel = elements.modelSelect.value;
        saveSettings();
    });
    
    // Generation buttons
    elements.generateBtn.addEventListener('click', handleGenerate);
    elements.enhancePromptBtn.addEventListener('click', handleEnhancePrompt);
    elements.clearResultsBtn.addEventListener('click', clearResults);
    
    // Nano Banana buttons
    const generateJsonBtn = document.getElementById('generateJsonBtn');
    const sendToApiBtn = document.getElementById('sendToApiBtn');
    
    if (generateJsonBtn) {
        generateJsonBtn.addEventListener('click', handleGenerateJSON);
    }
    
    if (sendToApiBtn) {
        sendToApiBtn.addEventListener('click', handleSendToAPI);
    }
    
    // Sliders with live updates
    const creativitySlider = document.getElementById('creativity');
    const refStrengthSlider = document.getElementById('refStrength');
    
    if (creativitySlider) {
        creativitySlider.addEventListener('input', (e) => {
            document.getElementById('creativityValue').textContent = e.target.value + '%';
            state.parameters.creativity = parseInt(e.target.value);
        });
    }
    
    if (refStrengthSlider) {
        refStrengthSlider.addEventListener('input', (e) => {
            document.getElementById('refStrengthValue').textContent = e.target.value + '%';
            state.parameters.refStrength = parseInt(e.target.value);
        });
    }
}

/**
 * Setup Parameter Listeners
 */
function setupParameterListeners() {
    const paramElements = [
        'aspectRatio', 'stylePreset', 'quality', 'outputSize',
        'lighting', 'mood', 'colorPalette', 'cameraAngle',
        'seed', 'variations'
    ];
    
    paramElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', (e) => {
                state.parameters[id] = e.target.value;
                updateCostEstimate();
            });
        }
    });
}

/**
 * Handle File Select
 */
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

/**
 * Handle Drag Over
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    elements.dropZone.classList.add('drag-over');
}

/**
 * Handle Drag Leave
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    elements.dropZone.classList.remove('drag-over');
}

/**
 * Handle Drop
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
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('Please select valid image files', 'error');
        return;
    }
    
    showLoading('Processing images...');
    
    imageFiles.forEach((file, index) => {
        setTimeout(() => {
            processImage(file);
            if (index === imageFiles.length - 1) {
                hideLoading();
                showToast(`${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} uploaded successfully!`);
            }
        }, index * 100);
    });
}

/**
 * Process Single Image - WITH COMPRESSION (spirit of NanoBanana!)
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
        // Compress images following the NanoBanana spirit!
        if (state.compressionSettings.enabled) {
            try {
                const compressedData = await compressImage(e.target.result, file.type);
                const originalSize = file.size;
                const compressedSize = Math.round((compressedData.length * 3) / 4); // Approximate Base64 to bytes
                
                // Show warning if still too large
                if (compressedSize > state.compressionSettings.targetMaxSize) {
                    showToast(`Info: ${file.name} compressed to ${formatFileSize(compressedSize)} (target: ${formatFileSize(state.compressionSettings.targetMaxSize)})`, 'warning');
                }
                
                const imageData = {
                    id: Date.now() + '_' + Math.random().toString(36).substring(2, 11),
                    name: file.name,
                    size: formatFileSize(compressedSize),
                    originalSize: formatFileSize(originalSize),
                    compressionRatio: ((1 - compressedSize / originalSize) * 100).toFixed(1),
                    base64: compressedData,
                    preview: compressedData
                };
                
                state.referenceImages.push(imageData);
                addImageToGallery(imageData);
                updateCostEstimate();
                
                console.log(`🍌 Compressed ${file.name}: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (-${imageData.compressionRatio}%)`);
            } catch (error) {
                console.error('Compression failed:', error);
                showToast(`Compression failed for: ${file.name}. Please try a smaller image.`, 'error');
            }
        } else {
            // No compression - warn about large files
            if (file.size > state.compressionSettings.targetMaxSize) {
                showToast(`Warning: ${file.name} is ${formatFileSize(file.size)}. Compression disabled - may cause high costs!`, 'warning');
            }
            
            const imageData = {
                id: Date.now() + '_' + Math.random().toString(36).substring(2, 11),
                name: file.name,
                size: formatFileSize(file.size),
                originalSize: formatFileSize(file.size),
                compressionRatio: '0',
                base64: e.target.result,
                preview: e.target.result
            };
            
            state.referenceImages.push(imageData);
            addImageToGallery(imageData);
            updateCostEstimate();
        }
    };
    
    reader.onerror = () => {
        showToast('Error reading file: ' + file.name, 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Compress Image using Canvas - THE SPIRIT OF NANOBANANA!
 * Aggressive compression to stay under 100KB per image
 */
async function compressImage(dataURL, mimeType) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Start with aggressive dimensions to ensure smaller file size
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
                
                // Always use JPEG for better compression (NanoBanana spirit!)
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
 * Add Image to Gallery - Show compression savings!
 */
function addImageToGallery(imageData) {
    const item = document.createElement('div');
    item.className = 'reference-item';
    item.dataset.id = imageData.id;
    
    // Show compression badge if compressed (spirit of NanoBanana!)
    const compressionBadge = imageData.compressionRatio && imageData.compressionRatio > 0 
        ? `<div class="compression-badge">-${imageData.compressionRatio}%</div>` 
        : '';
    
    const sizeInfo = imageData.compressionRatio && imageData.compressionRatio > 0
        ? `${imageData.size} (was ${imageData.originalSize})`
        : `${imageData.size}`;
    
    item.innerHTML = `
        <img src="${imageData.preview}" alt="${imageData.name}">
        ${compressionBadge}
        <button class="reference-item-remove" data-id="${imageData.id}">×</button>
        <div class="reference-item-info" title="${imageData.name} - ${sizeInfo}">${imageData.name}</div>
    `;
    
    // Remove button handler
    item.querySelector('.reference-item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeImage(imageData.id);
    });
    
    elements.referenceGallery.appendChild(item);
}

/**
 * Remove Image
 */
function removeImage(id) {
    state.referenceImages = state.referenceImages.filter(img => img.id !== id);
    const item = document.querySelector(`.reference-item[data-id="${id}"]`);
    if (item) {
        // Apply scaleOut animation (duration matches CSS animation timing)
        item.style.animation = 'scaleOut 0.3s ease';
        setTimeout(() => item.remove(), 300);
    }
    updateCostEstimate();
    showToast('Image removed');
}

/**
 * Switch Tab
 */
function switchTab(tab) {
    document.querySelectorAll('.param-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.params-content').forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    const tabName = tab.dataset.tab;
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

/**
 * Update Cost Estimate
 */
function updateCostEstimate() {
    const imageCount = state.referenceImages.length;
    const variations = parseInt(state.parameters.variations) || 1;
    
    // Cost estimation based on:
    // - Base cost per generation
    // - Additional cost per reference image
    // - Cost scales with number of variations
    const baseCost = CONFIG.DEFAULT_COST_PER_GENERATION;
    const imageCost = imageCount * CONFIG.COST_PER_IMAGE;
    
    const totalCost = (baseCost + imageCost) * variations;
    
    elements.costEstimate.textContent = totalCost < 0.01 
        ? '< $0.01' 
        : `~$${totalCost.toFixed(3)}`;
}

/**
 * Handle Generate
 */
async function handleGenerate() {
    // Validation
    if (!state.apiKey) {
        showToast('Please enter your API key', 'error');
        elements.apiKey.focus();
        return;
    }
    
    const positivePrompt = elements.positivePrompt.value.trim();
    if (!positivePrompt) {
        showToast('Please enter a prompt describing what you want', 'error');
        elements.positivePrompt.focus();
        return;
    }
    
    showLoading(state.referenceImages.length > 0 ? 'Analyzing your images with AI...' : 'Enhancing your prompt with AI...');
    
    try {
        // Build the prompt with all context
        const fullPrompt = buildFullPrompt();
        
        // Call Gemini API
        const result = await callGeminiAPI(fullPrompt, 'generate');
        
        hideLoading();
        
        // Display result
        displayResult(result, 'generation');
        const successMsg = state.referenceImages.length > 0 ? 'Images analyzed successfully!' : 'Prompt enhanced successfully!';
        showToast(successMsg, 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Generation error:', error);
        showToast(getErrorMessage(error), 'error');
    }
}

/**
 * Handle Enhance Prompt
 */
async function handleEnhancePrompt() {
    if (!state.apiKey) {
        showToast('Please enter your API key', 'error');
        elements.apiKey.focus();
        return;
    }
    
    const positivePrompt = elements.positivePrompt.value.trim();
    if (!positivePrompt) {
        showToast('Please enter a prompt to enhance', 'error');
        elements.positivePrompt.focus();
        return;
    }
    
    showLoading('Enhancing your prompt with AI...');
    
    try {
        const enhancementPrompt = buildEnhancementPrompt();
        const result = await callGeminiAPI(enhancementPrompt, 'enhance');
        
        hideLoading();
        
        // Display enhanced prompt
        displayResult(result, 'enhancement');
        showToast('Prompt enhanced successfully!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Enhancement error:', error);
        showToast(getErrorMessage(error), 'error');
    }
}

/**
 * Build Full Prompt
 */
function buildFullPrompt() {
    const params = state.parameters;
    const positive = elements.positivePrompt.value.trim();
    const negative = elements.negativePrompt.value.trim();
    
    // If there are reference images, analyze them
    if (state.referenceImages.length > 0) {
        let prompt = `Please analyze the provided image(s) and create a detailed, professional description that could be used for image generation. `;
        
        if (positive) {
            prompt += `The user wants: "${positive}". `;
        }
        
        prompt += `Based on the reference image(s), provide:\n\n`;
        prompt += `1. DETAILED VISUAL DESCRIPTION: Describe what you see in rich, specific detail\n`;
        prompt += `2. STYLE ANALYSIS: Identify the artistic style, lighting, composition, and mood\n`;
        prompt += `3. ENHANCED PROMPT: Create an optimized prompt for AI image generation based on this analysis\n`;
        prompt += `4. TECHNICAL DETAILS: Note aspect ratio, color palette, camera angle, etc.\n\n`;
        
        if (negative) {
            prompt += `AVOID: ${negative}\n\n`;
        }
        
        prompt += `Format your response clearly with headings for each section. Make it detailed and professional for image generation purposes.`;
        
        return prompt;
    } else {
        // Text-only generation for prompt enhancement
        let prompt = `You are a professional AI image generation expert. Help enhance and optimize the following prompt:\n\n`;
        prompt += `USER'S IDEA: "${positive}"\n\n`;
        
        if (negative) {
            prompt += `THINGS TO AVOID: ${negative}\n\n`;
        }
        
        prompt += `DESIRED STYLE: ${params.stylePreset}\n`;
        prompt += `ASPECT RATIO: ${params.aspectRatio}\n`;
        prompt += `QUALITY: ${params.quality}\n`;
        prompt += `LIGHTING: ${params.lighting}\n`;
        prompt += `MOOD: ${params.mood}\n`;
        prompt += `COLOR PALETTE: ${params.colorPalette}\n`;
        prompt += `CAMERA ANGLE: ${params.cameraAngle}\n\n`;
        
        prompt += `Please provide:\n`;
        prompt += `1. ENHANCED DESCRIPTION: A detailed, vivid description (150-200 words)\n`;
        prompt += `2. TECHNICAL KEYWORDS: Specific terms to improve image quality\n`;
        prompt += `3. STYLE KEYWORDS: Artistic direction and aesthetic terms\n`;
        prompt += `4. OPTIMIZED PROMPT: A final, polished prompt ready for image generation\n\n`;
        
        prompt += `Make it professional, specific, and optimized for AI image generation tools.`;
        
        return prompt;
    }
}

/**
 * Build Enhancement Prompt
 */
function buildEnhancementPrompt() {
    const params = state.parameters;
    const positive = elements.positivePrompt.value.trim();
    const negative = elements.negativePrompt.value.trim();
    
    let prompt = `You are a professional AI image generation prompt engineer. Please enhance and optimize the following prompt for creating a ${params.stylePreset} image:\n\n`;
    prompt += `ORIGINAL PROMPT:\n${positive}\n\n`;
    
    if (negative) {
        prompt += `AVOID (Negative Prompts):\n${negative}\n\n`;
    }
    
    prompt += `DESIRED PARAMETERS:\n`;
    prompt += `- Style: ${params.stylePreset}\n`;
    prompt += `- Aspect Ratio: ${params.aspectRatio}\n`;
    prompt += `- Lighting: ${params.lighting}\n`;
    prompt += `- Mood: ${params.mood}\n`;
    prompt += `- Color Palette: ${params.colorPalette}\n`;
    prompt += `- Camera Angle: ${params.cameraAngle}\n\n`;
    
    prompt += `Please provide:\n`;
    prompt += `1. AN ENHANCED MAIN PROMPT (150-200 words) that is detailed, specific, and optimized for image generation AI\n`;
    prompt += `2. OPTIMIZED NEGATIVE PROMPTS (comma-separated list)\n`;
    prompt += `3. TECHNICAL KEYWORDS to improve quality\n`;
    prompt += `4. STYLE KEYWORDS for artistic direction\n\n`;
    
    prompt += `Format your response with clear sections. Make the language vivid, specific, and technical.`;
    
    return prompt;
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(prompt, type) {
    // Clean the model name - remove any 'models/' prefix if present
    const cleanModelName = state.selectedModel.replace('models/', '');
    console.log('🔍 Using model:', cleanModelName);
    console.log('🔍 Original model name:', state.selectedModel);
    
    // Use URL parameter for API key instead of header to avoid CORS issues
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${state.apiKey}`;
    console.log('🔍 API Endpoint:', apiEndpoint.replace(state.apiKey, '[API_KEY_HIDDEN]'));
    
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: type === 'enhance' ? 0.7 : 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: type === 'enhance' ? 2048 : 1024,
        }
    };
    
    // Add reference images if available and not just enhancing
    if (type === 'generate' && state.referenceImages.length > 0) {
        // Add images to the request (limit to MAX_REFERENCE_IMAGES)
        requestBody.contents[0].parts = [
            { text: prompt },
            ...state.referenceImages.slice(0, CONFIG.MAX_REFERENCE_IMAGES).map(img => ({
                inlineData: {
                    mimeType: getMimeType(img.base64),
                    data: img.base64.split(',')[1]
                }
            }))
        ];
    }
    
    try {
        const response = await axios.post(apiEndpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        
        console.log('✅ API call successful');
        return response.data;
        
    } catch (error) {
        console.error('❌ API call failed:', error);
        
        // If it's a CORS error, provide helpful information
        if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
            console.warn('🔄 Detected potential CORS issue. This might be due to browser security policies.');
            console.log('💡 Possible solutions:');
            console.log('1. Use a local server (not file:// protocol)');
            console.log('2. Use a CORS proxy');
            console.log('3. Use the official Google AI SDK');
        }
        
        throw error;
    }
}

/**
 * Get MIME Type from base64
 */
function getMimeType(base64String) {
    if (base64String.startsWith('data:image/')) {
        const match = base64String.match(/data:([^;]+)/);
        return match ? match[1] : 'image/jpeg';
    }
    return 'image/jpeg';
}

/**
 * Display Result
 */
function displayResult(result, type) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No content generated';
    
    if (type === 'enhancement') {
        resultItem.innerHTML = `
            <div class="enhanced-prompt-display">
                <h3>✨ Enhanced Prompt</h3>
                <pre>${escapeHtml(generatedText)}</pre>
                <div class="result-actions">
                    <button class="result-btn copy-enhanced-btn" data-text="${escapeForAttribute(generatedText)}">
                        📋 Copy Enhanced Prompt
                    </button>
                    <button class="result-btn apply-enhanced-btn" data-text="${escapeForAttribute(generatedText)}">
                        ✅ Apply to Prompt Field
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        resultItem.querySelector('.copy-enhanced-btn').addEventListener('click', function() {
            copyText(this.dataset.text);
        });
        resultItem.querySelector('.apply-enhanced-btn').addEventListener('click', function() {
            applyEnhancedPrompt(this.dataset.text);
        });
    } else {
        // For generation, display the AI's analysis/enhancement
        const title = state.referenceImages.length > 0 ? '🔍 AI Image Analysis' : '✨ AI Prompt Enhancement';
        resultItem.innerHTML = `
            <div class="result-content-container">
                <h3>${title}</h3>
                <div class="ai-response">
                    <pre style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; color: white; white-space: pre-wrap; word-wrap: break-word; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6;">${escapeHtml(generatedText)}</pre>
                </div>
            </div>
            <div class="result-actions">
                <button class="result-btn copy-result-btn" data-text="${escapeForAttribute(generatedText)}">
                    📋 Copy Analysis
                </button>
                ${state.referenceImages.length === 0 ? `
                <button class="result-btn apply-enhanced-btn" data-text="${escapeForAttribute(generatedText)}">
                    ✅ Extract Optimized Prompt
                </button>
                ` : ''}
            </div>
        `;
        
        // Add event listeners
        resultItem.querySelector('.copy-result-btn').addEventListener('click', function() {
            copyText(this.dataset.text);
        });
        
        const applyBtn = resultItem.querySelector('.apply-enhanced-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                applyEnhancedPrompt(this.dataset.text);
            });
        }
    }
    
    elements.resultsContent.insertBefore(resultItem, elements.resultsContent.firstChild);
    elements.resultsCard.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * Copy Text to Clipboard
 */
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy', 'error');
    }
}

/**
 * Apply Enhanced Prompt
 */
function applyEnhancedPrompt(enhancedText) {
    // Try to extract the main prompt from the enhanced text
    const lines = enhancedText.split('\n');
    let mainPrompt = '';
    let negativePrompts = '';
    
    let inMainSection = false;
    let inNegativeSection = false;
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('enhanced') || lowerLine.includes('main prompt')) {
            inMainSection = true;
            inNegativeSection = false;
            continue;
        }
        
        if (lowerLine.includes('negative') || lowerLine.includes('avoid')) {
            inNegativeSection = true;
            inMainSection = false;
            continue;
        }
        
        if (lowerLine.includes('technical') || lowerLine.includes('style keyword')) {
            inMainSection = false;
            inNegativeSection = false;
            continue;
        }
        
        if (inMainSection && line.trim()) {
            mainPrompt += line.trim() + ' ';
        }
        
        if (inNegativeSection && line.trim()) {
            negativePrompts += line.trim() + ' ';
        }
    }
    
    // If we couldn't parse it, just use the whole thing
    if (!mainPrompt) {
        mainPrompt = enhancedText;
    }
    
    elements.positivePrompt.value = mainPrompt.trim();
    if (negativePrompts) {
        elements.negativePrompt.value = negativePrompts.trim();
    }
    
    showToast('Enhanced prompt applied!');
}

/**
 * Clear Results
 */
function clearResults() {
    elements.resultsContent.innerHTML = '';
    elements.resultsCard.style.display = 'none';
    showToast('Results cleared');
}

/**
 * Show Toast
 */
function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    
    const icon = elements.toast.querySelector('.toast-icon');
    elements.toast.className = 'toast';
    
    if (type === 'success') {
        icon.textContent = '✅';
    } else if (type === 'error') {
        icon.textContent = '❌';
        elements.toast.classList.add('error');
    } else if (type === 'warning') {
        icon.textContent = '⚠️';
        elements.toast.classList.add('warning');
    }
    
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, type === 'error' ? 5000 : 3000);
}

/**
 * Show Loading
 */
function showLoading(text = 'Processing...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.add('show');
}

/**
 * Hide Loading
 */
function hideLoading() {
    elements.loadingOverlay.classList.remove('show');
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
 * Validate API Key
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
        
        console.log('Text Generation models:', categorized.textGeneration.length);
        console.log('Image Generation models:', categorized.imageGeneration.length);
        console.log('Embedding models:', categorized.embedding.length);
        
        if (categorized.textGeneration.length === 0 && categorized.imageGeneration.length === 0) {
            throw new Error('No suitable models found. Your API key may not have access to generation models.');
        }
        
        return {
            isValid: true,
            allModels: models,
            categorizedModels: {
                ...categorized,
                allModels: models
            },
            totalModels: models.length
        };
        
    } catch (error) {
        console.error('❌ API key validation failed:', error);
        
        let errorMessage = 'API key validation failed. ';
        
        if (error.response) {
            const status = error.response.status;
            
            if (status === 400) {
                errorMessage += 'Invalid API key format. Please check your key.';
            } else if (status === 403) {
                errorMessage += 'API key does not have permission to access models. Please check your Google AI Studio settings.';
            } else if (status === 401) {
                errorMessage += 'API key authentication failed. Please verify your key is correct.';
            } else {
                errorMessage += `Server error (${status}). Please try again later.`;
            }
        } else if (error.code === 'ENOTFOUND' || error.message.includes('Network Error')) {
            errorMessage += 'Network connection failed. Please check your internet connection.';
        } else if (error.code === 'TIMEOUT') {
            errorMessage += 'Request timed out. Please try again.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }
        
        return {
            isValid: false,
            error: errorMessage
        };
    }
}

/**
 * Categorize Models by Type
 */
function categorizeModels(models) {
    const textGeneration = [];
    const imageGeneration = [];
    const embedding = [];
    
    models.forEach(model => {
        const name = (model.name || '').toLowerCase();
        const displayName = (model.displayName || '').toLowerCase();
        const description = (model.description || '').toLowerCase();
        
        const combinedInfo = `${name} ${displayName} ${description}`;
        
        if (combinedInfo.includes('embedding')) {
            embedding.push(model);
        } else if (combinedInfo.includes('imagen') || combinedInfo.includes('image') && combinedInfo.includes('generat')) {
            imageGeneration.push(model);
        } else if (combinedInfo.includes('gemini') || combinedInfo.includes('chat') || combinedInfo.includes('text') || combinedInfo.includes('generat')) {
            textGeneration.push(model);
        } else {
            // Default to text generation if uncertain
            textGeneration.push(model);
        }
    });
    
    return {
        textGeneration,
        imageGeneration,
        embedding
    };
}

/**
 * Get Error Message
 */
function getErrorMessage(error) {
    console.error('Full error details:', error);
    
    if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data?.error;
        
        if (status === 400) {
            if (errorData?.message?.includes('API key')) {
                return 'Invalid API key. Please check your Gemini API key.';
            }
            return 'Bad request. Please check your input and try again.';
        } else if (status === 403) {
            return 'Access forbidden. Your API key may not have the required permissions.';
        } else if (status === 429) {
            return 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (status === 500) {
            return 'Server error. Please try again in a moment.';
        } else {
            return `API error (${status}). Please try again.`;
        }
    } else if (error.code === 'ENOTFOUND' || error.message?.includes('Network Error')) {
        if (error.message?.includes('CORS') || error.config?.url?.includes('generativelanguage.googleapis.com')) {
            return 'CORS error detected. Try refreshing the page or using a different browser. This is a known issue with direct API calls.';
        }
        return 'Network connection failed. Please check your internet connection.';
    } else if (error.code === 'TIMEOUT') {
        return 'Request timed out. Please try again.';
    } else {
        return error.message || 'An unexpected error occurred.';
    }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape for Attribute
 */
function escapeForAttribute(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

/**
 * Save Settings
 */
function saveSettings() {
    try {
        localStorage.setItem('banana_model', state.selectedModel);
        // Note: We don't save API key for security
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

/**
 * Load Saved Settings
 */
function loadSavedSettings() {
    try {
        const savedModel = localStorage.getItem('banana_model');
        if (savedModel) {
            state.selectedModel = savedModel;
            elements.modelSelect.value = savedModel;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

/**
 * Setup Keyboard Shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to generate
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleGenerate();
        }
        
        // Ctrl/Cmd + E to enhance prompt
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            handleEnhancePrompt();
        }
        
        // Ctrl/Cmd + O to open file picker
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            elements.fileInput.click();
        }
    });
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/**
 * Populate Model Select Dropdown
 */
function populateModelSelect(categorizedModels) {
    const select = elements.modelSelect;
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a model...';
    defaultOption.disabled = true;
    select.appendChild(defaultOption);
    
    // Add Text Generation models
    if (categorizedModels.textGeneration.length > 0) {
        const textGroup = document.createElement('optgroup');
        textGroup.label = `Text Generation (${categorizedModels.textGeneration.length})`;
        
        categorizedModels.textGeneration.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.displayName || model.name.split('/').pop();
            textGroup.appendChild(option);
        });
        
        select.appendChild(textGroup);
    }
    
    // Add Image Generation models (if any)
    if (categorizedModels.imageGeneration.length > 0) {
        const imageGroup = document.createElement('optgroup');
        imageGroup.label = `Image Generation (${categorizedModels.imageGeneration.length})`;
        
        categorizedModels.imageGeneration.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.displayName || model.name.split('/').pop();
            imageGroup.appendChild(option);
        });
        
        select.appendChild(imageGroup);
    }
    
    // Set the first available model as default
    if (categorizedModels.textGeneration.length > 0) {
        const firstModel = categorizedModels.textGeneration[0];
        select.value = firstModel.name;
        state.selectedModel = firstModel.name;
    } else if (categorizedModels.imageGeneration.length > 0) {
        const firstModel = categorizedModels.imageGeneration[0];
        select.value = firstModel.name;
        state.selectedModel = firstModel.name;
    }
}

/**
 * Generate Nano Banana JSON Payload
 */
function generateNanoBananaJSON() {
    const params = state.parameters;
    const positive = elements.positivePrompt.value.trim();
    const negative = elements.negativePrompt.value.trim().split(',').map(s => s.trim()).filter(s => s);
    
    // Build reference images array with Base64 data
    const referenceImages = state.referenceImages.map((img, index) => ({
        id: `ref_${index + 1}`,
        type: "style_reference",
        image_base64: img.base64,
        weight: 0.8
    }));
    
    // Build the complete Nano Banana JSON structure
    const json = {
        model: "nano-banana-pro-preview",
        consistency_id: `generation_${Date.now()}`,
        prompt: {
            text: positive,
            language: "en",
            negative: negative
        },
        reference_images: referenceImages,
        composition: {
            framing: "medium_shot",
            perspective: params.cameraAngle || "eye-level",
            subject_placement: "center",
            background: "contextual",
            rule_of_thirds: true
        },
        style_parameters: {
            genre: params.stylePreset,
            mood: params.mood,
            color_grading: params.colorPalette,
            texture: "smooth"
        },
        technical_specifications: {
            camera: {
                look: "professional",
                focal_length: "85mm",
                aperture: "f/1.8",
                depth_of_field: "soft background separation"
            },
            lighting: {
                type: params.lighting,
                setup: "soft directional key light",
                direction: "three-quarter",
                color_temperature: "neutral-warm"
            },
            quality: {
                detail: "ultra-high",
                realism: "very high"
            }
        },
        output_settings: {
            aspect_ratio: params.aspectRatio,
            resolution: {
                width: parseInt(params.outputSize),
                height: parseInt(params.outputSize)
            },
            format: "png",
            deliverables: ["generated_image"]
        }
    };
    
    return json;
}

/**
 * Handle Generate JSON Button
 */
async function handleGenerateJSON() {
    try {
        const json = generateNanoBananaJSON();
        state.currentJSON = json;
        
        // Display the JSON in the results
        displayNanoBananaJSON(json);
        
        // Show the send to API button
        document.getElementById('sendToApiBtn').style.display = 'inline-block';
        
        showToast('🍌 Nano Banana JSON generated successfully!', 'success');
        
    } catch (error) {
        console.error('JSON generation error:', error);
        showToast('Failed to generate JSON', 'error');
    }
}

/**
 * Display Nano Banana JSON
 */
function displayNanoBananaJSON(json) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    resultItem.innerHTML = `
        <div class="json-result-container">
            <h3>🍌 Nano Banana JSON Payload</h3>
            <div class="json-stats">
                <span class="json-stat">📊 Model: ${json.model}</span>
                <span class="json-stat">🖼️ References: ${json.reference_images.length}</span>
                <span class="json-stat">📐 Ratio: ${json.output_settings.aspect_ratio}</span>
                <span class="json-stat">🎨 Style: ${json.style_parameters.genre}</span>
            </div>
            <div class="json-display">
                <pre style="background: rgba(0,0,0,0.4); padding: 20px; border-radius: 12px; color: #FFD700; white-space: pre-wrap; word-wrap: break-word; font-family: 'Fira Code', 'Monaco', monospace; font-size: 13px; line-height: 1.4; max-height: 400px; overflow-y: auto;">${JSON.stringify(json, null, 2)}</pre>
            </div>
        </div>
        <div class="result-actions">
            <button class="result-btn copy-json-btn" data-json='${JSON.stringify(json)}'>
                📋 Copy JSON
            </button>
            <button class="result-btn download-json-btn" data-json='${JSON.stringify(json)}'>
                💾 Download JSON
            </button>
        </div>
    `;
    
    // Add event listeners
    resultItem.querySelector('.copy-json-btn').addEventListener('click', function() {
        copyText(this.dataset.json);
        showToast('JSON copied to clipboard!', 'success');
    });
    
    resultItem.querySelector('.download-json-btn').addEventListener('click', function() {
        downloadJSON(JSON.parse(this.dataset.json));
    });
    
    elements.resultsContent.insertBefore(resultItem, elements.resultsContent.firstChild);
    elements.resultsCard.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * Download JSON file
 */
function downloadJSON(json) {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nano-banana-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSON file downloaded!', 'success');
}

/**
 * Send to Nano Banana API
 */
async function handleSendToAPI() {
    if (!state.currentJSON) {
        showToast('Please generate JSON first', 'error');
        return;
    }
    
    if (!state.apiKey) {
        showToast('Please enter your API key first', 'error');
        return;
    }
    
    showLoading('🍌 Sending to Nano Banana API...');
    
    try {
        // Use the Nano Banana endpoint
        const nanoBananaEndpoint = 'https://api.nanobanana.ai/v1/generate';
        
        const response = await axios.post(nanoBananaEndpoint, state.currentJSON, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`,
                'X-API-Key': state.apiKey
            },
            timeout: 120000 // 2 minute timeout for image generation
        });
        
        hideLoading();
        
        console.log('🍌 Nano Banana API response:', response.data);
        displayAPIResult(response.data);
        showToast('🚀 Image generated successfully!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Nano Banana API error:', error);
        
        if (error.response && error.response.status === 401) {
            showToast('Invalid API key for Nano Banana API', 'error');
        } else if (error.response && error.response.status === 429) {
            showToast('Rate limit exceeded. Please wait and try again.', 'error');
        } else {
            showToast('Failed to generate image. Check console for details.', 'error');
        }
    }
}

/**
 * Display API Result
 */
function displayAPIResult(result) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item api-result';
    
    // Check if result contains an image URL or base64
    let imageDisplay = '';
    if (result.image_url) {
        imageDisplay = `<img src="${result.image_url}" alt="Generated Image" style="max-width: 100%; border-radius: 12px; margin: 10px 0;">`;
    } else if (result.image_base64) {
        imageDisplay = `<img src="data:image/png;base64,${result.image_base64}" alt="Generated Image" style="max-width: 100%; border-radius: 12px; margin: 10px 0;">`;
    }
    
    resultItem.innerHTML = `
        <div class="api-result-container">
            <h3>🚀 Nano Banana Generated Image</h3>
            ${imageDisplay}
            <div class="api-result-info">
                <pre style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; color: white; font-size: 12px; max-height: 200px; overflow-y: auto;">${JSON.stringify(result, null, 2)}</pre>
            </div>
        </div>
        <div class="result-actions">
            <button class="result-btn copy-result-btn" data-result='${JSON.stringify(result)}'>
                📋 Copy Result
            </button>
            ${result.image_url ? `<button class="result-btn download-image-btn" data-url="${result.image_url}">💾 Download Image</button>` : ''}
        </div>
    `;
    
    // Add event listeners
    resultItem.querySelector('.copy-result-btn').addEventListener('click', function() {
        copyText(this.dataset.result);
    });
    
    const downloadBtn = resultItem.querySelector('.download-image-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            window.open(this.dataset.url, '_blank');
        });
    }
    
    elements.resultsContent.insertBefore(resultItem, elements.resultsContent.firstChild);
    elements.resultsCard.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}
