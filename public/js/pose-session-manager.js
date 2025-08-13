// Session Management for Pose Detection
class PoseSessionManager {
    constructor() {
        this.currentSession = null;
        this.sessionStartTime = null;
        this.sessionTimer = null;
        this.currentAccuracy = 0;
        this.sessionActive = false;
        this.lastAnalysisResult = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadInitialStats();
    }
    
    initializeElements() {
        // Buttons
        this.startBtn = document.getElementById('startPoseBtn');
        this.correctBtn = document.getElementById('correctPoseBtn');
        this.saveBtn = document.getElementById('saveSessionBtn');
        this.stopBtn = document.getElementById('stopSessionBtn');
        this.historyBtn = document.getElementById('toggleHistoryBtn');
        this.refreshBtn = document.getElementById('refreshStatsBtn');
        
        // Display elements
        this.accuracyDisplay = document.getElementById('currentAccuracy');
        this.accuracyStatus = document.getElementById('accuracyStatus');
        this.sessionTimerDisplay = document.getElementById('sessionTimer');
        this.feedbackText = document.getElementById('feedbackText');
        this.historySection = document.getElementById('sessionHistory');
        this.historyList = document.getElementById('historyList');
        
        // Stats elements
        this.todayCount = document.getElementById('todayCount');
        this.todayAvg = document.getElementById('todayAvg');
        this.bestScore = document.getElementById('bestScore');
        this.totalSessions = document.getElementById('totalSessions');
    }
    
