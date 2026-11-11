#!/usr/bin/env python3
"""Selected Puclim checks with private logs and concise, truthful summaries."""

import argparse
import fnmatch
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def environment():
    env = os.environ.copy()
    # Non-interactive IDE shells may not initialize nvm. Never install tools.
    if not shutil.which("node", path=env.get("PATH")):
        nvm = Path(env.get("NVM_DIR", str(Path.home() / ".nvm")))
        versions = list((nvm / "versions/node").glob("v24.*/bin"))
        if versions:
            latest = max(versions, key=lambda p: tuple(map(int, p.parent.name[1:].split("."))))
            env["PATH"] = str(latest) + os.pathsep + env.get("PATH", "")
    return env


def executable(name, env):
    if name == "java" and env.get("JAVA_HOME"):
        java = Path(env["JAVA_HOME"]) / "bin" / ("java.exe" if os.name == "nt" else "java")
        if java.is_file():
            return str(java)
    return shutil.which(name, path=env.get("PATH"))


def tool_version(name, env):
    tool = executable(name, env)
    if not tool:
        raise ValueError(f"{name} não encontrado. Ative a ferramenta no ambiente.")
    result = subprocess.run([tool, "-version" if name == "java" else "--version"],
                            env=env, capture_output=True, text=True, check=False)
    text = result.stdout + result.stderr
    match = re.search(r'(?:version\s+"?|^v?)(\d+)(?:\.\d+)*', text, re.MULTILINE)
    if result.returncode or not match:
        raise ValueError(f"Não foi possível consultar a versão de {name}.")
    major = int(match[1])
    if name == "node" and major != 24:
        raise ValueError(f"Node {major} ativo; use Node 24.")
    if name == "java" and major < 25:
        raise ValueError(f"Java {major} ativo; use JDK 25 ou superior (alvo 25).")
    return major


def require_frontend(env):
    tool_version("node", env)
    npm = executable("npm", env)
    if not npm:
        raise ValueError("npm não encontrado.")
    if not (ROOT / "frontend/node_modules/.bin/vite").exists():
        raise ValueError("Dependências ausentes. Execute npm --prefix frontend ci.")
    return npm


def require_database(selector, env):
    sources = list((ROOT / "backend/src/test/java").rglob("*Test.java"))
    selected = set()
    for part in selector.split(","):
        pattern = part.split("#", 1)[0].strip()
        if not pattern or pattern.startswith(("!", "%regex")):
            raise ValueError("Use classes, curingas simples e/ou Classe#metodo em --tests.")
        matches = {p for p in sources if fnmatch.fnmatchcase(p.stem, pattern)
                   or fnmatch.fnmatchcase(p.as_posix().split("/src/test/java/", 1)[1][:-5].replace("/", "."), pattern)}
        if not matches:
            raise ValueError(f"Nenhuma classe de teste encontrada para {pattern}.")
        selected.update(matches)
    if any("unit" not in p.relative_to(ROOT / "backend/src/test/java").parts for p in selected):
        missing = [key for key in ("TEST_DB_URL", "TEST_DB_USER", "TEST_DB_PASSWORD") if not env.get(key)]
        if missing:
            raise ValueError("Integração/persistência exige banco dedicado: defina " + ", ".join(missing) + ".")


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return str(sock.getsockname()[1])


def plan(args, env, output):
    if args.command == "frontend":
        npm = require_frontend(env)
        return [(f"frontend-{task}", [npm, "run", task], ROOT / "frontend") for task in ("build", "lint")]
    if args.command == "backend":
        tool_version("java", env)
        require_database(args.tests, env)
        wrapper = [str(ROOT / "backend/mvnw.cmd")] if os.name == "nt" else ["sh", "./mvnw"]
        return [("backend", wrapper + ["-B", "-ntp", f"-Dpuclim.build.directory={output / 'backend-build'}",
                                      "test", f"-Dtest={args.tests}"], ROOT / "backend")]
    if args.command == "e2e":
        npm = require_frontend(env)
        if not args.spec.endswith(".spec.ts") or not (ROOT / "frontend/tests" / args.spec).is_file():
            raise ValueError("Selecione um arquivo existente em frontend/tests, como history-pagination.spec.ts.")
        if args.live and not env.get("LIVE_API_TARGET"):
            raise ValueError("Live exige LIVE_API_TARGET explícito para API em banco dedicado.")
        keys = ("PLAYWRIGHT_LIVE_PORT",) if args.live else ("PLAYWRIGHT_DEMO_PORT", "PLAYWRIGHT_API_PORT")
        used = set()
        for key in keys:
            port = env.get(key) or free_port()
            while port in used and not env.get(key):
                port = free_port()
            env[key] = port
            used.add(port)
        command = [npm, "run", "test:e2e:live" if args.live else "test:e2e", "--", args.spec,
                   f"--output={output / 'browser-artifacts'}", "--reporter=list,json"]
        env["PLAYWRIGHT_JSON_OUTPUT_FILE"] = str(output / "playwright.json")
        if not args.live:
            command += ["--project", args.project]
        if args.grep:
            command += ["--grep", args.grep]
        return [("e2e", command, ROOT / "frontend")]
    raise ValueError("Comando desconhecido.")


