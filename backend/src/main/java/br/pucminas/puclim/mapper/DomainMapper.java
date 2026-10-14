package br.pucminas.puclim.mapper;

import br.pucminas.puclim.dto.response.Responses.*;
import br.pucminas.puclim.dto.response.Responses.AdvantageView;
import br.pucminas.puclim.dto.response.Responses.CouponView;
import br.pucminas.puclim.dto.response.Responses.Transaction;
import br.pucminas.puclim.entity.Advantage;
import br.pucminas.puclim.entity.Coupon;
import br.pucminas.puclim.entity.LedgerEntry;

public final class DomainMapper {
    public static Transaction transaction(LedgerEntry e) {
        return new Transaction(e.id, e.date, e.kind, e.amount, e.description, e.counterpart, e.reason);
    }

    public static AdvantageView advantage(Advantage v) {
        return new AdvantageView(v.id, v.company.id, v.company.account.name, v.name, v.description, v.photo, v.category,
                v.cost, v.active);
    }

    public static CouponView coupon(Coupon c) {
        return new CouponView(c.id, c.advantage.id, c.code, c.student.id, c.studentName, c.company.id, c.companyName,
                c.advantageName, c.cost, c.date, c.status, c.usedAt);
    }
}
