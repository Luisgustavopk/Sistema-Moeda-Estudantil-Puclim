package br.pucminas.puclim.service;

import br.pucminas.puclim.dto.request.LoginRequest;
import br.pucminas.puclim.dto.request.TeacherImportRowRequest;
import br.pucminas.puclim.dto.response.TeacherImportErrorResponse;
import br.pucminas.puclim.dto.response.TeacherImportResponse;
import br.pucminas.puclim.dto.response.TeacherInitialAccessResponse;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.Teacher;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.PartnerRepository;
import br.pucminas.puclim.repository.TeacherRepository;

@Service
public class TeacherImportService {
    private final AccountService identity;
    private final AccountRepository accounts;
    private final TeacherRepository teachers;
    private final PartnerRepository partners;
    private final FinancialService finance;
    private final TransactionTemplate tx;
    private final SecureRandom random = new SecureRandom();
    private final ZoneId zone;

    public TeacherImportService(AccountService i, AccountRepository a, TeacherRepository t, PartnerRepository p,
            FinancialService f, PlatformTransactionManager m,
            @org.springframework.beans.factory.annotation.Value("${puclim.semester.zone}") String z) {
        identity = i;
        accounts = a;
        teachers = t;
        partners = p;
        finance = f;
        tx = new TransactionTemplate(m);
        zone = ZoneId.of(z);
    }

    public List<TeacherImportRowRequest> preview(MultipartFile file) throws IOException {
        identity.requirePartner("ENSINO");
        if (file.isEmpty() || file.getSize() > 1024 * 1024)
            throw ApiException.bad("Envie um CSV de até 1 MB.");
        String content = new String(file.getBytes(), StandardCharsets.UTF_8).replaceFirst("^\\uFEFF", "");
        String header = content.lines().findFirst().orElse("");
        char delimiter = header.contains(";") ? ';' : ',';
        var format = CSVFormat.DEFAULT.builder().setDelimiter(delimiter).setHeader().setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true).setTrim(true).get();
        List<TeacherImportRowRequest> rows = new ArrayList<>();
        Set<String> cpfs = new HashSet<>(), emails = new HashSet<>(), logins = new HashSet<>();
        try (CSVParser parser = CSVParser.parse(content, format)) {
            if (!parser.getHeaderNames().containsAll(List.of("nome", "cpf", "departamento", "email", "login")))
                throw ApiException.bad("Cabeçalho obrigatório: nome, cpf, departamento, email e login.");
            for (CSVRecord r : parser) {
                if (rows.size() >= 500)
                    throw ApiException.bad("Importe até 500 professores por arquivo.");
                int line = (int) r.getRecordNumber() + 1;
                if (!r.isConsistent()) {
                    rows.add(new TeacherImportRowRequest(line, "", "", "", "", "", "Número de colunas diferente do cabeçalho."));
                    continue;
                }
                TeacherImportRowRequest row = new TeacherImportRowRequest(line, r.get("nome"), r.get("cpf"), r.get("departamento"), r.get("email"),
                        r.get("login"), null);
                String error = validate(row);
                if (error == null) {
                    String cpf = IdentityValidation.cpf(row.cpf()), email = IdentityValidation.normalize(row.email()),
                            login = IdentityValidation.normalize(row.login());
                    if (cpfs.contains(cpf) || emails.contains(email) || logins.contains(login))
                        error = "CPF, e-mail ou login repetido neste arquivo.";
                    else {
                        cpfs.add(cpf);
                        emails.add(email);
                        logins.add(login);
                    }
                }
                rows.add(new TeacherImportRowRequest(line, row.name(), row.cpf(), row.department(), row.email(), row.login(), error));
            }
        } catch (UncheckedIOException | IllegalArgumentException e) {
            throw ApiException.bad("CSV inválido. Confira as aspas e colunas.");
        }
        if (rows.isEmpty())
            throw ApiException.bad("Adicione pelo menos um professor.");
        return rows;
    }

    private String validate(TeacherImportRowRequest row) {
        try {
            IdentityValidation.cpf(row.cpf());
        } catch (ApiException e) {
            return e.getMessage();
        }
        if (row.name() == null || row.name().trim().length() < 3 || row.name().length() > 100)
            return "Nome inválido.";
        if (row.department() == null || row.department().isBlank() || row.department().length() > 100)
            return "Departamento inválido.";
        if (row.email() == null || row.email().length() > 254 || !row.email().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            return "E-mail inválido.";
        if (row.login() == null || !row.login().matches("[a-zA-Z0-9._-]{3,40}"))
            return "LoginRequest inválido.";
        if (teachers.existsByCpf(IdentityValidation.cpf(row.cpf()))
                || accounts.existsByEmail(IdentityValidation.normalize(row.email()))
                || accounts.existsByLogin(IdentityValidation.normalize(row.login())))
            return "CPF, e-mail ou login já cadastrado.";
        return null;
    }

    public TeacherImportResponse importRows(List<TeacherImportRowRequest> rows) {
        String institution = identity.requirePartner("ENSINO").id;
        List<TeacherImportErrorResponse> errors = new ArrayList<>();
        List<TeacherInitialAccessResponse> access = new ArrayList<>();
        for (TeacherImportRowRequest row : rows) {
            String error = row.error() != null && !row.error().isBlank() ? row.error() : validate(row);
            if (error != null) {
                errors.add(new TeacherImportErrorResponse(row.line(), error));
                continue;
            }
            try {
                TeacherInitialAccessResponse result = tx.execute(status -> {
                    Account institutionAccount = identity.locked(institution);
                    if (!institutionAccount.active)
                        throw ApiException.forbidden();
                    String repeated = validate(row);
                    if (repeated != null)
                        throw new ApiException(409, repeated);
                    byte[] secret = new byte[24];
                    random.nextBytes(secret);
                    String password = Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
                    Account a = identity.create(row.name(), row.email(), row.login(), password, "PROFESSOR");
                    a.mustChangePassword = true;
                    Teacher t = new Teacher();
                    t.account = a;
                    t.cpf = IdentityValidation.cpf(row.cpf());
                    t.department = row.department().trim();
                    t.institution = partners.findById(institution).orElseThrow();
                    teachers.saveAndFlush(t);
                    LocalDate date = LocalDate.now(zone);
                    finance.creditSemester(a.id, date.getYear() + "-" + (date.getMonthValue() <= 6 ? 1 : 2));
                    return new TeacherInitialAccessResponse(a.name, a.login, password);
                });
                access.add(result);
            } catch (ApiException e) {
                errors.add(new TeacherImportErrorResponse(row.line(), e.getMessage()));
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                errors.add(new TeacherImportErrorResponse(row.line(), "CPF, e-mail ou login já cadastrado."));
            }
        }
        return new TeacherImportResponse(access.size(), errors, access);
    }
}
