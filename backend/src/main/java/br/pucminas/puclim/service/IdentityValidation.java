package br.pucminas.puclim.service;

import java.util.Locale;

import br.pucminas.puclim.exception.ApiException;

public final class IdentityValidation {
    public static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    public static String cpf(String value) {
        String digits = value == null ? "" : value.replaceAll("\\D", "");
        if (!digits.matches("[0-9]{11}") || digits.chars().distinct().count() == 1)
            throw ApiException.bad("CPF inválido.");
        for (int position = 9; position < 11; position++) {
            int sum = 0;
            for (int i = 0; i < position; i++)
                sum += (digits.charAt(i) - '0') * (position + 1 - i);
            int check = (sum * 10) % 11;
            if (check == 10)
                check = 0;
            if (check != digits.charAt(position) - '0')
                throw ApiException.bad("CPF inválido.");
        }
        return digits;
    }

    public static String cnpj(String value) {
        String digits = value.replaceAll("\\D", "");
        if (!digits.matches("[0-9]{14}") || digits.chars().distinct().count() == 1)
            throw ApiException.bad("CNPJ inválido.");
        for (int position = 12; position < 14; position++) {
            int sum = 0, weight = 2;
            for (int i = position - 1; i >= 0; i--) {
                sum += (digits.charAt(i) - '0') * weight;
                weight = weight == 9 ? 2 : weight + 1;
            }
            int remainder = sum % 11, check = remainder < 2 ? 0 : 11 - remainder;
            if (check != digits.charAt(position) - '0')
                throw ApiException.bad("CNPJ inválido.");
        }
        return digits;
    }
}
