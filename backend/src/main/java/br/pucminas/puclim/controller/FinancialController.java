package br.pucminas.puclim.controller;

import br.pucminas.puclim.dto.request.TransferRequest;
import br.pucminas.puclim.dto.response.CouponResponse;
import br.pucminas.puclim.dto.response.TransactionResponse;

import br.pucminas.puclim.dto.response.HistoryPageResponse;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.service.FinancialService;
import br.pucminas.puclim.service.HistoryService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class FinancialController {
    private final FinancialService finance;
    private final HistoryService history;

    public FinancialController(FinancialService f, HistoryService history) {
        finance = f;
        this.history = history;
    }

    @PostMapping("/transferencias")
    TransactionResponse transfer(@Valid @RequestBody TransferRequest input,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return finance.transfer(input, key);
    }

    @PostMapping("/vantagens/{id}/resgates")
    CouponResponse redeem(@PathVariable String id, @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return finance.redeem(id, key);
    }

    @GetMapping("/cupons")
    HistoryPageResponse<CouponResponse, HistoryService.CouponSummary> coupons(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "") String status) {
        return history.coupons(page, size, q, status);
    }

    @GetMapping("/cupons/{code}")
    CouponResponse check(@PathVariable String code) {
        return finance.checkCoupon(code);
    }

    @PostMapping("/cupons/{code}/utilizar")
    CouponResponse use(@PathVariable String code) {
        return finance.useCoupon(code);
    }
}
