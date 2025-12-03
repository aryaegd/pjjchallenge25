// PJJ Challenge Lucky Draw - Standalone JavaScript
class StandaloneLuckyDraw {
    constructor() {
        this.currentCategory = 'brain-challenge';
        this.participantsData = {
            'brain-challenge': [],
            'essay': [],
            'poster': []
        };
        this.drawHistory = {
            'brain-challenge': [],
            'essay': [],
            'poster': []
        };
        this.currentResults = {
            'brain-challenge': null,
            'essay': null,
            'poster': null
        };
        this.isDrawing = false;
        this.winnersCount = 3; // Change to 5 for 5 winners
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateParticipantsInfo();
        this.loadHistory();
        this.loadFromStorage();
    }

    bindEvents() {
        // Category selection
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectCategory(e.target.closest('.category-btn').dataset.category);
            });
        });

        // Draw button
        document.getElementById('drawBtn').addEventListener('click', () => {
            this.performDraw();
        });

        // New draw button
        document.getElementById('newDrawBtn').addEventListener('click', () => {
            this.resetDraw();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportResults();
        });

        // Clear history button
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
        });

        // Reset all button
        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.resetAllData();
        });

        // File upload
        const fileInput = document.getElementById('participantsFile');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileLabel = document.querySelector('.file-input-label');

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadBtn.disabled = false;
                fileLabel.querySelector('span').textContent = `File dipilih: ${file.name}`;
                fileLabel.style.borderColor = '#48bb78';
                fileLabel.style.background = '#f0fff4';
            }
        });

        // Drag and drop
        fileLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileLabel.classList.add('drag-over');
        });

        fileLabel.addEventListener('dragleave', () => {
            fileLabel.classList.remove('drag-over');
        });

        fileLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            fileLabel.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                    'application/vnd.ms-excel', 'text/csv'];
                
                if (allowedTypes.includes(file.type) || file.name.endsWith('.csv')) {
                    fileInput.files = files;
                    uploadBtn.disabled = false;
                    fileLabel.querySelector('span').textContent = `File dipilih: ${file.name}`;
                    fileLabel.style.borderColor = '#48bb78';
                    fileLabel.style.background = '#f0fff4';
                } else {
                    this.showMessage('error', 'Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv');
                }
            }
        });

        uploadBtn.addEventListener('click', () => {
            this.uploadFile();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !document.querySelector('textarea:focus')) {
                e.preventDefault();
                const drawBtn = document.getElementById('drawBtn');
                if (!drawBtn.disabled) {
                    drawBtn.click();
                }
            }
            
            if (e.code === 'Escape') {
                document.getElementById('newDrawBtn').click();
            }
        });
    }

    selectCategory(category) {
        this.currentCategory = category;
        
        // Update UI
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Reset file input
        this.resetFileInput();
        
        // Update info and history
        this.updateParticipantsInfo();
        this.loadHistory();
        this.updateDrawResults();

        this.showMessage('info', `Kategori ${this.getCategoryName(category)} dipilih`);
    }

    getCategoryName(category) {
        const names = {
            'brain-challenge': 'Brain Challenge',
            'essay': 'Essay',
            'poster': 'Poster'
        };
        return names[category] || category;
    }



    resetFileInput() {
        const fileInput = document.getElementById('participantsFile');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileLabel = document.querySelector('.file-input-label');

        fileInput.value = '';
        uploadBtn.disabled = true;
        fileLabel.querySelector('span').textContent = 'Klik untuk upload file Excel atau CSV';
        fileLabel.style.borderColor = '#cbd5e0';
        fileLabel.style.background = '#f7fafc';
    }

    async uploadFile() {
        const fileInput = document.getElementById('participantsFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showMessage('error', 'Pilih file terlebih dahulu');
            return;
        }

        try {
            const participants = await this.parseFile(file);
            
            if (participants.length === 0) {
                throw new Error('No participants found in file');
            }

            this.participantsData[this.currentCategory] = participants;
            this.drawHistory[this.currentCategory] = [];
            
            this.updateParticipantsInfo();
            this.resetFileInput();
            this.saveToStorage();

            this.showMessage('success', `${participants.length} peserta berhasil diupload untuk kategori ${this.getCategoryName(this.currentCategory)}`);
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('error', `Upload gagal: ${error.message}`);
        }
    }

    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    let participants = [];
                    const fileExtension = file.name.toLowerCase().split('.').pop();
                    
                    if (fileExtension === 'csv') {
                        // Parse CSV
                        const text = e.target.result;
                        const lines = text.split('\n');
                        const names = lines.map(line => line.trim()).filter(name => name);
                        
                        participants = names.map((name, index) => ({
                            id: `participant_${Date.now()}_${index}`,
                            name: name,
                            email: '',
                            institution: ''
                        }));
                    } else if (['xlsx', 'xls'].includes(fileExtension)) {
                        // Parse Excel
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        
                        participants = jsonData.map((participant, index) => {
                            return {
                                id: participant.id || participant.ID || participant.Id || `participant_${Date.now()}_${index}`,
                                name: participant.name || participant.Name || participant.NAMA || participant.nama || 'Unknown',
                                email: participant.email || participant.Email || participant.EMAIL || '',
                                institution: participant.institution || participant.Institution || participant.institusi || participant.INSTITUSI || ''
                            };
                        });
                    }
                    
                    resolve(participants);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            
            if (file.name.toLowerCase().endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    updateParticipantsInfo() {
        const participants = this.participantsData[this.currentCategory] || [];

        document.getElementById('totalParticipants').textContent = participants.length;

        // Show/hide participants info
        const infoContainer = document.getElementById('participantsInfo');
        if (participants.length > 0) {
            infoContainer.style.display = 'block';
        } else {
            infoContainer.style.display = 'none';
        }

        // Enable/disable draw button based on minimum participants
        const drawBtn = document.getElementById('drawBtn');
        drawBtn.disabled = participants.length < this.winnersCount;
        
        if (participants.length < this.winnersCount && participants.length > 0) {
            this.showMessage('info', `Minimal ${this.winnersCount} peserta diperlukan untuk undian`);
        }
    }

    performDraw() {
        if (this.isDrawing) return;

        const participants = this.participantsData[this.currentCategory] || [];

        if (participants.length === 0) {
            this.showMessage('error', 'Belum ada data peserta. Input data terlebih dahulu.');
            return;
        }
        
        if (participants.length < this.winnersCount) {
            this.showMessage('error', `Peserta kurang dari ${this.winnersCount} orang. Minimal ${this.winnersCount} peserta diperlukan.`);
            return;
        }

        this.isDrawing = true;

        // Hide results and show animation
        document.getElementById('resultsArea').style.display = 'none';
        document.getElementById('animationArea').style.display = 'block';

        // Create slot machine animation
        this.createSlotAnimation(this.winnersCount, participants);

        // Perform random selection after animation
        setTimeout(() => {
            const winners = this.getRandomWinners(participants, this.winnersCount);
            this.drawHistory[this.currentCategory].push(winners);
            this.saveToStorage();
            
            this.displayWinners(winners, this.drawHistory[this.currentCategory].length);
            this.updateParticipantsInfo();
            this.loadHistory();
            this.createConfetti();
            this.playSuccessSound();
            
            this.isDrawing = false;
        }, 3000);
    }

    getRandomWinners(participants, count) {
        const winners = [];
        const availableParticipants = [...participants];
        
        for (let i = 0; i < count && availableParticipants.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableParticipants.length);
            winners.push(availableParticipants.splice(randomIndex, 1)[0]);
        }
        
        return winners;
    }

    createSlotAnimation(winnersCount, availableParticipants) {
        const container = document.getElementById('slotContainer');
        container.innerHTML = '';

        for (let i = 0; i < winnersCount; i++) {
            const reel = document.createElement('div');
            reel.className = 'slot-reel';
            
            const nameElement = document.createElement('div');
            nameElement.className = 'slot-name';
            reel.appendChild(nameElement);
            
            container.appendChild(reel);

            // Animate with random names
            this.animateSlotReel(nameElement, availableParticipants);
        }
    }

    animateSlotReel(element, participants) {
        let animationCount = 0;
        const maxAnimations = 20;
        
        const animate = () => {
            if (animationCount < maxAnimations) {
                const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
                element.textContent = randomParticipant.name;
                animationCount++;
                setTimeout(animate, 100 + (animationCount * 10));
            } else {
                element.textContent = "...";
            }
        };
        
        animate();
    }

    displayWinners(winners, roundNumber) {
        document.getElementById('animationArea').style.display = 'none';
        document.getElementById('resultsArea').style.display = 'block';

        // Simpan hasil undian untuk kategori saat ini
        this.currentResults[this.currentCategory] = { winners, roundNumber };

        const container = document.getElementById('winnersContainer');
        container.innerHTML = '';

        winners.forEach((winner, index) => {
            const card = document.createElement('div');
            card.className = 'winner-card';
            
            card.innerHTML = `
                <div class="winner-rank">Pemenang ${index + 1}</div>
                <div class="winner-name">${winner.name}</div>
                <div class="winner-details">
                    ${winner.email ? `<div>📧 ${winner.email}</div>` : ''}
                    ${winner.institution ? `<div>🏫 ${winner.institution}</div>` : ''}
                </div>
            `;
            
            container.appendChild(card);
        });

        this.showMessage('success', `Selamat! ${winners.length} pemenang putaran ke-${roundNumber} telah dipilih`);
    }

    resetDraw() {
        document.getElementById('resultsArea').style.display = 'none';
        document.getElementById('animationArea').style.display = 'none';
        this.currentResults[this.currentCategory] = null;
    }

    updateDrawResults() {
        const currentResult = this.currentResults[this.currentCategory];
        
        if (currentResult) {
            // Tampilkan hasil undian untuk kategori saat ini
            document.getElementById('animationArea').style.display = 'none';
            document.getElementById('resultsArea').style.display = 'block';

            const container = document.getElementById('winnersContainer');
            container.innerHTML = '';

            currentResult.winners.forEach((winner, index) => {
                const card = document.createElement('div');
                card.className = 'winner-card';
                
                card.innerHTML = `
                    <div class="winner-rank">Pemenang ${index + 1}</div>
                    <div class="winner-name">${winner.name}</div>
                    <div class="winner-details">
                        ${winner.email ? `<div>📧 ${winner.email}</div>` : ''}
                        ${winner.institution ? `<div>🏫 ${winner.institution}</div>` : ''}
                    </div>
                `;
                
                container.appendChild(card);
            });
        } else {
            // Sembunyikan hasil undian jika belum ada
            document.getElementById('resultsArea').style.display = 'none';
            document.getElementById('animationArea').style.display = 'none';
        }
    }

    exportResults() {
        const history = this.drawHistory[this.currentCategory] || [];
        
        if (history.length === 0) {
            this.showMessage('error', 'Tidak ada data untuk diekspor');
            return;
        }

        const csvContent = this.generateCSV(history);
        this.downloadCSV(csvContent, `${this.currentCategory}_winners_${new Date().toISOString().split('T')[0]}.csv`);
    }

    generateCSV(history) {
        let csv = 'Putaran,Posisi,Nama,Email,Institusi\n';
        
        history.forEach((round, roundIndex) => {
            round.forEach((winner, winnerIndex) => {
                csv += `${roundIndex + 1},${winnerIndex + 1},"${winner.name}","${winner.email || ''}","${winner.institution || ''}"\n`;
            });
        });
        
        return csv;
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    loadHistory() {
        const history = this.drawHistory[this.currentCategory] || [];
        this.displayHistory(history);
    }

    displayHistory(history) {
        const container = document.getElementById('historyContainer');
        
        if (!history || history.length === 0) {
            container.innerHTML = '<p class="no-history">Belum ada riwayat undian untuk kategori ini.</p>';
            return;
        }

        let html = '';
        history.forEach((round, index) => {
            html += `
                <div class="history-round">
                    <h4><i class="fas fa-medal"></i> Putaran ${index + 1} - ${round.length} Pemenang</h4>
                    <div class="history-winners">
                        ${round.map((winner, winnerIndex) => `
                            <div class="history-winner">
                                <strong>Pemenang ${winnerIndex + 1}:</strong><br>
                                ${winner.name}
                                ${winner.email ? `<br><small>${winner.email}</small>` : ''}
                                ${winner.institution ? `<br><small>${winner.institution}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    clearHistory() {
        if (confirm('Apakah Anda yakin ingin menghapus semua riwayat undian untuk kategori ini?')) {
            this.participantsData[this.currentCategory] = [];
            this.drawHistory[this.currentCategory] = [];
            this.currentResults[this.currentCategory] = null;
            this.updateParticipantsInfo();
            this.loadHistory();
            this.updateDrawResults();
            this.saveToStorage();
            this.showMessage('success', 'Riwayat berhasil dihapus');
        }
    }

    resetAllData() {
        if (confirm('Reset semua data peserta dan riwayat undian untuk kategori ini?')) {
            // Reset data for current category
            this.participantsData[this.currentCategory] = [];
            this.drawHistory[this.currentCategory] = [];
            this.currentResults[this.currentCategory] = null;
            
            // Update UI
            this.updateParticipantsInfo();
            this.loadHistory();
            this.updateDrawResults();
            
            // Save to storage
            this.saveToStorage();
            
            this.showMessage('success', `Semua data untuk kategori ${this.getCategoryName(this.currentCategory)} berhasil direset`);
        }
    }

    showMessage(type, message) {
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';

        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            // Ignore audio errors
        }
    }

    createConfetti() {
        const colors = ['#f43f5e', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '50%';
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '9999';
            confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }

    saveToStorage() {
        const data = {
            participantsData: this.participantsData,
            drawHistory: this.drawHistory,
            currentResults: this.currentResults
        };
        localStorage.setItem('luckyDrawData', JSON.stringify(data));
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('luckyDrawData');
            if (saved) {
                const data = JSON.parse(saved);
                this.participantsData = data.participantsData || {
                    'brain-challenge': [],
                    'essay': [],
                    'poster': []
                };
                this.drawHistory = data.drawHistory || {
                    'brain-challenge': [],
                    'essay': [],
                    'poster': []
                };
                this.currentResults = data.currentResults || {
                    'brain-challenge': null,
                    'essay': null,
                    'poster': null
                };
                this.updateParticipantsInfo();
                this.loadHistory();
                this.updateDrawResults();
            }
        } catch (error) {
            console.log('No saved data found or data corrupted');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StandaloneLuckyDraw();
});