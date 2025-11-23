// WinModal - Displays round completion and final game results
// Handles success modal, final score modal with breakdown

export class WinModal {
    constructor(elements) {
        this.successModal = elements.successModal;
        this.successPlayer = elements.successPlayer;
        this.successScore = elements.successScore;
        this.finalModal = elements.finalModal;
        this.finalYourScore = elements.finalYourScore;
        this.finalMaxScore = elements.finalMaxScore;
        this.finalPercentage = elements.finalPercentage;
        this.finalGrade = elements.finalGrade;
        this.breakdownList = elements.breakdownList;
    }

    // Show success modal for round completion
    showSuccessModal(playerName, score) {
        if (!this.successModal) return;

        if (this.successPlayer) {
            this.successPlayer.textContent = playerName;
        }
        if (this.successScore) {
            this.successScore.textContent = score;
        }

        this.successModal.classList.add('show');
    }

    // Hide success modal
    hideSuccessModal() {
        if (this.successModal) {
            this.successModal.classList.remove('show');
        }
    }

    // Show final game modal with breakdown
    showFinalModal(totalScore, maxPossibleScore, roundHistory) {
        if (!this.finalModal) return;

        const percentage = Math.round((totalScore / maxPossibleScore) * 100);
        const { grade, gradeClass } = this.calculateGrade(percentage);

        // Update score displays
        if (this.finalYourScore) this.finalYourScore.textContent = totalScore;
        if (this.finalMaxScore) this.finalMaxScore.textContent = maxPossibleScore;
        if (this.finalPercentage) this.finalPercentage.textContent = `${percentage}%`;

        // Update grade
        if (this.finalGrade) {
            this.finalGrade.textContent = grade;
            this.finalGrade.className = `final-grade ${gradeClass}`;
        }

        // Populate breakdown
        this.populateBreakdown(roundHistory);

        // Show modal with delay
        setTimeout(() => {
            this.finalModal.classList.add('show');
        }, 500);
    }

    // Calculate letter grade from percentage
    calculateGrade(percentage) {
        if (percentage >= 90) return { grade: 'A+', gradeClass: 'grade-a-plus' };
        if (percentage >= 80) return { grade: 'A', gradeClass: 'grade-a' };
        if (percentage >= 70) return { grade: 'B', gradeClass: 'grade-b' };
        if (percentage >= 60) return { grade: 'C', gradeClass: 'grade-c' };
        if (percentage >= 50) return { grade: 'D', gradeClass: 'grade-d' };
        return { grade: 'F', gradeClass: 'grade-f' };
    }

    // Populate breakdown list
    populateBreakdown(roundHistory) {
        if (!this.breakdownList || !roundHistory) return;

        this.breakdownList.innerHTML = '';
        roundHistory.forEach(round => {
            const item = document.createElement('div');
            item.className = 'breakdown-item';

            const player = document.createElement('div');
            player.className = 'breakdown-player';
            player.textContent = `${round.round}. ${round.player}`;

            const hints = document.createElement('div');
            hints.className = 'breakdown-hints';
            hints.textContent = round.hintsUsed === 0 ? 'Perfect!' : `${round.hintsUsed} hint${round.hintsUsed > 1 ? 's' : ''}`;

            const score = document.createElement('div');
            score.className = round.hintsUsed === 0 ? 'breakdown-score perfect' : 'breakdown-score';
            score.textContent = `+${round.pointsGained}`;

            item.appendChild(player);
            item.appendChild(hints);
            item.appendChild(score);
            this.breakdownList.appendChild(item);
        });
    }

    // Hide final modal
    hideFinalModal() {
        if (this.finalModal) {
            this.finalModal.classList.remove('show');
        }
    }

    // Show confetti animation (optional enhancement)
    showConfetti() {
        // Simple confetti implementation
        const colors = ['#06b6d4', '#0891b2', '#0e7490', '#bfdbfe', '#a5f3fc'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                top: -10px;
                opacity: ${Math.random()};
                transform: rotate(${Math.random() * 360}deg);
                pointer-events: none;
                z-index: 10000;
            `;
            document.body.appendChild(confetti);

            // Animate fall
            const duration = 2000 + Math.random() * 1000;
            const animation = confetti.animate([
                { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
                { transform: `translateY(${window.innerHeight + 20}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });

            animation.onfinish = () => confetti.remove();
        }
    }
}
