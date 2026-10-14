package br.pucminas.puclim.unit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.service.IdentityValidation;

class CpfValidationTest {
    @Test
    void normalizesAValidCpf() {
        assertEquals("39053344705", IdentityValidation.cpf("390.533.447-05"));
    }

    @Test
    void rejectsIncorrectCheckDigitsAndRepeatedNumbers() {
        for (String cpf : new String[] { "11111111111", "39053344706", "123", "", "00000000000" })
            assertThrows(ApiException.class, () -> IdentityValidation.cpf(cpf));
    }
}
