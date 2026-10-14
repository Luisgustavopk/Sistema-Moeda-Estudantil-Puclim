package br.pucminas.puclim.unit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.service.IdentityValidation;

class CnpjValidationTest {
    @Test
    void normalizesAValidCnpj() {
        assertEquals("11222333000181", IdentityValidation.cnpj("11.222.333/0001-81"));
    }

    @Test
    void rejectsIncorrectCheckDigits() {
        assertThrows(ApiException.class, () -> IdentityValidation.cnpj("11222333000182"));
    }
}
