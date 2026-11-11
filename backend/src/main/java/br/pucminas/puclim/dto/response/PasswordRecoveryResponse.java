package br.pucminas.puclim.dto.response;

public record PasswordRecoveryResponse(String message, long resendAfterSeconds) {}
