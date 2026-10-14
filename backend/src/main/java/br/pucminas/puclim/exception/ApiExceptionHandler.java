package br.pucminas.puclim.exception;

import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException e) {
        return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest()
                .body(Map.of("message",
                        e.getBindingResult().getFieldErrors().stream()
                                .map(v -> v.getField() + ": " + v.getDefaultMessage()).reduce((a, b) -> a + "; " + b)
                                .orElse("Dados inválidos.")));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict() {
        return ResponseEntity.status(409).body(
                Map.of("message", "CPF, CNPJ, login ou e-mail já cadastrado, ou conflito com um registro vinculado."));
    }

    @ExceptionHandler({ HttpMessageNotReadableException.class, IllegalArgumentException.class })
    ResponseEntity<?> malformed() {
        return ResponseEntity.badRequest().body(Map.of("message", "Dados da solicitação inválidos."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> upload() {
        return ResponseEntity.status(413).body(Map.of("message", "Arquivo acima do tamanho permitido."));
    }

    @ExceptionHandler({org.springframework.dao.CannotAcquireLockException.class, org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    ResponseEntity<?> busy() {
        return ResponseEntity.status(409)
                .body(Map.of("message", "Operação concorrente. Tente novamente com a mesma chave de solicitação."));
    }
}
