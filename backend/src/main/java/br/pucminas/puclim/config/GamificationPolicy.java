package br.pucminas.puclim.config;

import java.time.*;
import java.util.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Bean;

@Component
@ConfigurationProperties(prefix = "puclim.gamification")
public class GamificationPolicy {
    private List<Long> levels = new ArrayList<>(List.of(0L, 100L, 300L, 700L, 1500L));
    private int quizSize = 5, perfectPercent = 10, donationPercent = 5, streakPercent = 5, bonusCap = 25;
    private long weeklyReward = 20, maxAllocation = 1000000;
    private List<Long> prizes = new ArrayList<>(List.of(100L, 60L, 40L));

    @Bean
    public Clock gamificationClock() {
        return Clock.system(ZoneId.of("America/Sao_Paulo"));
    }

    public List<Long> getLevels() {
        return levels;
    }

    public void setLevels(List<Long> v) {
        levels = v;
    }

    public List<Long> getPrizes() {
        return prizes;
    }

    public void setPrizes(List<Long> v) {
        prizes = v;
    }

    public int getQuizSize() {
        return quizSize;
    }

    public void setQuizSize(int v) {
        quizSize = v;
    }

    public long getWeeklyReward() {
        return weeklyReward;
    }

    public void setWeeklyReward(long v) {
        weeklyReward = v;
    }

    public long getMaxAllocation() {
        return maxAllocation;
    }

    public void setMaxAllocation(long v) {
        maxAllocation = v;
    }

    public int getPerfectPercent() {
        return perfectPercent;
    }

    public void setPerfectPercent(int v) {
        perfectPercent = v;
    }

    public int getDonationPercent() {
        return donationPercent;
    }

    public void setDonationPercent(int v) {
        donationPercent = v;
    }

    public int getStreakPercent() {
        return streakPercent;
    }

    public void setStreakPercent(int v) {
        streakPercent = v;
    }

    public int getBonusCap() {
        return bonusCap;
    }

    public void setBonusCap(int v) {
        bonusCap = v;
    }

    public int level(long total) {
        int result = 1;
        for (int i = 0; i < levels.size(); i++)
            if (total >= levels.get(i))
                result = i + 1;
        return result;
    }

    public long bonus(long amount, boolean perfect, boolean donated, int streak) {
        int percent = Math.min(bonusCap,
                (perfect ? perfectPercent : 0) + (donated ? donationPercent : 0) + (streak >= 7 ? streakPercent : 0));
        return Math.multiplyExact(amount, percent) / 100;
    }

    public static String semester(LocalDate day) {
        return day.getYear() + "-" + (day.getMonthValue() <= 6 ? 1 : 2);
    }

    public static LocalDate start(String semester) {
        if (semester == null || !semester.matches("[0-9]{4}-[12]"))
            throw new IllegalArgumentException("Semestre inválido");
        return LocalDate.of(Integer.parseInt(semester.substring(0, 4)), semester.endsWith("1") ? 1 : 7, 1);
    }
}
