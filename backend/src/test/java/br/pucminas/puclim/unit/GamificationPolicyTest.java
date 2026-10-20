package br.pucminas.puclim.unit;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import br.pucminas.puclim.config.GamificationPolicy;

class GamificationPolicyTest {
    @Test void levelsUseLifetimeReceiptsAndRespectEveryBoundary() {
        GamificationPolicy p=new GamificationPolicy();
        long[] boundaries={0,99,100,299,300,699,700,1499,1500,100000};
        int[] expected={1,1,2,2,3,3,4,4,5,5};
        for(int i=0;i<boundaries.length;i++) assertEquals(expected[i],p.level(boundaries[i]));
        p.setLevels(List.of(0L,10L,20L));assertEquals(3,p.level(20));
    }
    @Test void bonusUsesOriginalAmountRoundsDownAndCapsCombinedBenefits() {
        GamificationPolicy p=new GamificationPolicy();
        assertEquals(0,p.bonus(100,false,false,6));
        assertEquals(10,p.bonus(100,true,false,0));
        assertEquals(20,p.bonus(100,true,true,7));
        assertEquals(1,p.bonus(19,true,false,0));
        p.setPerfectPercent(40);assertEquals(25,p.bonus(100,true,true,7));
    }
    @Test void semesterBoundariesAreUnambiguous() {
        assertEquals("2026-1",GamificationPolicy.semester(LocalDate.of(2026,6,30)));
        assertEquals("2026-2",GamificationPolicy.semester(LocalDate.of(2026,7,1)));
        assertEquals(LocalDate.of(2026,7,1),GamificationPolicy.start("2026-2"));
        assertThrows(IllegalArgumentException.class,()->GamificationPolicy.start("2026-3"));
    }
}
