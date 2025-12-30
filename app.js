// ===================================
// NanoBanana-Base64 - Main Application
// ===================================

/**
 * Application State
 */
const state = {
    images: [],
    currentImageCount: 0
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
    loadingOverlay: document.getElementById('loadingOverlay')
};

/**
 * Initialize Application
 */
function init() {
    setupEventListeners();
    console.log('🍌 NanoBanana-Base64 initialized!');
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
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const imageData = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: formatFileSize(file.size),
            base64: e.target.result,
            preview: e.target.result
        };
        
        state.images.push(imageData);
        addImageToGallery(imageData);
        updateEmptyState();
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
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.dataset.id = imageData.id;
    
    galleryItem.innerHTML = `
        <img src="${imageData.preview}" alt="${imageData.name}">
        <div class="gallery-item-overlay">
            <div class="gallery-item-text">
                <span class="icon">📋</span>
                <p>Click to Copy Base64</p>
            </div>
        </div>
        <div class="gallery-item-info">
            <div class="gallery-item-name" title="${imageData.name}">${imageData.name}</div>
            <div class="gallery-item-size">${imageData.size}</div>
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
    }
    
    elements.toast.classList.add('show');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
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
