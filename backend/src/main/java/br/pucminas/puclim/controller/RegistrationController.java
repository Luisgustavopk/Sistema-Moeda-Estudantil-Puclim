package br.pucminas.puclim.controller;
import br.pucminas.puclim.entity.*; import br.pucminas.puclim.service.PuclimService; import jakarta.servlet.http.HttpSession; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController public class RegistrationController {
 private final PuclimService service; public RegistrationController(PuclimService service){this.service=service;}
 @PostMapping("/api/alunos") public Map<String,Object> student(@RequestBody Map<String,Object>b,HttpSession s){Account a=service.register(b,Account.Role.ALUNO);s.setAttribute("puclim.account",a.id);return service.account(a);}
 @PostMapping("/api/empresas") public Map<String,Object> partner(@RequestBody Map<String,Object>b,HttpSession s){Account a=service.register(b,Account.Role.EMPRESA);s.setAttribute("puclim.account",a.id);return service.account(a);}
 @GetMapping("/api/instituicoes") public List<?> institutions(){return service.institutions().stream().map(a->Map.of("id",a.id,"name",a.name)).toList();}
 @PatchMapping("/api/conta/perfil") public Map<String,Object> profile(@RequestBody Map<String,Object>b,HttpSession s){return service.account(service.updateProfile(s,b));}
 @GetMapping("/api/instituicao/professores") public List<?> teachers(HttpSession s){return service.teachers(s).stream().map(a->Map.of("id",a.id,"name",a.name,"login",a.login,"department",Objects.toString(a.department,""),"email",a.email)).toList();}
}