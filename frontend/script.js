
document.addEventListener('DOMContentLoaded', () => {

    const fileInput = document.getElementById('file-hidden-input');
    const uploadBtn = document.getElementById('upload-bar-btn');
    const detectBtn = document.getElementById('detect-now-btn');

    const previewContainer = document.getElementById('upload-preview-container');
    const previewImage = document.getElementById('preview-img-el');

    const resultContent = document.getElementById('result-content');
    const resultPlaceholder = document.getElementById('result-placeholder');

    const resultTranslation = document.getElementById('result-translation');
    const resultConfidence = document.getElementById('result-confidence');
    const resultSpeed = document.getElementById('result-speed');

    const loadingState = document.getElementById('detection-loading-state');

    let selectedFile = null;

    // Upload Button
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File Select
    fileInput.addEventListener('change', (e) => {

        selectedFile = e.target.files[0];

        if(selectedFile){

            previewContainer.style.display = 'block';

            previewImage.src = URL.createObjectURL(selectedFile);

            console.log('File selected:', selectedFile.name);

        }

    });

    // Detect Button
    detectBtn.addEventListener('click', async () => {

        if(!selectedFile){

            alert('Please upload image first');

            return;

        }

        try {

            loadingState.style.display = 'flex';

            const formData = new FormData();

            formData.append('image', selectedFile);

            const response = await fetch('http://127.0.0.1:5000/api/detect', {

                method: 'POST',

                body: formData

            });

            const data = await response.json();

            console.log(data);

            loadingState.style.display = 'none';

            if(data.success){

                resultPlaceholder.style.display = 'none';

                resultContent.style.display = 'block';

                resultTranslation.textContent =
                    data.detectedText;

                resultConfidence.textContent =
                    data.confidence;

                resultSpeed.textContent =
                    data.processingTime;

            }
            else{

                alert(data.message || 'Detection failed');

            }

        }
        catch(error){

            console.error(error);

            loadingState.style.display = 'none';

            alert('Detection failed');

        }

    });

});
