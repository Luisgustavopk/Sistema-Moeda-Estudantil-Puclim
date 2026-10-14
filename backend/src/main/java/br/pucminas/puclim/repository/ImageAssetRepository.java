package br.pucminas.puclim.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.pucminas.puclim.entity.ImageAsset;

public interface ImageAssetRepository extends JpaRepository<ImageAsset, String> {
    Optional<ImageAsset> findByFilename(String filename);
}
