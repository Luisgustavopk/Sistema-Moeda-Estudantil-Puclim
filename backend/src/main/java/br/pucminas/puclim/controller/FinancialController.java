package br.pucminas.puclim.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.dto.request.Requests.Transfer;
import br.pucminas.puclim.dto.response.Responses.*;
import br.pucminas.puclim.dto.response.Responses.CouponView;
import br.pucminas.puclim.dto.response.Responses.Transaction;
import br.pucminas.puclim.service.FinancialService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class FinancialController {
    private final FinancialService finance;

    public FinancialController(FinancialService f) {
        finance = f;
    }

    @PostMapping("/transferencias")
    Transaction transfer(@Valid @RequestBody Transfer input,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return finance.transfer(input, key);
    }

    @PostMapping("/vantagens/{id}/resgates")
    CouponView redeem(@PathVariable String id, @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return finance.redeem(id, key);
    }

    @GetMapping("/cupons")
    List<CouponView> coupons() {
        return finance.coupons();
    }

    @GetMapping("/cupons/{code}")
    CouponView check(@PathVariable String code) {
        return finance.checkCoupon(code);
    }

    @PostMapping("/cupons/{code}/utilizar")
    CouponView use(@PathVariable String code) {
        return finance.useCoupon(code);
    }
}
