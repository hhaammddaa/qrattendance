class QRScanner {
    constructor(config) {
        this.video = document.getElementById('qr-video');
        this.canvas = document.getElementById('qr-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scanInterval = config.scanInterval || 1000;
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
                video: { 
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.currentStream = stream;
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    this.startScanning();
                    resolve();
                };
            });
        } catch (err) {
            showToast('Camera access error: ' + err.message, 'error');
            throw err;
        }
    }

    stop() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
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
        const capabilities = track.getCapabilities();
        
        if (!capabilities.torch) {
            showToast('Flash not available on this device', 'error');
            return;
        }

        const settings = track.getSettings();
        const torch = !settings.torch;
        
        try {
            await track.applyConstraints({
                advanced: [{ torch }]
            });
            showToast(`Flash ${torch ? 'enabled' : 'disabled'}`, 'success');
        } catch (err) {
            showToast('Error toggling flash: ' + err.message, 'error');
        }
    }

    startScanning() {
        this.scanning = true;
        this.scan();
    }

    scan() {
        if (!this.scanning) return;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            // Set canvas dimensions to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            // Draw video frame to canvas
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get image data for QR code scanning
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            try {
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    this.handleSuccessfulScan(code.data);
                }
            } catch (error) {
                console.error('QR Scanning error:', error);
            }
        }

        // Schedule next scan
        setTimeout(() => this.scan(), this.scanInterval);
    }

    handleSuccessfulScan(data) {
        if (this.onScan) {
            this.onScan(data);
        }

        // Update UI
        document.getElementById('attendance-status').innerText = 'Successfully scanned!';
        document.getElementById('last-scan-data').innerText = data;
        document.getElementById('last-scan-time').innerText = new Date().toLocaleString();
        document.getElementById('last-scan').classList.remove('hidden');

        // Play success sound if enabled
        if (document.getElementById('sound-enabled').checked) {
            document.getElementById('success-sound').play();
        }

        // Show success toast
        showToast('QR Code scanned successfully!', 'success');

        // Save to records if auto-save is enabled
        if (document.getElementById('auto-save').checked) {
            saveRecord({
                id: Date.now(),
                data: data,
                timestamp: new Date().toISOString(),
                type: 'automatic'
            });
        }
    }
}