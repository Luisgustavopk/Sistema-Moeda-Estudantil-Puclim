# Validação do backend

O backend usa MySQL ou MariaDB real, sem H2 ou mocks de banco. Configure `DB_URL`, `DB_USER` e `DB_PASSWORD` para a migration Flyway e execute `mvnw.cmd verify`.

| Cenário | Estado |
| --- | --- |
| Compilação e empacotamento Spring Boot | Validado localmente |
| Migration V1 e `ddl-auto: validate` | Requer banco local |
| Extrato filtrado e CSV | Implementado; requer banco para integração |
| Vantagens, resgate, cupons e notificações | Implementado; requer banco para integração |

Última validação local: 15/10/2026. Docker/MySQL não estavam disponíveis no ambiente da execução, portanto os cenários de persistência e concorrência ainda precisam ser executados com banco real.