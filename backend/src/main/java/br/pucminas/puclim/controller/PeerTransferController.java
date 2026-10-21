package br.pucminas.puclim.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.dto.request.PeerTransferRequests.Policy;
import br.pucminas.puclim.dto.request.PeerTransferRequests.Review;
import br.pucminas.puclim.dto.request.PeerTransferRequests.Transfer;
import br.pucminas.puclim.dto.response.PeerTransferResponses.Overview;
import br.pucminas.puclim.dto.response.PeerTransferResponses.Request;
import br.pucminas.puclim.service.PeerTransferService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/transferencias-alunos")
public class PeerTransferController {
    private final PeerTransferService service;

    public PeerTransferController(PeerTransferService service) {
        this.service = service;
    }

    @GetMapping
    Overview overview() {
        return service.overview();
    }

    @PutMapping("/criterios")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void policy(@Valid @RequestBody Policy input) {
        service.policy(input);
    }

    @PutMapping("/vinculos/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void link(@PathVariable String studentId) {
        service.link(studentId, true);
    }

    @DeleteMapping("/vinculos/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unlink(@PathVariable String studentId) {
        service.link(studentId, false);
    }

    @PostMapping
    Request request(@Valid @RequestBody Transfer input,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return service.request(input, key);
    }

    @PostMapping("/{id}/analise")
    Request review(@PathVariable String id, @Valid @RequestBody Review input) {
        return service.review(id, input);
    }
}
