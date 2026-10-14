package br.pucminas.puclim.support;

import java.security.SecureRandom;
import java.util.concurrent.atomic.AtomicLong;

public final class TestDocuments {
    private static final AtomicLong SEQUENCE = new AtomicLong(new SecureRandom().nextInt(800_000_000) + 100_000_000L);

    private TestDocuments() {
    }

    public static String cpf() {
        return checks(String.format("%09d", SEQUENCE.getAndIncrement() % 1_000_000_000), false);
    }

    public static String cnpj() {
        return checks(String.format("%012d", SEQUENCE.getAndIncrement()), true);
    }

    private static String checks(String base, boolean cnpj) {
        StringBuilder digits = new StringBuilder(base);
        for (int round = 0; round < 2; round++) {
            int sum = 0;
            if (cnpj) {
                int weight = 2;
                for (int index = digits.length() - 1; index >= 0; index--) {
                    sum += (digits.charAt(index) - '0') * weight;
                    weight = weight == 9 ? 2 : weight + 1;
                }
                digits.append(sum % 11 < 2 ? 0 : 11 - sum % 11);
            } else {
                for (int index = 0; index < digits.length(); index++)
                    sum += (digits.charAt(index) - '0') * (digits.length() + 1 - index);
                int check = (sum * 10) % 11;
                digits.append(check == 10 ? 0 : check);
            }
        }
        return digits.toString();
    }
}