def java_summary(folder):
    totals = dict(tests=0, failures=0, errors=0, skipped=0)
    for file in folder.glob("TEST-*.xml"):
        suite = ET.parse(file).getroot()
        for key in totals:
            totals[key] += int(suite.get(key, "0"))
    return totals


def run_step(label, command, cwd, env, output):
    log = output / f"{label}.log"
    started = time.monotonic()
    with log.open("w", encoding="utf-8") as stream:
        try:
            result = subprocess.run(command, cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT)
            code = result.returncode
        except OSError as error:
            stream.write(str(error))
            code = 1
    elapsed = round(time.monotonic() - started, 1)
    print(f"{'OK' if code == 0 else 'FALHOU'} {label} ({elapsed}s) — log: {log}", flush=True)
    return dict(step=label, exit_code=code, seconds=elapsed, log=str(log))


def doctor(env):
    failed = False
    for name in ("node", "java"):
        try:
            print(f"OK {name}: versão principal {tool_version(name, env)}")
        except ValueError as error:
            print(f"FALHOU {error}")
            failed = True
    dependencies = (ROOT / "frontend/node_modules/.bin/vite").exists()
    print("Frontend: " + ("dependências instaladas" if dependencies else "execute npm --prefix frontend ci"))
    database = all(env.get(key) for key in ("TEST_DB_URL", "TEST_DB_USER", "TEST_DB_PASSWORD"))
    print("Banco de teste: " + ("variáveis definidas; confirme que a base é dedicada" if database else "não configurado (opcional para unitários)"))
    print("Não inicia serviços, instala dependências ou imprime credenciais.")
    return int(failed or not dependencies or not executable("npm", env))


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    sub = result.add_subparsers(dest="command", required=True)
    sub.add_parser("doctor", help="Conferir ferramentas sem iniciar serviços")
    for name, description in (("frontend", "Build e lint"), ("backend", "Testes Java selecionados"),
                              ("e2e", "Arquivo Playwright selecionado")):
        command = sub.add_parser(name, help=description)
        command.add_argument("--dry-run", action="store_true", help="Mostrar comandos sem executar")
        if name == "backend":
            command.add_argument("--tests", required=True, help="ClasseTest[,OutraTest] ou Classe#metodo")
        if name == "e2e":
            command.add_argument("spec")
            command.add_argument("--project", choices=("api", "demo"), default="api")
            command.add_argument("--grep")
            command.add_argument("--live", action="store_true", help="API de teste já iniciada; exige LIVE_API_TARGET")
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    env = environment()
    if args.command == "doctor":
        return doctor(env)
    # Logs may contain application/test data; do not print their contents automatically.
    os.umask(0o077)
    cache = ROOT / ".cache/checks"
    cache.mkdir(parents=True, exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix=time.strftime("%Y%m%d-%H%M%S-"), dir=cache))
    try:
        steps = plan(args, env, output)
    except ValueError as error:
        output.rmdir()
        print(f"FALHOU {error}", file=sys.stderr)
        return 2
    if args.dry_run:
        for label, command, cwd in steps:
            print(json.dumps(dict(step=label, cwd=str(cwd), argv=command), ensure_ascii=False))
        output.rmdir()
        return 0
    results = [run_step(*step, env, output) for step in steps]
    failed = any(row["exit_code"] != 0 for row in results)
    report = dict(command=args.command, results=results)
    if args.command == "backend":
        try:
            totals = java_summary(output / "backend-build/surefire-reports")
            executed = totals["tests"] - totals["skipped"]
            print(f"Java: {executed} executados; {totals['skipped']} ignorados; "
                  f"{totals['failures'] + totals['errors']} falhas/erros.")
            report["java"] = totals
            failed |= executed == 0 or totals["failures"] + totals["errors"] > 0
        except (ET.ParseError, OSError, ValueError):
            print("FALHOU: não foi possível ler os relatórios Java.")
            failed = True
    if args.command == "e2e":
        try:
            stats = json.loads((output / "playwright.json").read_text(encoding="utf-8"))["stats"]
            report["browser"] = {key: stats[key] for key in ("expected", "unexpected", "flaky", "skipped")}
            print(f"Navegador: {stats['expected']} aprovados; {stats['unexpected']} falhas; "
                  f"{stats['flaky']} instáveis; {stats['skipped']} ignorados.")
            failed |= stats["expected"] + stats["flaky"] == 0 or stats["unexpected"] > 0
        except (OSError, ValueError, KeyError, TypeError):
            print("FALHOU: não foi possível ler o relatório do navegador.")
            failed = True
    report["success"] = not failed
    (output / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Resumo: {output / 'summary.json'}")
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
