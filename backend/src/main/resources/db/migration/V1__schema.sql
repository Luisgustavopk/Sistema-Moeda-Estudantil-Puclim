create table accounts (
 id varchar(36) not null primary key, role varchar(12) not null, partner_kind varchar(12), name varchar(180) not null,
 email varchar(180) not null, login varchar(80) not null, password_hash varchar(255) not null, active boolean not null,
 balance bigint not null, version bigint not null, cpf varchar(255), rg varchar(255), address varchar(255), course varchar(255),
 institution_id varchar(36), department varchar(255), cnpj varchar(255), phone varchar(255), description text,
 constraint uk_accounts_login unique (login), constraint uk_accounts_email unique (email), constraint ck_accounts_balance check (balance >= 0)
) engine=InnoDB default character set=utf8mb4;
create table advantages (
 id varchar(36) not null primary key, company_id varchar(36) not null, name varchar(180) not null, description text not null,
 photo varchar(500) not null, category varchar(20) not null, cost bigint not null, active boolean not null,
 constraint fk_advantages_company foreign key (company_id) references accounts(id), constraint ck_advantages_cost check (cost > 0)
) engine=InnoDB default character set=utf8mb4;
create table ledger_entries (
 id varchar(36) not null primary key, account_id varchar(36) not null, date datetime(6) not null, kind varchar(20) not null,
 amount bigint not null, description varchar(255) not null, counterpart varchar(180), reason varchar(500),
 constraint fk_ledger_account foreign key (account_id) references accounts(id)
) engine=InnoDB default character set=utf8mb4;
create table coupons (
 id varchar(36) not null primary key, advantage_id varchar(36) not null, student_id varchar(36) not null, company_id varchar(36) not null,
 code varchar(64) not null, student_name varchar(180) not null, company_name varchar(180) not null, advantage_name varchar(180) not null,
 cost bigint not null, date datetime(6) not null, status varchar(12) not null, used_at datetime(6),
 constraint uk_coupons_code unique (code), constraint fk_coupons_advantage foreign key (advantage_id) references advantages(id),
 constraint fk_coupons_student foreign key (student_id) references accounts(id), constraint fk_coupons_company foreign key (company_id) references accounts(id)
) engine=InnoDB default character set=utf8mb4;
create table notifications (
 id varchar(36) not null primary key, account_id varchar(36) not null, subject varchar(255) not null, body text not null,
 date datetime(6) not null, recipient varchar(180) not null, delivery_status varchar(12) not null, attempts int not null,
 constraint fk_notifications_account foreign key (account_id) references accounts(id)
) engine=InnoDB default character set=utf8mb4;
create index idx_ledger_account_date on ledger_entries(account_id, date);
create index idx_advantages_company on advantages(company_id);
create index idx_advantages_active on advantages(active);
create index idx_coupons_student_date on coupons(student_id, date);
create index idx_coupons_company_date on coupons(company_id, date);
create index idx_notifications_account_date on notifications(account_id, date);