    bindEvents() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startSession());
        }
        
        if (this.correctBtn) {
            this.correctBtn.addEventListener('click', () => this.analyzePose());
        }
        
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveSession());
        }
        
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopSession());
        }
        
        if (this.historyBtn) {
            this.historyBtn.addEventListener('click', () => this.toggleHistory());
        }
        
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refreshStats());
        }
    }
    
    async startSession() {
        try {
            this.sessionActive = true;
            this.sessionStartTime = new Date();
            this.startSessionTimer();
            
            // Update UI
            this.startBtn.classList.add('hidden');
            this.saveBtn.classList.remove('hidden');
            this.stopBtn.classList.remove('hidden');
            
            this.updateAccuracyDisplay(0, 'Session started - begin pose detection');
            this.updateFeedback('Session started! Position yourself in front of the camera.');
            
            console.log('✅ Session started');
            
        } catch (error) {
            console.error('Start session error:', error);
            this.updateFeedback('Error starting session. Please try again.');
        }
    }
    
    async analyzePose() {
        if (!this.sessionActive) {
            this.updateFeedback('Please start a session first by clicking "Start Pose Detection"');
            return;
        }
        
        try {
            // Get current frame from video
            const video = document.getElementById('webcam');
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // Convert to blob and send to backend
            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('file', blob, 'pose-frame.jpg');
                
                this.updateFeedback('Analyzing pose...');
                
                const response = await fetch('/api/pose', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.handleAnalysisResult(result);
                } else {
                    throw new Error('Analysis failed');
                }
            }, 'image/jpeg', 0.8);
            
        } catch (error) {
            console.error('Analyze pose error:', error);
            this.updateFeedback('Error analyzing pose. Please try again.');
        }
    }
    
    handleAnalysisResult(result) {
        if (result.success !== false) {
            const accuracy = result.accuracy || 0;
            const feedback = result.feedback || 'Analysis complete';
            
            this.currentAccuracy = accuracy;
            this.lastAnalysisResult = result;
            
            this.updateAccuracyDisplay(accuracy, this.getAccuracyStatus(accuracy));
            this.updateFeedback(feedback);
            
            // Color-code accuracy
            this.updateAccuracyColor(accuracy);
            
            console.log('📊 Analysis result:', { accuracy, feedback });
        } else {
            this.updateFeedback(result.feedback || 'No pose detected');
            this.updateAccuracyDisplay(0, 'No pose detected');
        }
    }
    
    async saveSession() {
        if (!this.sessionActive || !this.lastAnalysisResult) {
            this.updateFeedback('No session data to save. Please analyze a pose first.');
            return;
        }
        
        try {
            const sessionData = {
                accuracy: this.currentAccuracy,
                feedback: this.lastAnalysisResult.feedback || '',
                poseName: 'General Pose',
                landmarks: this.lastAnalysisResult.landmarks || null,
                duration: this.getSessionDuration()
            };
            
            const response = await fetch('/api/save-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.updateFeedback(`✅ Session saved successfully! Accuracy: ${this.currentAccuracy}%`);
                
                // Refresh stats after saving
                setTimeout(() => this.refreshStats(), 500);
                
                console.log('💾 Session saved:', result);
            } else {
                throw new Error('Failed to save session');
            }
            
        } catch (error) {
            console.error('Save session error:', error);
            this.updateFeedback('❌ Error saving session. Please try again.');
        }
    }
    
    stopSession() {
        this.sessionActive = false;
        this.clearSessionTimer();
        
        // Reset UI
        this.startBtn.classList.remove('hidden');
        this.saveBtn.classList.add('hidden');
        this.stopBtn.classList.add('hidden');
        
        this.updateAccuracyDisplay(0, 'Session stopped');
        this.updateFeedback('Session stopped. Click "Start Pose Detection" to begin a new session.');
        
        console.log('⏹️ Session stopped');
    }
    
    async toggleHistory() {
        const isHidden = this.historySection.classList.contains('hidden');
        
        if (isHidden) {
            this.historySection.classList.remove('hidden');
            this.historyBtn.textContent = '📋 Hide History';
            await this.loadSessionHistory();
        } else {
            this.historySection.classList.add('hidden');
            this.historyBtn.textContent = '📋 Show Previous History';
        }
    }
    
    async loadSessionHistory() {
        try {
            this.historyList.innerHTML = '<div style="text-align: center;">Loading...</div>';
            
            const response = await fetch('/api/session-history');
            if (response.ok) {
                const data = await response.json();
                this.displaySessionHistory(data.sessions, data.stats);
            } else {
                throw new Error('Failed to load history');
            }
        } catch (error) {
            console.error('Load history error:', error);
            this.historyList.innerHTML = '<div style="color: red;">Error loading history</div>';
        }
    }
    
    displaySessionHistory(sessions, stats) {
        if (!sessions || sessions.length === 0) {
            this.historyList.innerHTML = '<div style="text-align: center; color: #666;">No sessions found</div>';
            return;
        }
        
        let html = '';
        sessions.forEach(session => {
            const date = new Date(session.date).toLocaleString();
            const accuracyClass = session.accuracy >= 80 ? 'text-success' : session.accuracy >= 60 ? 'text-warning' : 'text-danger';
            
            html += `
                <div class="history-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #003d82;">${session.poseName}</strong><br>
                            <small style="color: #495057;">${date}</small>
                        </div>
                        <div style="text-align: right;">
                            <div class="${accuracyClass}" style="font-size: 1.2em; font-weight: bold; color: ${session.accuracy >= 80 ? '#1e7e34' : session.accuracy >= 60 ? '#e67e22' : '#c0392b'};">
                                ${session.accuracy}%
                            </div>
                            <small style="color: #0056b3;">Accuracy</small>
                        </div>
                    </div>
                    ${session.feedback ? `<div style="margin-top: 5px; color: #495057; font-size: 0.9em;">${session.feedback}</div>` : ''}
                </div>
            `;
        });
        
        this.historyList.innerHTML = html;
    }
    
    async loadInitialStats() {
        await this.refreshStats();
    }
    
    async refreshStats() {
        try {
            const response = await fetch('/api/accuracy-stats');
            if (response.ok) {
                const data = await response.json();
                this.updateStatsDisplay(data);
            }
        } catch (error) {
            console.error('Refresh stats error:', error);
        }
    }
    
    updateStatsDisplay(data) {
        if (this.todayCount) this.todayCount.textContent = data.todayCount || 0;
        if (this.todayAvg) this.todayAvg.textContent = data.todayAverage ? `${data.todayAverage}%` : '--';
        
        // Get best score from recent sessions or show last accuracy
        if (this.bestScore) {
            const bestScore = data.recentSessions && data.recentSessions.length > 0 
                ? Math.max(...data.recentSessions.map(s => s.accuracy))
                : data.lastAccuracy || 0;
            this.bestScore.textContent = `${bestScore}%`;
        }
        
        if (this.totalSessions) {
            this.totalSessions.textContent = data.recentSessions ? data.recentSessions.length : 0;
        }
    }
    
    updateAccuracyDisplay(accuracy, status) {
        if (this.accuracyDisplay) {
            this.accuracyDisplay.textContent = `${accuracy}%`;
        }
        if (this.accuracyStatus) {
            this.accuracyStatus.textContent = status;
        }
    }
    
    updateAccuracyColor(accuracy) {
        if (this.accuracyDisplay) {
            this.accuracyDisplay.className = 'accuracy-score';
            if (accuracy >= 80) {
                this.accuracyDisplay.style.color = '#1e7e34'; // Darker green
            } else if (accuracy >= 60) {
                this.accuracyDisplay.style.color = '#e67e22'; // Darker orange instead of yellow
            } else {
                this.accuracyDisplay.style.color = '#c0392b'; // Darker red
            }
        }
    }
    
    updateFeedback(message) {
        if (this.feedbackText) {
            this.feedbackText.textContent = message;
        }
    }
    
    getAccuracyStatus(accuracy) {
        if (accuracy >= 85) return 'Excellent Form!';
        if (accuracy >= 70) return 'Good Form';
        if (accuracy >= 50) return 'Needs Improvement';
        return 'Poor Form';
    }
    
    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            if (this.sessionStartTime && this.sessionTimerDisplay) {
                const elapsed = Math.floor((new Date() - this.sessionStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                this.sessionTimerDisplay.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    clearSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        if (this.sessionTimerDisplay) {
            this.sessionTimerDisplay.textContent = '00:00';
        }
    }
    
    getSessionDuration() {
        if (this.sessionStartTime) {
            return Math.floor((new Date() - this.sessionStartTime) / 1000);
        }
        return 0;
    }
}

// Initialize session manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.poseSessionManager = new PoseSessionManager();
    console.log('🎯 Pose Session Manager initialized');
});
