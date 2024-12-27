const API_KEY = 'AIzaSyACE-0Rptd3iNetYGrMKj-AkRf4Shut0jU';
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const analyzeBtn = document.getElementById('analyzeBtn');
const pasteBtn = document.getElementById('pasteBtn');
const plantName = document.getElementById('plantName');
const healthStatus = document.getElementById('healthStatus');
const disease = document.getElementById('disease');
const previewPlaceholder = document.querySelector('.preview-placeholder');

let currentImageBlob = null;

// Handle image upload and preview
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        currentImageBlob = file;
        displayImage(file);
    }
});

// Handle paste functionality
pasteBtn.addEventListener('click', () => {
    navigator.clipboard.read().then(items => {
        for (const item of items) {
            if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                item.getType('image/png').then(blob => {
                    currentImageBlob = blob;
                    displayImage(blob);
                });
                break;
            }
        }
    }).catch(err => {
        showToast('Please copy an image first!');
        console.error('Error reading clipboard:', err);
    });
});

// Handle paste from clipboard directly
document.addEventListener('paste', (e) => {
    e.preventDefault();
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            currentImageBlob = blob;
            displayImage(blob);
            break;
        }
    }
});

// Display image function
function displayImage(blob) {
    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        analyzeBtn.disabled = false;
        
        // Add loading animation
        imagePreview.style.opacity = '0';
        setTimeout(() => {
            imagePreview.style.opacity = '1';
        }, 100);
    };
    reader.readAsDataURL(blob);
}

// Function to convert image to base64
function getBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

// Show toast message
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }, 100);
}

// Clean text function to remove special characters
function cleanText(text) {
    return text.replace(/[*_]/g, '').trim();
}

// Update result item
function updateResultItem(element, text, type = '') {
    const resultText = element.querySelector('.result-text');
    resultText.textContent = text;
    
    if (type) {
        element.className = `result-item health-status ${type}`;
    }
}

// Handle plant analysis
analyzeBtn.addEventListener('click', async () => {
    try {
        if (!currentImageBlob) {
            showToast('Please select or paste an image first!');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

        const base64Image = await getBase64(currentImageBlob);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Analyze this plant image. Tell me: 1. What plant is this? 2. Is the plant healthy or diseased? 3. If diseased, what disease might it have?"
                    }, {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            const result = data.candidates[0].content.parts[0].text;
            
            // Parse the response and update UI
            const lines = result.split('\n');
            let plantIdentified = '';
            let healthCondition = '';
            let diseaseInfo = '';

            lines.forEach(line => {
                const cleanLine = cleanText(line);
                if (cleanLine.toLowerCase().includes('plant is')) {
                    plantIdentified = cleanLine;
                } else if (cleanLine.toLowerCase().includes('healthy') || cleanLine.toLowerCase().includes('diseased')) {
                    healthCondition = cleanLine;
                } else if (cleanLine.toLowerCase().includes('disease')) {
                    diseaseInfo = cleanLine;
                }
            });

            // Update UI with results
            updateResultItem(plantName, plantIdentified);

            // Set appropriate health status and styling
            updateResultItem(healthStatus, healthCondition, 
                healthCondition.toLowerCase().includes('healthy') ? 'healthy' :
                healthCondition.toLowerCase().includes('severe') || healthCondition.toLowerCase().includes('critical') ? 'danger' : 'warning'
            );

            updateResultItem(disease, diseaseInfo || 'No disease detected');

            // Show results with animation
            document.querySelector('.result-card').style.display = 'grid';
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error analyzing image. Please try again.');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-microscope"></i> Analyze Plant';
    }
});
