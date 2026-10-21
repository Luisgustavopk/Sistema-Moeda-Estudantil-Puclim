package br.pucminas.puclim.service;

import br.pucminas.puclim.dto.request.LoginRequest;
import br.pucminas.puclim.dto.request.PartnerRegistrationRequest;
import br.pucminas.puclim.dto.request.PasswordChangeRequest;
import br.pucminas.puclim.dto.request.ProfileUpdateRequest;
import br.pucminas.puclim.dto.request.StudentRegistrationRequest;
import br.pucminas.puclim.dto.response.AccountResponse;
import br.pucminas.puclim.dto.response.InstitutionResponse;
import br.pucminas.puclim.dto.response.StudentSummaryResponse;
import br.pucminas.puclim.dto.response.TeacherSummaryResponse;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.Partner;
import br.pucminas.puclim.entity.Student;
import br.pucminas.puclim.entity.Teacher;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.AccountRepository;
import br.pucminas.puclim.repository.AdvantageRepository;
import br.pucminas.puclim.repository.PartnerRepository;
import br.pucminas.puclim.repository.StudentRepository;
import br.pucminas.puclim.repository.TeacherRepository;
import br.pucminas.puclim.security.SessionPrincipal;

@Service
@Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class AccountService {
  @jakarta.persistence.PersistenceContext
  private jakarta.persistence.EntityManager entityManager;
  private final AccountRepository accounts;
  private final StudentRepository students;
  private final TeacherRepository teachers;
  private final PartnerRepository partners;
  private final AdvantageRepository advantages;
  private final PasswordEncoder encoder;

  public AccountService(AccountRepository a, StudentRepository s, TeacherRepository t, PartnerRepository p,
      AdvantageRepository v, PasswordEncoder e) {
    accounts = a;
    students = s;
    teachers = t;
    partners = p;
    advantages = v;
    encoder = e;
  }

  public Account current() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof SessionPrincipal principal))
      throw new ApiException(401, "Entre no sistema.");
    Account a = accounts.findById(principal.id()).orElseThrow(() -> new ApiException(401, "Sessão encerrada."));
    if (!a.active || a.credentialVersion != principal.credentialVersion())
      throw new ApiException(401, "Sessão encerrada. Entre novamente.");
    return a;
  }

  public Account require(String role) {
    Account a = current();
    if (!a.role.equals(role))
      throw ApiException.forbidden();
    return a;
  }

  public Partner requirePartner(String kind) {
    Account a = require("EMPRESA");
    Partner p = partners.findById(a.id).orElseThrow(ApiException::missing);
    if (!p.kind.equals(kind))
      throw ApiException.forbidden();
    return p;
  }

  public Account locked(String id) {
  accounts.lockId(id).orElseThrow(ApiException::missing);
  Account account=accounts.findById(id).orElseThrow(ApiException::missing);
  entityManager.refresh(account);
  return account;
 }
 public Account authenticate(LoginRequest input) {
    String login = IdentityValidation.normalize(input.login());
    Account a = accounts.findByLoginOrEmail(login, login).orElse(null);
    // Always perform a password verification to reduce account enumeration through
    // timing.
    String hash = a == null ? dummyHash : a.passwordHash;
    boolean valid = encoder.matches(input.password(), hash);
    if (a == null || !valid || !a.active)
      throw new ApiException(401, "Login ou senha inválidos.");
    return a;
  }

  private String dummyHash;

  @jakarta.annotation.PostConstruct
  void init() {
    dummyHash = encoder.encode(UUID.randomUUID().toString());
  }

  public Account create(String name, String email, String login, String password, String role) {
    Account a = new Account();
    a.name = name.trim();
    a.email = IdentityValidation.normalize(email);
    a.login = IdentityValidation.normalize(login);
    if (accounts.existsByEmail(a.email) || accounts.existsByLogin(a.login))
      throw new ApiException(409, "Login ou e-mail já cadastrado.");
    a.passwordHash = encoder.encode(password);
    a.role = role;
    return accounts.save(a);
  }

  public AccountResponse registerStudent(StudentRegistrationRequest input) {
    Partner institution = partners.findById(input.institutionId())
        .orElseThrow(() -> ApiException.bad("Instituição inválida."));
    // Serialize institutional membership with deactivation so no new student can
    // attach to an inactive partner.
    Account institutionAccount = locked(institution.id);
    if (!institution.kind.equals("ENSINO") || !institutionAccount.active)
      throw ApiException.bad("Instituição inválida.");
    String cpf = IdentityValidation.cpf(input.cpf());
    if (students.existsByCpf(cpf))
      throw new ApiException(409, "CPF já cadastrado.");
    Account a = create(input.name(), input.email(), input.login(), input.password(), "ALUNO");
    Student s = new Student();
    s.account = a;
    s.cpf = cpf;
    s.rg = input.rg() == null || input.rg().isBlank() ? null : input.rg().trim();
    if (s.rg != null && s.rg.length() < 3)
      throw ApiException.bad("Informe um RG válido ou deixe o campo vazio.");
    s.address = input.address().trim();
    s.course = input.course().trim();
    s.institution = institution;
    students.saveAndFlush(s);
    return view(a);
  }

  public AccountResponse registerPartner(PartnerRegistrationRequest input) {
    String cnpj = IdentityValidation.cnpj(input.cnpj());
    if (partners.existsByCnpj(cnpj))
      throw new ApiException(409, "CNPJ já cadastrado.");
    Account a = create(input.name(), input.email(), input.login(), input.password(), "EMPRESA");
    Partner p = new Partner();
    p.account = a;
    p.cnpj = cnpj;
    p.kind = input.partnerKind();
    p.phone = input.phone().trim();
    p.description = input.description().trim();
    partners.saveAndFlush(p);
    return view(a);
  }

  public AccountResponse view(Account a) {
    Student s = a.role.equals("ALUNO") ? students.findById(a.id).orElseThrow(ApiException::missing) : null;
    Teacher t = a.role.equals("PROFESSOR") ? teachers.findById(a.id).orElseThrow(ApiException::missing) : null;
    Partner p = a.role.equals("EMPRESA") ? partners.findById(a.id).orElseThrow(ApiException::missing) : null;
    return new AccountResponse(a.id, a.role, a.name, a.email, a.login, a.balance, a.active,
        s != null ? s.cpf : t != null ? t.cpf : null,
        s == null ? null : s.rg, s == null ? null : s.address, s == null ? null : s.course,
        s != null ? s.institution.id : t != null ? t.institution.id : null,
        t == null ? null : t.department, p == null ? null : p.cnpj, p == null ? null : p.phone,
        p == null ? null : p.description, p == null ? null : p.kind, a.mustChangePassword);
  }

  public AccountResponse profile(ProfileUpdateRequest input) {
    Account a = locked(current().id);
    String email = IdentityValidation.normalize(input.email());
    if (!email.equals(a.email) && accounts.existsByEmail(email))
      throw new ApiException(409, "E-mail já cadastrado.");
    if (a.role.equals("ALUNO")) {
      if (input.address() == null || input.address().trim().length() < 8 || input.course() == null
          || input.course().trim().length() < 2)
        throw ApiException.bad("Endereço e curso são obrigatórios.");
      Student s = students.findById(a.id).orElseThrow(ApiException::missing);
      s.address = input.address().trim();
      s.course = input.course().trim();
    } else if (a.role.equals("EMPRESA")) {
      if (input.phone() == null || input.phone().trim().length() < 10)
        throw ApiException.bad("Telefone é obrigatório.");
      Partner p = partners.findById(a.id).orElseThrow(ApiException::missing);
      p.phone = input.phone().trim();
      p.description = input.description() == null ? "" : input.description().trim();
    }
    a.name = input.name().trim();
    a.email = email;
    return view(a);
  }

  public Account changePassword(PasswordChangeRequest input) {
    Account a = locked(current().id);
    if (!encoder.matches(input.currentPassword(), a.passwordHash))
      throw ApiException.bad("Senha atual inválida.");
    a.passwordHash = encoder.encode(input.password());
    a.mustChangePassword = false;
    a.credentialVersion++;
    return a;
  }

  public void deactivate() {
    Account a = locked(current().id);
    if (a.role.equals("EMPRESA")) {
      Partner p = partners.findById(a.id).orElseThrow(ApiException::missing);
      if (p.kind.equals("ENSINO") && (students.existsByInstitutionId(a.id) || teachers.existsByInstitutionId(a.id)))
        throw new ApiException(409, "Instituição com alunos ou professores vinculados não pode ser excluída.");
      advantages.own(a.id).forEach(v -> v.active = false);
    }
    a.active = false;
    a.credentialVersion++;
  }

  @Transactional(readOnly = true)
  public List<InstitutionResponse> institutions() {
    return partners.institutions().stream().map(p -> new InstitutionResponse(p.id, p.account.name)).toList();
  }

  @Transactional(readOnly = true)
  public List<StudentSummaryResponse> students() {
    require("PROFESSOR");
    return students.selectable().stream()
        .map(s -> new StudentSummaryResponse(s.id, s.account.name, s.course, s.institution.account.name)).toList();
  }

  @Transactional(readOnly = true)
  public List<TeacherSummaryResponse> teachers() {
    Partner p = requirePartner("ENSINO");
    return teachers.forInstitution(p.id).stream()
        .map(t -> new TeacherSummaryResponse(t.id, t.account.name, t.account.login, t.department, t.account.email)).toList();
  }
}
