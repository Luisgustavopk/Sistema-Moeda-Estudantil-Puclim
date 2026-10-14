package br.pucminas.puclim.mapper;

import br.pucminas.puclim.dto.response.AdvantageResponse;
import br.pucminas.puclim.dto.response.CouponResponse;
import br.pucminas.puclim.dto.response.TransactionResponse;

import br.pucminas.puclim.entity.Advantage;
import br.pucminas.puclim.entity.Coupon;
import br.pucminas.puclim.entity.LedgerEntry;

public final class DomainMapper {
    public static TransactionResponse transaction(LedgerEntry e) {
        return new TransactionResponse(e.id, e.date, e.kind, e.amount, e.description, e.counterpart, e.reason);
    }

    public static AdvantageResponse advantage(Advantage v) {
        return new AdvantageResponse(v.id, v.company.id, v.company.account.name, v.name, v.description, v.photo, v.category,
                v.cost, v.active);
    }

    public static CouponResponse coupon(Coupon c) {
        return new CouponResponse(c.id, c.advantage.id, c.code, c.student.id, c.studentName, c.company.id, c.companyName,
                c.advantageName, c.cost, c.date, c.status, c.usedAt);
    }
}
