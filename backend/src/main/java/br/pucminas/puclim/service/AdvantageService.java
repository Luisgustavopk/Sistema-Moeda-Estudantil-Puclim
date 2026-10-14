package br.pucminas.puclim.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.dto.request.Requests.AdvantageInput;
import br.pucminas.puclim.dto.response.Responses.AdvantageView;
import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.Advantage;
import br.pucminas.puclim.entity.ImageAsset;
import br.pucminas.puclim.entity.Partner;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.mapper.DomainMapper;
import br.pucminas.puclim.repository.AdvantageRepository;
import br.pucminas.puclim.repository.ImageAssetRepository;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class AdvantageService {
    private final AccountService identity;
    private final AdvantageRepository advantages;
    private final ImageAssetRepository images;

    public AdvantageService(AccountService a, AdvantageRepository v, ImageAssetRepository i) {
        identity = a;
        advantages = v;
        images = i;
    }

    @Transactional(readOnly = true)
    public List<AdvantageView> list(boolean own) {
        if (own) {
            Partner p = identity.requirePartner("EMPRESA");
            return advantages.own(p.id).stream().map(DomainMapper::advantage).toList();
        }
        identity.require("ALUNO");
        return advantages.catalog().stream().map(DomainMapper::advantage).toList();
    }

    public AdvantageView save(String id, AdvantageInput input) {
        Partner company = identity.requirePartner("EMPRESA");
        Account owner = identity.locked(company.id);
        if (!owner.active)
            throw ApiException.forbidden();
        String prefix = "/api/uploads/imagens/";
        if (!input.photo().startsWith(prefix))
            throw ApiException.bad("Envie a imagem pelo upload do sistema.");
        ImageAsset image = images.findByFilename(input.photo().substring(prefix.length()))
                .orElseThrow(() -> ApiException.bad("Imagem inválida."));
        if (!image.owner.id.equals(company.id))
            throw ApiException.forbidden();
        Advantage v = id == null ? new Advantage() : advantages.lock(id).orElseThrow(ApiException::missing);
        if (id != null && !v.company.id.equals(company.id))
            throw ApiException.forbidden();
        v.company = company;
        v.name = input.name().trim();
        v.description = input.description().trim();
        v.photo = input.photo();
        v.category = input.category();
        v.cost = input.cost();
        v.active = input.active();
        advantages.save(v);
        return DomainMapper.advantage(v);
    }

    public void delete(String id) {
        Partner p = identity.requirePartner("EMPRESA");
        identity.locked(p.id);
        Advantage v = advantages.lock(id).orElseThrow(ApiException::missing);
        if (!v.company.id.equals(p.id))
            throw ApiException.forbidden();
        v.active = false;
    }
}
