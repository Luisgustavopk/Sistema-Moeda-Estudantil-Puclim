package br.pucminas.puclim.controller;
import br.pucminas.puclim.service.PuclimService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final PuclimService service; public AuthController(PuclimService service){this.service=service;}
    @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,Object> body,HttpSession session){service.login(session,Objects.toString(body.get("login"),""),Objects.toString(body.get("password"),""));return service.account(service.current(session));}
    @PostMapping("/logout") public void logout(HttpSession session){session.invalidate();}
    @GetMapping("/session") public Map<String,Object> session(HttpSession session){return service.account(service.current(session));}
}