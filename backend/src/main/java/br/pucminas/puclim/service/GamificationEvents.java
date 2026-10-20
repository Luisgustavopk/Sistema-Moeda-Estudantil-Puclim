package br.pucminas.puclim.service;

public final class GamificationEvents {
    private GamificationEvents() {
    }

    public record CoinsReceived(String studentId, String operationId, long amount, boolean bonusEligible) {
    }

    public record AdvantageRedeemed(String studentId, String couponId) {
    }

    public record AdvantageDonated(String studentId, String couponId) {
    }

    public record QuizCompleted(String studentId, String attemptId) {
    }

    public record StreakUpdated(String studentId, int streak) {
    }

    public record MissionApproved(String studentId, String participationId) {
    }

    public record LevelReached(String studentId, int level) {
    }

    public record BadgeUnlocked(String studentId, String badgeId) {
    }

    public record SemesterClosed(String institutionId, String semester) {
    }
}
