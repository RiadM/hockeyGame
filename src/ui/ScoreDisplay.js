// ScoreDisplay - Manages score value, progress bar, and animated score changes
// Handles visual feedback for score updates with delta badges

export class ScoreDisplay {
    constructor(elements) {
        this.scoreValue = elements.scoreValue;
        this.scoreProgress = elements.scoreProgress;
        this.scorePercentage = elements.scorePercentage;
        this.scoreDelta = elements.scoreDelta;
        this.animatingScore = false;

        if (!this.scoreValue || !this.scoreProgress) {
            throw new Error('Required score display elements missing');
        }
    }

    // Update score display without animation
    updateScore(score, roundStartScore) {
        const percentage = (score / roundStartScore) * 100;

        this.scoreValue.textContent = score;
        this.scoreProgress.style.width = `${percentage}%`;
        if (this.scorePercentage) {
            this.scorePercentage.textContent = `${Math.round(percentage)}%`;
        }

        // Update progress bar color
        this.scoreProgress.classList.remove('excellent', 'good', 'average', 'low');
        if (percentage >= 100) {
            this.scoreProgress.classList.add('excellent');
        } else if (percentage >= 80) {
            this.scoreProgress.classList.add('good');
        } else if (percentage >= 60) {
            this.scoreProgress.classList.add('average');
        } else {
            this.scoreProgress.classList.add('low');
        }
    }

    // Animate score change with delta badge
    animateScoreChange(fromScore, toScore, delta, roundStartScore, onComplete) {
        if (this.animatingScore) return;

        this.animatingScore = true;
        const duration = 800;
        const startTime = performance.now();

        // Show delta badge
        this.showScoreDelta(delta);

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;

            const currentScore = Math.round(fromScore + (toScore - fromScore) * easeProgress);
            this.updateScore(currentScore, roundStartScore);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.updateScore(toScore, roundStartScore);
                this.animatingScore = false;

                // Hide delta after delay
                setTimeout(() => {
                    this.scoreDelta.classList.remove('show');
                }, 1500);

                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animate);
    }

    // Show score delta badge
    showScoreDelta(delta) {
        this.scoreDelta.textContent = delta > 0 ? `+${delta}` : delta;
        this.scoreDelta.className = `score-delta ${delta > 0 ? 'positive' : 'negative'} show`;
    }

    // Reset animation state
    reset() {
        this.animatingScore = false;
        this.scoreDelta.classList.remove('show');
    }
}
