package br.pucminas.puclim.controller;

import br.pucminas.puclim.dto.request.AdvantageRequest;
import br.pucminas.puclim.dto.response.AdvantageResponse;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.service.AdvantageService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/vantagens")
public class AdvantageController {
    private final AdvantageService advantages;

    public AdvantageController(AdvantageService a) {
        advantages = a;
    }

    @GetMapping
    List<AdvantageResponse> list(@RequestParam(defaultValue = "false") boolean minhas) {
        return advantages.list(minhas);
    }

    @PostMapping
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    AdvantageResponse create(@Valid @RequestBody AdvantageRequest input) {
        return advantages.save(null, input);
    }

    @PutMapping("/{id}")
    AdvantageResponse update(@PathVariable String id, @Valid @RequestBody AdvantageRequest input) {
        return advantages.save(id, input);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) {
        advantages.delete(id);
    }
}
