'use strict';
// CJS wrapper — required by AutonomousHeartbeat (CJS). Mirrors core/DriveSystem.js.

class DriveSystem {
    constructor(config = {}) {
        this.tension        = 0.0;
        this.satisfaction   = 0.0;
        this.lastActionAt   = Date.now();
        this.goalsCompleted = 0;
        this.tasksWorked    = 0;

        this.config = {
            tensionBuildRate:       0.04,
            tensionDecayOnWork:     0.15,
            tensionDecayOnComplete: 0.50,
            urgencyRatePerMinute:   1.5,
            maxUrgencyBoost:        45,
            baseActionThreshold:    0.30,
            minActionThreshold:     0.12,
            satisfactionDecayRate:  0.02,
            ...config
        };
    }

    onIdleTick() {
        this.tension      = Math.min(1.0, this.tension + this.config.tensionBuildRate);
        this.satisfaction = Math.max(0,   this.satisfaction - this.config.satisfactionDecayRate);
    }

    onTaskExecuted() {
        this.tension      = Math.max(0, this.tension - this.config.tensionDecayOnWork);
        this.lastActionAt = Date.now();
        this.tasksWorked++;
    }

    onGoalComplete(goal) {
        this.tension      = Math.max(0, this.tension - this.config.tensionDecayOnComplete);
        this.satisfaction = Math.min(1.0, this.satisfaction + 0.6);
        this.lastActionAt = Date.now();
        this.goalsCompleted++;
        const title = goal?.title || 'goal';
        console.log(`[DriveSystem] 🏆 Reward: "${title}" completed. Tension → ${(this.tension * 100).toFixed(0)}% | Satisfaction → ${(this.satisfaction * 100).toFixed(0)}%`);
    }

    getUrgencyBoost(goal) {
        if (!goal) return 0;
        const ageMinutes = (Date.now() - (goal.createdAt || Date.now())) / 60000;
        return Math.min(this.config.maxUrgencyBoost,
            Math.floor(ageMinutes * this.config.urgencyRatePerMinute));
    }

    getActionThreshold() {
        const range = this.config.baseActionThreshold - this.config.minActionThreshold;
        return this.config.baseActionThreshold - (this.tension * range);
    }

    confidenceMet(confidence) {
        return (confidence ?? 1.0) >= this.getActionThreshold();
    }

    isUrgent() {
        return this.tension >= 0.70;
    }

    getStatus() {
        return {
            tension:         parseFloat(this.tension.toFixed(3)),
            satisfaction:    parseFloat(this.satisfaction.toFixed(3)),
            actionThreshold: parseFloat(this.getActionThreshold().toFixed(3)),
            isUrgent:        this.isUrgent(),
            goalsCompleted:  this.goalsCompleted,
            tasksWorked:     this.tasksWorked,
            idleMinutes:     Math.round((Date.now() - this.lastActionAt) / 60000),
            lastActionAt:    new Date(this.lastActionAt).toISOString()
        };
    }
}

module.exports = { DriveSystem };
