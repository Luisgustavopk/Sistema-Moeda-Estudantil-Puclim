package br.pucminas.puclim.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class GamificationResponses {
    private GamificationResponses() {
    }

    public record Badge(String id, String name, String description, String criterion, String rarity, String icon,
            long target, long progress, Instant unlockedAt) {
    }

    public record Rank(int position, String studentId, String name, String course, String institution, long received,
            int streak, int level, Instant firstCoin) {
    }

    public record Ranking(List<Rank> content, int page, int size, int total, Rank own, String semester, String type) {
    }

    public record Profile(String id, String name, String course, String institution, int level, long totalReceived,
            Long nextLevelAt, long levelStart, int progressPercent, int streak, int bestStreak, Integer coinPosition,
            Integer streakPosition, List<Badge> badges, List<LevelChange> history) {
    }

    public record LevelChange(int level, long total, Instant date) {
    }

    public record Notice(String id, String type, String title, String message, Instant date, Instant readAt,
            String referenceId) {
    }

    public record Question(String id, String prompt, String area, List<String> options, int correctIndex,
            boolean active) {
    }

    public record Item(String id, String prompt, String area, List<String> options, Integer correctIndex,
            Integer selectedIndex) {
    }

    public record Quiz(String id, LocalDate day, Instant completedAt, int correctCount, int errors, double grade,
            int streak, List<Item> items) {
    }

    public record QuizStatus(int streak, int bestStreak, int daysToReward, Instant nextAvailable, Quiz today,
            List<Quiz> history) {
    }

    public record Review(String action, String text, Instant date) {
    }

    public record Participation(String id, String studentId, String studentName, String status, String delivery,
            String feedback, Instant acceptedAt, Instant submittedAt, Instant approvedAt, List<Review> history) {
    }

    public record Mission(String id, String teacherName, String title, String description, long reward, int capacity,
            int occupied, long reserved, Instant deadline, String status, List<Participation> participants) {
    }

    public record Payment(String id, String studentName, String semester, String kind, long amount, String status,
            String sourceKey, String originOperationId, Instant date, Instant paidAt) {
    }

    public record Movement(String kind, long amount, String sourceKey, Instant date) {
    }

    public record Winner(int position, String studentName, long received, int streak, long reward) {
    }

    public record Fund(String semester, long allocation, long balance, long reserved, String origin,
            List<Movement> movements, List<Payment> payments, List<Winner> winners) {
    }

    public record Beneficiary(String id, String name) {
    }

    public record Donation(String id, String advantageName, String companyName, String beneficiaryName, Instant date) {
    }

    public record Challenge(String id, String title, String description, long reward, int capacity, long budget,
            Instant deadline, String status, String companyName) {
    }
}
