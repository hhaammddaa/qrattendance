class QRScanner {
    constructor() {
        this.video = document.getElementById('qr-video');
        this.canvas = document.getElementById('qr-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scanning = false;
        this.currentStream = null;
        this.facingMode = 'environment';
        this.onScan = null;

        this.initializeButtons();
    }

    initializeButtons() {
        document.getElementById('toggle-camera').addEventListener('click', () => this.toggleCamera());
        document.getElementById('toggle-flash').addEventListener('click', () => this.toggleFlash());
    }

    async start() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode }
            });

            this.currentStream = stream;
            this.video.srcObject = stream;
            
            this.video.onloadedmetadata = () => {
                this.video.play();
                this.startScanning();
            };
        } catch (err) {
            showToast('Camera access error: ' + err.message, 'error');
        }
    }

    stop() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }
        this.scanning = false;
    }

    async toggleCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        this.stop();
        await this.start();
    }

    async toggleFlash() {
        if (!this.currentStream) return;
        const track = this.currentStream.getVideoTracks()[0];

        try {
            await track.applyConstraints({ advanced: [{ torch: !track.getSettings().torch }] });
            showToast('Flash toggled', 'success');
        } catch (err) {
            showToast('Flash not supported', 'error');
        }
    }

    startScanning() {
        this.scanning = true;
        this.scan();
    }

    scan() {
        if (!this.scanning) return;

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            this.handleSuccessfulScan(code.data);
        }

        setTimeout(() => this.scan(), 1000);
    }

    handleSuccessfulScan(data) {
        document.getElementById('last-scan-data').innerText = data;
        document.getElementById('last-scan-time').innerText = new Date().toLocaleString();
        showToast('QR Code scanned successfully!', 'success');
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerText = message;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const scanner = new QRScanner();
scanner.start();
