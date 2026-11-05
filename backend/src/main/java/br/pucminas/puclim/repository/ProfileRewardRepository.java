package br.pucminas.puclim.repository;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import br.pucminas.puclim.entity.ProfileReward;

public interface ProfileRewardRepository extends JpaRepository<ProfileReward, String> {
    @EntityGraph(attributePaths = "badge")
    List<ProfileReward> findAllByOrderBySortOrderAscIdAsc();
}
