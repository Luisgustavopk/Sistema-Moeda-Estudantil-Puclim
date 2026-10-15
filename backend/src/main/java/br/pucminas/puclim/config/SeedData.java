package br.pucminas.puclim.config;

import br.pucminas.puclim.entity.*;
import br.pucminas.puclim.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SeedData {
    @Bean CommandLineRunner seed(AccountRepository accounts, AdvantageRepository advantages, LedgerEntryRepository ledger, PasswordEncoder encoder) {
        return args -> {
            if (accounts.count() > 0) return;
            Account institution = account(accounts, encoder, "institution", Account.Role.EMPRESA, "ENSINO", "PUC Minas", "instituicao@puclim.demo", "instituicao", null);
            Account company = account(accounts, encoder, "company", Account.Role.EMPRESA, "EMPRESA", "Cantina Central", "empresa@puclim.demo", "empresa", null);
            account(accounts, encoder, "books", Account.Role.EMPRESA, "EMPRESA", "Livraria Entrelinhas", "livraria@puclim.demo", "livraria", null);
            Account teacher = account(accounts, encoder, "teacher", Account.Role.PROFESSOR, null, "Helena Prado", "professor@puclim.demo", "professor", institution.id);
            teacher.balance = 3000; accounts.save(teacher); entry(ledger, teacher, "COTA", 1000, "Cota semestral"); entry(ledger, teacher, "COTA", 1000, "Cota semestral anterior"); entry(ledger, teacher, "COTA", 1000, "Cota semestral anterior");
            Account student = account(accounts, encoder, "student", Account.Role.ALUNO, null, "Mariana Oliveira", "aluno@puclim.demo", "aluno", institution.id); student.balance = 1240; accounts.save(student);
            advantage(advantages, company, "coffee", "Café & boas ideias", 60, "Alimentação", "/images/coffee.jpg");
            advantage(advantages, company, "lunch", "Uma pausa com sabor", 180, "Alimentação", "/images/lunch.jpg");
            advantage(advantages, company, "event", "Conexões que inspiram", 320, "Eventos", "/images/event.jpg");
            advantage(advantages, company, "books-offer", "Sua próxima descoberta", 250, "Material", "/images/books.jpg");
            advantage(advantages, company, "stationery", "Ideias no papel", 140, "Material", "/images/stationery.jpg");
            advantage(advantages, company, "discount", "Mais conhecimento, menos custo", 1500, "Descontos", "/images/books.jpg");
        };
    }
    private Account account(AccountRepository r, PasswordEncoder e, String id, Account.Role role, String kind, String name, String email, String login, String institution) { Account a=new Account();a.id=id;a.role=role;a.partnerKind=kind;a.name=name;a.email=email;a.login=login;a.passwordHash=e.encode("Puclim@2026");a.institutionId=institution;return r.save(a); }
    private void entry(LedgerEntryRepository r, Account a, String kind, long amount, String description) { LedgerEntry e=new LedgerEntry();e.account=a;e.kind=kind;e.amount=amount;e.description=description;r.save(e); }
    private Advantage advantage(AdvantageRepository r, Account c, String id, String name, long cost, String category, String photo) { Advantage a=new Advantage();a.id=id;a.company=c;a.name=name;a.description="Vantagem disponível para a comunidade acadêmica.";a.cost=cost;a.category=category;a.photo=photo;return r.save(a); }
}