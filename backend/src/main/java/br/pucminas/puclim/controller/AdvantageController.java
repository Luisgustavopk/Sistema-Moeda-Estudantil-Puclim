package br.pucminas.puclim.controller;
import br.pucminas.puclim.entity.*; import br.pucminas.puclim.service.PuclimService; import jakarta.servlet.http.HttpSession; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/vantagens") public class AdvantageController {
 private final PuclimService service; public AdvantageController(PuclimService service){this.service=service;}
 @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="false")boolean minhas,@RequestParam(required=false)String busca,@RequestParam(required=false)String categoria,HttpSession s){Account a=service.current(s);List<Advantage> values=minhas?service.advantages(a):service.advantagesPublic();return values.stream().filter(x->busca==null|| (x.name+" "+x.company.name).toLowerCase(Locale.ROOT).contains(busca.trim().toLowerCase(Locale.ROOT))).filter(x->categoria==null||x.category.equals(categoria)).map(service::advantage).toList();}
 @PostMapping public Map<String,Object> create(@RequestBody Map<String,Object>b,HttpSession s){return service.advantage(service.saveAdvantage(s,b,null));}
 @PutMapping("/{id}") public Map<String,Object> update(@PathVariable String id,@RequestBody Map<String,Object>b,HttpSession s){return service.advantage(service.saveAdvantage(s,b,id));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable String id,HttpSession s){service.deleteAdvantage(s,id);}
}