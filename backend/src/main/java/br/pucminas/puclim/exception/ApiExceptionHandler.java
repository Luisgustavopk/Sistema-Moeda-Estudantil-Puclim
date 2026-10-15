package br.pucminas.puclim.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, String>> api(ApiException e) {
        return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
    }
    @ExceptionHandler({MethodArgumentTypeMismatchException.class, ConstraintViolationException.class,
            MissingRequestHeaderException.class, IllegalArgumentException.class})
    ResponseEntity<Map<String, String>> bad(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Parâmetro inválido na requisição."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> unexpected(Exception e) {
        return ResponseEntity.internalServerError().body(Map.of("message", "Não foi possível concluir a solicitação."));
    }
}