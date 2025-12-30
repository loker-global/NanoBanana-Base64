// ===================================
// Banana - AI Image Generation Platform
// Professional JavaScript Implementation
// ===================================

/**
 * Application State
 */
const state = {
    referenceImages: [],
    apiKey: null,
    selectedModel: 'gemini-1.5-flash',
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
    
    // Model selection
    elements.modelSelect.addEventListener('change', () => {
        state.selectedModel = elements.modelSelect.value;
        saveSettings();
    });
    
    // Generation buttons
    elements.generateBtn.addEventListener('click', handleGenerate);
    elements.enhancePromptBtn.addEventListener('click', handleEnhancePrompt);
    elements.clearResultsBtn.addEventListener('click', clearResults);
    
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
 * Process Single Image
 */
function processImage(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const imageData = {
            id: Date.now() + '_' + Math.random().toString(36).substring(2, 11),
            name: file.name,
            size: formatFileSize(file.size),
            base64: e.target.result,
            preview: e.target.result
        };
        
        state.referenceImages.push(imageData);
        addImageToGallery(imageData);
        updateCostEstimate();
    };
    
    reader.onerror = () => {
        showToast('Error reading file: ' + file.name, 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Add Image to Gallery
 */
function addImageToGallery(imageData) {
    const item = document.createElement('div');
    item.className = 'reference-item';
    item.dataset.id = imageData.id;
    
    item.innerHTML = `
        <img src="${imageData.preview}" alt="${imageData.name}">
        <button class="reference-item-remove" data-id="${imageData.id}">×</button>
        <div class="reference-item-info">${imageData.name}</div>
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
    const baseCost = 0.002; // per generation
    const imageCost = imageCount * 0.001; // per image
    
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
    
    showLoading('Generating your image...');
    
    try {
        // Build the prompt with all context
        const fullPrompt = buildFullPrompt();
        
        // Call Gemini API
        const result = await callGeminiAPI(fullPrompt, 'generate');
        
        hideLoading();
        
        // Display result
        displayResult(result, 'generation');
        showToast('Image generated successfully!', 'success');
        
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
    
    let prompt = `Create a ${params.stylePreset} image with the following specifications:\n\n`;
    prompt += `SUBJECT & CONTENT:\n${positive}\n\n`;
    
    if (negative) {
        prompt += `AVOID:\n${negative}\n\n`;
    }
    
    prompt += `TECHNICAL SPECIFICATIONS:\n`;
    prompt += `- Aspect Ratio: ${params.aspectRatio}\n`;
    prompt += `- Quality: ${params.quality}\n`;
    prompt += `- Output Size: ${params.outputSize}px\n`;
    prompt += `- Lighting: ${params.lighting}\n`;
    prompt += `- Mood: ${params.mood}\n`;
    prompt += `- Color Palette: ${params.colorPalette}\n`;
    prompt += `- Camera Angle: ${params.cameraAngle}\n`;
    prompt += `- Creativity Level: ${params.creativity}%\n`;
    
    if (state.referenceImages.length > 0) {
        prompt += `\nREFERENCE IMAGES: ${state.referenceImages.length} image(s) provided for style/composition reference\n`;
    }
    
    prompt += `\nGenerate a detailed, professional ${params.stylePreset} image based on these specifications.`;
    
    return prompt;
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
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${state.selectedModel}:generateContent`;
    
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
        // Add images to the request
        requestBody.contents[0].parts = [
            { text: prompt },
            ...state.referenceImages.slice(0, 3).map(img => ({
                inlineData: {
                    mimeType: getMimeType(img.base64),
                    data: img.base64.split(',')[1]
                }
            }))
        ];
    }
    
    const response = await axios.post(apiEndpoint, requestBody, {
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': state.apiKey
        },
        timeout: 60000
    });
    
    return response.data;
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
        // For generation, display the AI's response
        resultItem.innerHTML = `
            <div class="result-image-container">
                <h3>🎨 Generated Content</h3>
                <pre style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; color: white; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(generatedText)}</pre>
            </div>
            <div class="result-actions">
                <button class="result-btn copy-result-btn" data-text="${escapeForAttribute(generatedText)}">
                    📋 Copy Response
                </button>
            </div>
        `;
        
        // Add event listener
        resultItem.querySelector('.copy-result-btn').addEventListener('click', function() {
            copyText(this.dataset.text);
        });
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
 * Get Error Message
 */
function getErrorMessage(error) {
    if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data?.error;
        
        if (status === 404) {
            return 'Model not found. Please try a different model.';
        } else if (status === 403 || status === 401) {
            return 'Invalid API key. Please check your Google AI Studio API key.';
        } else if (status === 429) {
            return 'Rate limit exceeded. Please wait and try again.';
        } else {
            return `API Error: ${errorData?.message || 'Unknown error'}`;
        }
    } else if (error.request) {
        return 'Network error. Please check your internet connection.';
    } else {
        return error.message || 'An unexpected error occurred';
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
