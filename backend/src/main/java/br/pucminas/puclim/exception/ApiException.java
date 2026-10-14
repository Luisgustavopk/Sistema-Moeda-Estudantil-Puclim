package br.pucminas.puclim.exception;

public class ApiException extends RuntimeException {
    public final int status;

    public ApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public static ApiException bad(String message) {
        return new ApiException(400, message);
    }

    public static ApiException missing() {
        return new ApiException(404, "Registro não encontrado.");
    }

    public static ApiException forbidden() {
        return new ApiException(403, "Você não tem permissão para esta operação.");
    }
}
