package br.pucminas.puclim.unit;

import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import br.pucminas.puclim.config.GamificationPolicy;
import br.pucminas.puclim.dto.response.GamificationResponses.Rank;
import br.pucminas.puclim.entity.*;
import br.pucminas.puclim.repository.GamificationRepository;
import br.pucminas.puclim.service.ProgressionService;
import br.pucminas.puclim.service.ProfileCustomizationService;

class RankingOrderTest {
    // Exercises the actual rankRows method, without a database or changing live data.
    static class RankingData extends GamificationRepository {
        final Map<String, ProfileCustomization> customizations = new HashMap<>();
        @Override public <T> T optional(Class<T> type, String id) {
            return type == ProfileCustomization.class ? type.cast(customizations.get(id)) : null;
        }
        final List<Student> students = new ArrayList<>();
        final List<Object[]> receipts = new ArrayList<>(), streaks = new ArrayList<>();

        void add(String id, int streak, long received, String firstCoin) {
            Account institutionAccount = new Account();
            institutionAccount.name = "PUC Minas";
            Partner institution = new Partner();
            institution.id = "institution";
            institution.account = institutionAccount;
            Student student = new Student();
            student.id = id;
            student.account = new Account();
            student.account.name = id;
            student.course = "Engenharia";
            student.institution = institution;
            students.add(student);
            if (received > 0) receipts.add(new Object[] { id, received, Instant.parse(firstCoin) });
            if (streak > 0) streaks.add(new Object[] { id, streak });
        }

        @Override @SuppressWarnings("unchecked")
        public <T> List<T> list(Class<T> type, String jpql, Object... args) {
            if (type == Student.class) return (List<T>) students;
            if (type == Object[].class) return (List<T>) (jpql.contains("LedgerEntry") ? receipts : streaks);
            if (type == Long.class) return List.of((T) Long.valueOf(100));
            return List.of();
        }
    }

    @Test
    void rankingKeepsSavedAvatarChoicesAndUsesPortraitForUncustomizedProfiles() {
        RankingData db = new RankingData();
        db.add("default", 1, 100, "2026-10-01T12:00:00Z");
        db.add("custom", 2, 200, "2026-10-02T12:00:00Z");
        ProfileCustomization saved = new ProfileCustomization();
        saved.studentId = "custom"; saved.displayName = "Nome escolhido"; saved.avatar = "initials";
        db.customizations.put(saved.studentId, saved);
        ProgressionService service = new ProgressionService(db, null, new GamificationPolicy(), Clock.systemUTC(), null,
                new ProfileCustomizationService(db, null));
        List<Rank> rows = service.rankRows("institution", "2026-2", "MOEDAS");
        assertEquals("initials", rows.get(0).avatar());
        assertEquals("Nome escolhido", rows.get(0).name());
        assertEquals("portrait", rows.get(1).avatar());
    }

    @Test
    void greatestStreakComesFirstAndPositionsAreAssignedBeforePagination() {
        RankingData db = new RankingData();
        db.add("zero", 0, 0, null);
        db.add("seven", 7, 700, "2026-10-03T12:00:00Z");
        db.add("fourteen-late", 14, 500, "2026-10-04T12:00:00Z");
        db.add("twenty-eight", 28, 200, "2026-10-05T12:00:00Z");
        db.add("fourteen-b", 14, 300, "2026-10-01T12:00:00Z");
        db.add("fourteen-a", 14, 400, "2026-10-01T12:00:00Z");
        ProgressionService service = new ProgressionService(db, null, new GamificationPolicy(), Clock.systemUTC(), null,
                new ProfileCustomizationService(db, null));
        List<Rank> rows = service.rankRows("institution", "2026-2", "STREAK");
        assertTrue(rows.stream().allMatch(row -> row.avatar().equals("portrait")),
                "Perfis sem personalização mantêm o avatar ilustrado no ranking");
        assertEquals(List.of(28, 14, 14, 14, 7, 0), rows.stream().map(Rank::streak).toList());
        assertEquals(List.of("twenty-eight", "fourteen-a", "fourteen-b", "fourteen-late", "seven", "zero"),
                rows.stream().map(Rank::studentId).toList());
        assertEquals(List.of(1, 2, 3, 4, 5, 6), rows.stream().map(Rank::position).toList());
        assertEquals(5, rows.stream().filter(r -> r.studentId().equals("seven")).findFirst().orElseThrow().position());
        assertEquals(List.of(4, 5, 6), rows.subList(3, 6).stream().map(Rank::position).toList());
        assertEquals("seven", service.rankRows("institution", "2026-2", "MOEDAS").get(0).studentId());
    }
}
