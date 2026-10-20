package br.pucminas.puclim.service;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import br.pucminas.puclim.dto.request.GamificationRequests;
import br.pucminas.puclim.dto.response.GamificationResponses;
import br.pucminas.puclim.entity.*;
import br.pucminas.puclim.repository.*;
import br.pucminas.puclim.exception.ApiException;

@Service
@Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class CommunityService {
    private final GamificationRepository db;
    private final AccountService identity;
    private final FinancialService finance;
    private final CouponRepository coupons;
    private final ProgressionService progression;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    public CommunityService(GamificationRepository db,AccountService identity,FinancialService finance,CouponRepository coupons,ProgressionService progression,ApplicationEventPublisher events,Clock clock) {
        this.db=db;this.identity=identity;this.finance=finance;this.coupons=coupons;this.progression=progression;this.events=events;this.clock=clock;
    }
    public List<GamificationResponses.Beneficiary> beneficiaries() {
        identity.require("ALUNO");
        return db.list(Partner.class,"select p from Partner p where p.kind='BENEFICIARIA' and p.account.active=true order by p.account.name").stream().map(p->new GamificationResponses.Beneficiary(p.id,p.account.name)).toList();
    }
    public GamificationResponses.Donation donate(String code,GamificationRequests.Donation input) {
        Account a=identity.require("ALUNO");finance.lockAccounts(a.id,input.beneficiaryId());
        Partner beneficiary=db.get(Partner.class,input.beneficiaryId());
        if(!beneficiary.kind.equals("BENEFICIARIA")||!beneficiary.account.active) throw ApiException.bad("Instituição beneficiária inválida.");
        Coupon c=coupons.lockByCode(code.toUpperCase(Locale.ROOT)).orElseThrow(ApiException::missing);
        if(!c.student.id.equals(a.id)) throw ApiException.forbidden();
        CouponDonation old=db.first(CouponDonation.class,"select d from CouponDonation d where d.coupon.id=:c","c",c.id).orElse(null);
        if(old!=null) {if(!old.beneficiary.id.equals(beneficiary.id)) throw new ApiException(409,"Cupom já doado a outra instituição.");return donationView(old);}
        if(!c.status.equals("VALIDO")) throw new ApiException(409,"Somente cupons válidos podem ser doados.");
        c.status="DOADO";
        CouponDonation d=new CouponDonation();d.coupon=c;d.beneficiary=beneficiary;d.date=clock.instant();db.save(d);
        finance.entry(a,"DOACAO",0,"Doação: "+c.advantageName,beneficiary.account.name,null,d.id);
        progression.notify(a,"DOACAO","Vantagem doada",c.advantageName+" foi doada para "+beneficiary.account.name,d.id);
        progression.notify(beneficiary.account,"DOACAO_RECEBIDA","Vantagem recebida",c.advantageName+" de "+c.companyName,d.id);
        progression.notify(c.company.account,"DOACAO","Cupom doado",c.code+": destinado à instituição "+beneficiary.account.name,d.id);
        events.publishEvent(new GamificationEvents.AdvantageDonated(a.id,c.id));return donationView(d);
    }
    private GamificationResponses.Donation donationView(CouponDonation d) {return new GamificationResponses.Donation(d.id,d.coupon.advantageName,d.coupon.companyName,d.beneficiary.account.name,d.date);}
    public List<GamificationResponses.Donation> donations() {
        Account a=identity.current();
        if(a.role.equals("ALUNO")) return db.list(CouponDonation.class,"select d from CouponDonation d where d.coupon.student.id=:s order by d.date desc","s",a.id).stream().map(this::donationView).toList();
        Partner p=identity.requirePartner("BENEFICIARIA");
        return db.list(CouponDonation.class,"select d from CouponDonation d where d.beneficiary.id=:b order by d.date desc","b",p.id).stream().map(this::donationView).toList();
    }
    public List<GamificationResponses.Challenge> challenges() {
        Partner p=identity.requirePartner("EMPRESA");
        return db.list(SponsoredChallenge.class,"select c from SponsoredChallenge c where c.company.id=:c order by c.date desc","c",p.id).stream().map(this::challengeView).toList();
    }
    public GamificationResponses.Challenge saveChallenge(String id,GamificationRequests.Challenge input) {
        Partner p=identity.requirePartner("EMPRESA");identity.locked(p.id);
        if(input.budget()<Math.multiplyExact(input.reward(),input.capacity())) throw ApiException.bad("Orçamento deve cobrir recompensa × vagas.");
        if(!input.deadline().isAfter(clock.instant())) throw ApiException.bad("Prazo deve estar no futuro.");
        SponsoredChallenge c;
        if(id==null) {c=new SponsoredChallenge();c.company=p;} else {c=ownedChallenge(id,p);if(!Set.of("PROPOSTA","PENDENTE_FINANCIAMENTO").contains(c.status)) throw new ApiException(409,"Proposta não pode ser editada neste estado.");}
        c.title=input.title().trim();c.description=input.description().trim();c.reward=input.reward();c.capacity=input.capacity();c.budget=input.budget();c.deadline=input.deadline();if(id==null)db.save(c);return challengeView(c);
    }
    public GamificationResponses.Challenge challengeState(String id,String action) {
        Partner p=identity.requirePartner("EMPRESA");identity.locked(p.id);SponsoredChallenge c=ownedChallenge(id,p);
        switch(action) {
            case "enviar" -> {if(!c.status.equals("PROPOSTA") || !c.deadline.isAfter(clock.instant())) throw new ApiException(409,"Proposta não pode ser enviada.");c.status="PENDENTE_FINANCIAMENTO";}
            case "cancelar" -> {if(!Set.of("PROPOSTA","PENDENTE_FINANCIAMENTO","CANCELADO").contains(c.status)) throw new ApiException(409,"Desafio não pode ser cancelado.");c.status="CANCELADO";}
            case "publicar" -> throw new ApiException(409,"Publicação indisponível: a origem financeira do patrocínio ainda precisa ser definida e autorizada.");
            default -> throw ApiException.bad("Ação inválida.");
        }
        return challengeView(c);
    }
    private SponsoredChallenge ownedChallenge(String id,Partner p) {SponsoredChallenge c=db.lock(SponsoredChallenge.class,id);if(!c.company.id.equals(p.id)) throw ApiException.forbidden();return c;}
    private GamificationResponses.Challenge challengeView(SponsoredChallenge c) {return new GamificationResponses.Challenge(c.id,c.title,c.description,c.reward,c.capacity,c.budget,c.deadline,c.status,c.company.account.name);}
}
