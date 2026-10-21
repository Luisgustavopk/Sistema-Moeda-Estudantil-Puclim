#!/usr/bin/env python3
"""Prepara a apresentação pela API real, sem apagar dados ou alterar saldos por SQL."""

import argparse
import http.cookiejar
import json
from pathlib import Path
from datetime import date, datetime, time, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener
from uuid import NAMESPACE_URL, uuid4, uuid5
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
PASSWORD = "Puclim@2026"


class ApiError(RuntimeError):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


class Client:
    def __init__(self, base):
        self.base = base
        self.cookies = http.cookiejar.CookieJar()
        self.http = build_opener(HTTPCookieProcessor(self.cookies))

    def call(self, method, path, payload=None, key=None, content_type=None):
        headers = {"Accept": "application/json"}
        if method != "GET":
            self.call("GET", "/auth/csrf")
            token = next(cookie.value for cookie in self.cookies if cookie.name == "XSRF-TOKEN")
            headers["X-XSRF-TOKEN"] = unquote(token)
        if key:
            headers["Idempotency-Key"] = str(uuid5(NAMESPACE_URL, "puclim-demo-v1/" + key))
        if isinstance(payload, bytes):
            body = payload
            headers["Content-Type"] = content_type
        elif payload is not None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            body = None
        request = Request(self.base + path, data=body, headers=headers, method=method)
        try:
            with self.http.open(request, timeout=30) as response:
                content = response.read()
                return json.loads(content) if content else None
        except HTTPError as error:
            try:
                message = json.loads(error.read()).get("message", str(error.code))
            except (ValueError, AttributeError):
                message = str(error.code)
            raise ApiError(error.code, f"{method} {path}: {message}") from None

    def login(self, login, password=PASSWORD):
        return self.call("POST", "/auth/login", {"login": login, "password": password})

    def upload(self, image):
        boundary = "PuclimDemo" + uuid4().hex
        payload = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{image.name}"\r\n'
            "Content-Type: image/jpeg\r\n\r\n"
        ).encode() + image.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        return self.call("POST", "/uploads/imagens", payload,
                         content_type=f"multipart/form-data; boundary={boundary}")["url"]


def document(base, cnpj=False):
    digits = [int(char) for char in base]
    for _ in range(2):
        if cnpj:
            weights = list(range(2, 10)) * 2
            total = sum(digit * weight for digit, weight in zip(reversed(digits), weights))
            remainder = total % 11
            digits.append(0 if remainder < 2 else 11 - remainder)
        else:
            total = sum(digit * (len(digits) + 1 - i) for i, digit in enumerate(digits))
            digits.append(((total * 10) % 11) % 10)
    return "".join(map(str, digits))


class Demo:
    def __init__(self, base):
        self.base = base
        self.accounts = {}
        self.clients = {}
        self.summary = {"api": base, "accounts": [], "transfers": [], "coupons": []}

    def existing(self, login):
        client = Client(self.base)
        try:
            account = client.login(login)
        except ApiError as error:
            if error.status != 401:
                raise
            return None
        return self.remember(login, account, client)

    def remember(self, login, account, client):
        self.accounts[login] = account
        self.clients[login] = client
        return account

    def partner(self, login, name, kind, number):
        account = self.existing(login)
        if account:
            if account["partnerKind"] != kind:
                raise RuntimeError(f"{login}: tipo de conta diferente do esperado.")
            return account
        client = Client(self.base)
        client.call("POST", "/empresas", {
            "name": name, "login": login, "email": login + "@puclim.example", "password": PASSWORD,
            "cnpj": document(str(731690000000 + number), True), "phone": "31999990000",
            "description": "Organização fictícia para apresentação do Puclim.", "partnerKind": kind,
        })
        return self.remember(login, client.login(login), client)

    def teacher(self, login, name, department, number):
        account = self.existing(login)
        if account:
            self.check_institution(account)
            return account
        institution = self.clients["instituicao.demo"]
        result = institution.call("POST", "/instituicao/professores/importar", {"rows": [{
            "line": 1, "name": name, "login": login, "email": login + "@puclim.example",
            "department": department, "cpf": document(str(731690100 + number)),
        }]})
        if result["created"] != 1:
            raise RuntimeError(f"{login}: " + "; ".join(row["message"] for row in result["errors"]))
        temporary = result["access"][0]["temporaryPassword"]
        client = Client(self.base)
        client.login(login, temporary)
        client.call("PATCH", "/conta/senha", {"currentPassword": temporary, "password": PASSWORD})
        return self.remember(login, client.call("GET", "/auth/session"), client)

    def check_institution(self, account):
        if account.get("institutionId") != self.accounts["instituicao.demo"]["id"]:
            raise RuntimeError(f"{account['login']}: instituição diferente da base de demonstração.")

    def student(self, login, name, course, number):
        account = self.existing(login)
        if account:
            self.check_institution(account)
            return account
        client = Client(self.base)
        client.call("POST", "/alunos", {
            "name": name, "login": login, "email": login + "@puclim.example", "password": PASSWORD,
            "cpf": document(str(731690100 + number)), "address": f"Rua da Demonstração, {number}, Belo Horizonte",
            "course": course, "institutionId": self.accounts["instituicao.demo"]["id"],
        })
        return self.remember(login, client.login(login), client)

    def recognition(self, teacher, student, amount, reason, label):
        self.clients[teacher].call("POST", "/transferencias", {
            "studentId": self.accounts[student]["id"], "amount": amount, "reason": reason,
        }, key="recognition/" + label)

    def group(self, teacher, students):
        client = self.clients[teacher]
        board = client.call("GET", "/transferencias-alunos")
        criteria = board["groups"][0]["criteria"]
        if not criteria:
            criteria = ("Transferências devem reconhecer colaboração em atividades da disciplina. "
                        "Informe a contribuição do colega e uma quantidade proporcional. "
                        "Os dois alunos devem estar vinculados a este professor; a aprovação depende de saldo disponível.")
            client.call("PUT", "/transferencias-alunos/criterios", {"criteria": criteria})
        for student in students:
            client.call("PUT", "/transferencias-alunos/vinculos/" + self.accounts[student]["id"])
        return criteria

    def peer(self, sender, recipient, amount, reason, criteria, label, approve=None):
        client = self.clients[sender]
        rows = client.call("GET", "/transferencias-alunos")["requests"]
        request = next((row for row in rows if row["senderId"] == self.accounts[sender]["id"]
                        and row["recipientId"] == self.accounts[recipient]["id"] and row["reason"] == reason), None)
        if request is None:
            request = client.call("POST", "/transferencias-alunos", {
                "teacherId": self.accounts["professor.demo"]["id"], "recipientId": self.accounts[recipient]["id"],
                "amount": amount, "reason": reason, "criteria": criteria,
            }, key="peer/" + label)
        if approve is not None and request["status"] == "PENDENTE":
            feedback = ("A colaboração foi comprovada e atende aos critérios da disciplina." if approve
                        else "Descreva uma contribuição acadêmica concreta. O motivo informado ainda não atende aos critérios.")
            request = self.clients["professor.demo"].call("POST", f"/transferencias-alunos/{request['id']}/analise",
                                                          {"approve": approve, "feedback": feedback})
        self.summary["transfers"].append(request)

    def advantage(self, company, name, cost, image, category, description):
        client = self.clients[company]
        own = client.call("GET", "/vantagens?minhas=true")
        old = next((row for row in own if row["name"] == name), None)
        if old:
            return old
        photo = client.upload(ROOT / "frontend/public/images" / image)
        return client.call("POST", "/vantagens", {"name": name, "cost": cost, "photo": photo,
                           "category": category, "description": description, "active": True})

    def coupon(self, student, advantage, label):
        return self.clients[student].call("POST", f"/vantagens/{advantage['id']}/resgates", {}, key="coupon/" + label)

    def mission(self, teacher, title, reward, capacity, deadline, description, label):
        client = self.clients[teacher]
        existing = next((row for row in client.call("GET", "/gamificacao/missoes") if row["title"] == title), None)
        return existing or client.call("POST", "/gamificacao/missoes", {
            "title": title, "description": description, "reward": reward, "capacity": capacity, "deadline": deadline,
        }, key="mission/" + label)

    def participation(self, student, teacher, mission, delivery=None, approve=None):
        client = self.clients[student]
        own = next(row for row in client.call("GET", "/gamificacao/missoes") if row["id"] == mission["id"])
        if not own["participants"]:
            own = client.call("POST", f"/gamificacao/missoes/{mission['id']}/aceitar")
        part = own["participants"][0]
        if delivery and part["status"] == "EM_ANDAMENTO":
            own = client.call("POST", f"/gamificacao/participacoes/{part['id']}/entregar", {"text": delivery})
            part = own["participants"][0]
        if approve is not None and part["status"] == "AGUARDANDO_APROVACAO":
            action = "aprovar" if approve else "devolver"
            feedback = "Entrega completa, bem organizada e alinhada à atividade." if approve else "Inclua exemplos de colaboração e envie novamente."
            self.clients[teacher].call("POST", f"/gamificacao/participacoes/{part['id']}/{action}", {"text": feedback})

    def questions_and_quizzes(self):
        client = self.clients["professor.demo"]
        questions = [
            ("Qual prática ajuda a manter o código em equipe?", ["Revisar alterações antes de integrar", "Compartilhar senhas pessoais"]),
            ("Qual é o papel de uma chave estrangeira?", ["Relacionar registros entre tabelas", "Criptografar uma senha"]),
            ("O que uma transação atômica garante?", ["Todas as etapas são confirmadas juntas ou desfeitas", "Cada etapa é confirmada isoladamente"]),
            ("Quando uma transferência entre alunos altera o saldo?", ["Após a aprovação do professor", "Assim que o pedido é enviado"]),
            ("Qual atitude demonstra colaboração acadêmica?", ["Ajudar um colega a compreender a atividade", "Entregar o trabalho de outra pessoa como próprio"]),
        ]
        existing = {row["prompt"]: row for row in client.call("GET", "/gamificacao/perguntas")}
        for prompt, options in questions:
            if prompt not in existing:
                existing[prompt] = client.call("POST", "/gamificacao/perguntas", {
                    "prompt": prompt, "area": "Colaboração e tecnologia", "options": options,
                    "correctIndex": 0, "active": True,
                })
        for student, perfect in [("ana.demo", True), ("bruno.demo", False)]:
            learner = self.clients[student]
            if learner.call("GET", "/gamificacao/quizzes")["today"] is not None:
                continue
            quiz = learner.call("POST", "/gamificacao/quizzes/hoje")
            if any(item["prompt"] not in existing for item in quiz["items"]):
                continue
            answers = [existing[item["prompt"]]["correctIndex"] for item in quiz["items"]]
            if not perfect:
                answers[0] = (answers[0] + 1) % len(quiz["items"][0]["options"])
            learner.call("POST", f"/gamificacao/quizzes/{quiz['id']}/respostas", {"answers": answers})

    def seed(self):
        print("1/6 Preparando as 11 contas fictícias...", flush=True)
        self.partner("instituicao.demo", "Instituto Puclim — Demonstração", "ENSINO", 1)
        self.partner("cantina.demo", "Cantina Sabor do Campus", "EMPRESA", 2)
        self.partner("papelaria.demo", "Papelaria Ideias no Papel", "EMPRESA", 3)
        self.partner("ong.demo", "Instituto Aprender Juntos", "BENEFICIARIA", 4)
        self.teacher("professor.demo", "Marcos Oliveira", "Computação", 1)
        self.teacher("professora.demo", "Juliana Costa", "Ciências Exatas", 2)
        for number, (login, name, course) in enumerate([
            ("ana.demo", "Ana Souza", "Engenharia de Software"),
            ("bruno.demo", "Bruno Lima", "Engenharia de Software"),
            ("carla.demo", "Carla Mendes", "Sistemas de Informação"),
            ("diego.demo", "Diego Alves", "Sistemas de Informação"),
            ("elisa.demo", "Elisa Santos", "Engenharia de Software"),
        ], start=10):
            self.student(login, name, course, number)

        print("2/6 Vinculando alunos e preparando saldos pelo extrato...", flush=True)
        criteria = self.group("professor.demo", ["ana.demo", "bruno.demo", "carla.demo", "diego.demo"])
        self.group("professora.demo", ["carla.demo", "diego.demo", "elisa.demo"])
        institution = self.clients["instituicao.demo"]
        context = institution.call("GET", "/gamificacao/contexto")
        semester = context["semester"]
        if institution.call("GET", f"/gamificacao/fundo/{semester}")["allocation"] == 0:
            institution.call("POST", f"/gamificacao/fundo/{semester}/dotacao", {
                "amount": 1000, "origin": "Dotação fictícia para apresentação local do sistema Puclim.",
            })
        for student, amount, reason in [
            ("ana.demo", 220, "Excelente organização e apresentação do projeto em equipe."),
            ("bruno.demo", 150, "Colaboração na implementação das funcionalidades do sistema."),
            ("carla.demo", 100, "Qualidade na documentação dos requisitos e casos de uso."),
            ("diego.demo", 80, "Participação e apoio aos colegas durante o laboratório."),
        ]:
            self.recognition("professor.demo", student, amount, reason, "marcos/" + student)
        for student, amount in [("carla.demo", 120), ("diego.demo", 80), ("elisa.demo", 40)]:
            self.recognition("professora.demo", student, amount, "Dedicação nas atividades de raciocínio lógico.", "juliana/" + student)

        print("3/6 Cadastrando catálogo, resgates e doação...", flush=True)
        coffee = self.advantage("cantina.demo", "Café com pão de queijo", 30, "coffee.jpg", "Alimentação",
                                "Uma pausa no campus: café e pão de queijo mediante apresentação do cupom.")
        self.advantage("cantina.demo", "Almoço do estudante", 90, "lunch.jpg", "Alimentação",
                       "Refeição individual na cantina, com prato do dia e acompanhamento.")
        kit = self.advantage("papelaria.demo", "Kit de estudos", 80, "stationery.jpg", "Material",
                            "Kit com caderno, canetas e marcadores para organizar os estudos.")
        notebook = self.advantage("papelaria.demo", "Caderno universitário", 50, "books.jpg", "Material",
                                 "Caderno para as atividades do semestre ou doação para uma instituição beneficiária.")
        self.coupon("ana.demo", coffee, "ana-cafe")
        used = self.coupon("bruno.demo", kit, "bruno-kit")
        if used["status"] == "VALIDO":
            self.clients["papelaria.demo"].call("POST", f"/cupons/{used['code']}/utilizar")
        donated = self.coupon("carla.demo", notebook, "carla-caderno")
        if donated["status"] in ("VALIDO", "DOADO"):
            self.clients["carla.demo"].call("POST", f"/gamificacao/cupons/{donated['code']}/doar",
                                          {"beneficiaryId": self.accounts["ong.demo"]["id"]})

        print("4/6 Preparando quiz, bônus e missões em diferentes estados...", flush=True)
        self.questions_and_quizzes()
        self.recognition("professor.demo", "ana.demo", 20, "Reconhecimento pela revisão dos testes do projeto.", "ana-quiz-bonus")
        deadline = datetime.combine(date.fromisoformat(context["today"]) + timedelta(days=30), time(18),
                                    tzinfo=ZoneInfo("America/Sao_Paulo")).isoformat()
        project = self.mission("professor.demo", "Documentar o fluxo de transferências", 60, 3, deadline,
                               "Produza um diagrama e explique como solicitação, critérios e aprovação protegem o saldo dos alunos.", "documentacao")
        self.participation("ana.demo", "professor.demo", project,
                           "Diagrama de sequência e descrição das validações de saldo e vínculo concluídos.", True)
        self.participation("bruno.demo", "professor.demo", project,
                           "Enviei o diagrama do fluxo e exemplos de aprovação e rejeição para análise.")
        self.participation("carla.demo", "professor.demo", project)
        self.mission("professor.demo", "Revisar a acessibilidade das telas", 40, 2, deadline,
                     "Teste navegação por teclado, rótulos dos formulários e apresentação em celular. Relate as melhorias encontradas.", "acessibilidade")
        teamwork = self.mission("professora.demo", "Boas práticas de trabalho em equipe", 30, 3, deadline,
                                "Descreva três situações de colaboração acadêmica e como reconhecer as contribuições dos colegas.", "colaboracao")
        self.participation("diego.demo", "professora.demo", teamwork,
                           "Minha primeira proposta de boas práticas para as atividades em grupo.", False)

        print("5/6 Criando transferências pendente, aprovada e rejeitada...", flush=True)
        self.peer("ana.demo", "bruno.demo", 40, "Ajuda na preparação da apresentação do projeto.", criteria, "pendente")
        self.peer("bruno.demo", "carla.demo", 25, "Apoio na revisão do diagrama de classes.", criteria, "aprovada", True)
        self.peer("carla.demo", "diego.demo", 30, "Pedido sem descrição suficiente da contribuição acadêmica.", criteria, "rejeitada", False)

        print("6/6 Conferindo contas e conciliação dos saldos...", flush=True)
        for login, client in self.clients.items():
            account = client.call("GET", "/auth/session")
            if account["role"] != "EMPRESA":
                entries = client.call("GET", "/conta/extrato")
                if sum(row["amount"] for row in entries) != account["balance"]:
                    raise RuntimeError(f"{login}: saldo não conciliado com o extrato.")
            self.summary["accounts"].append({key: account.get(key) for key in
                                            ["id", "name", "login", "role", "partnerKind", "balance"]})
            if account["role"] == "ALUNO":
                self.summary["coupons"].extend(client.call("GET", "/cupons"))
        self.summary["fund"] = institution.call("GET", f"/gamificacao/fundo/{semester}")
        cache = ROOT / ".cache"
        cache.mkdir(exist_ok=True)
        (cache / "demo-summary.json").write_text(json.dumps(self.summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("\nBase pronta. Senha das contas fictícias: " + PASSWORD)
        for account in self.summary["accounts"]:
            print(f"  {account['login']:<20} {account['name']:<35} saldo: {account['balance']}")
        print("Resumo salvo em .cache/demo-summary.json. Guia em Artefatos/base-demonstracao.md.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default="http://127.0.0.1:8080/api", help="URL da API local")
    args = parser.parse_args()
    base = args.api.rstrip("/")
    if urlparse(base).hostname not in ("localhost", "127.0.0.1", "::1"):
        parser.error("A base de demonstração deve ser criada em uma API local.")
    try:
        Demo(base).seed()
    except (ApiError, URLError, RuntimeError, OSError) as error:
        parser.exit(1, f"Falha na preparação: {error}\nOs registros existentes foram preservados.\n")


if __name__ == "__main__":
    main()
