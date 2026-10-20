package br.pucminas.puclim.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.dto.request.GamificationRequests;
import br.pucminas.puclim.dto.response.GamificationResponses.Beneficiary;
import br.pucminas.puclim.dto.response.GamificationResponses.Challenge;
import br.pucminas.puclim.dto.response.GamificationResponses.Donation;
import br.pucminas.puclim.dto.response.GamificationResponses.Fund;
import br.pucminas.puclim.dto.response.GamificationResponses.Mission;
import br.pucminas.puclim.dto.response.GamificationResponses.Notice;
import br.pucminas.puclim.dto.response.GamificationResponses.Payment;
import br.pucminas.puclim.dto.response.GamificationResponses.Profile;
import br.pucminas.puclim.dto.response.GamificationResponses.Question;
import br.pucminas.puclim.dto.response.GamificationResponses.Quiz;
import br.pucminas.puclim.dto.response.GamificationResponses.QuizStatus;
import br.pucminas.puclim.dto.response.GamificationResponses.Ranking;
import br.pucminas.puclim.service.AccountService;
import br.pucminas.puclim.service.CommunityService;
import br.pucminas.puclim.service.MissionService;
import br.pucminas.puclim.service.ProgressionService;
import br.pucminas.puclim.service.QuizService;
import br.pucminas.puclim.service.RewardService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/gamificacao")
public class GamificationController {
    private final ProgressionService progression;
    private final QuizService quizzes;
    private final MissionService missions;
    private final RewardService rewards;
    private final CommunityService community;
    private final br.pucminas.puclim.config.GamificationPolicy policy;
    private final AccountService identity;

    public GamificationController(ProgressionService p, QuizService q, MissionService m, RewardService r,
            CommunityService c, br.pucminas.puclim.config.GamificationPolicy policy, AccountService identity) {
        progression = p;
        quizzes = q;
        missions = m;
        rewards = r;
        community = c;
        this.policy = policy;
        this.identity = identity;
    }

    @GetMapping("/contexto")
    public java.util.Map<String,Object> context() {
        identity.current();
        return java.util.Map.of("semester", progression.semester(), "today", progression.today(), "maxAllocation", policy.getMaxAllocation());
    }

    @GetMapping("/perfil")
    public Profile ownProfile() {
        return progression.profile(null);
    }

    @GetMapping("/perfis/{id}")
    public Profile profile(@PathVariable String id) {
        return progression.profile(id);
    }

    @GetMapping("/ranking")
    public Ranking ranking(@RequestParam(required = false) String institution,
            @RequestParam(required = false) String semester, @RequestParam(defaultValue = "MOEDAS") String type,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return progression.ranking(institution, semester == null ? progression.semester() : semester, type, page, size);
    }

    @GetMapping("/notificacoes")
    public List<Notice> notices() {
        return progression.notices();
    }

    @PostMapping("/notificacoes/{id}/ler")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void read(@PathVariable String id) {
        progression.readNotice(id);
    }

    @GetMapping("/perguntas")
    public List<Question> questions() {
        return quizzes.questions();
    }

    @PostMapping("/perguntas")
    public Question createQuestion(@Valid @RequestBody GamificationRequests.Question input) {
        return quizzes.saveQuestion(null, input);
    }

    @PutMapping("/perguntas/{id}")
    public Question editQuestion(@PathVariable String id, @Valid @RequestBody GamificationRequests.Question input) {
        return quizzes.saveQuestion(id, input);
    }

    @DeleteMapping("/perguntas/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void deleteQuestion(@PathVariable String id) {
        quizzes.deleteQuestion(id);
    }

    @GetMapping("/quizzes")
    public QuizStatus quizStatus() {
        return quizzes.status();
    }

    @PostMapping("/quizzes/hoje")
    public Quiz start() {
        return quizzes.start();
    }

    @PostMapping("/quizzes/{id}/respostas")
    public Quiz submit(@PathVariable String id, @Valid @RequestBody GamificationRequests.Answers input) {
        return quizzes.submit(id, input);
    }

    @GetMapping("/missoes")
    public List<Mission> missions() {
        return missions.list();
    }

    @PostMapping("/missoes")
    public Mission createMission(@Valid @RequestBody GamificationRequests.Mission input,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return missions.create(input, key);
    }

    @PostMapping("/missoes/{id}/aceitar")
    public Mission accept(@PathVariable String id) {
        return missions.accept(id);
    }

    @PatchMapping("/missoes/{id}/prazo")
    public Mission deadline(@PathVariable String id, @Valid @RequestBody GamificationRequests.Deadline input) {
        return missions.deadline(id, input);
    }

    @PostMapping("/missoes/{id}/encerrar")
    public Mission closeMission(@PathVariable String id) {
        return missions.closeOwn(id);
    }

    @PostMapping("/participacoes/{id}/entregar")
    public Mission deliver(@PathVariable String id, @Valid @RequestBody GamificationRequests.Text input) {
        return missions.deliver(id, input);
    }

    @PostMapping("/participacoes/{id}/aprovar")
    public Mission approve(@PathVariable String id, @Valid @RequestBody GamificationRequests.Text input) {
        return missions.review(id, true, input);
    }

    @PostMapping("/participacoes/{id}/devolver")
    public Mission returnDelivery(@PathVariable String id, @Valid @RequestBody GamificationRequests.Text input) {
        return missions.review(id, false, input);
    }

    @GetMapping("/recompensas")
    public List<Payment> rewards() {
        return rewards.rewards();
    }

    @GetMapping("/fundo/{semester}")
    public Fund fund(@PathVariable String semester) {
        return rewards.fund(semester);
    }

    @PostMapping("/fundo/{semester}/dotacao")
    public Fund allocate(@PathVariable String semester, @Valid @RequestBody GamificationRequests.Allocation input) {
        return rewards.allocate(semester, input);
    }

    @PostMapping("/fundo/{semester}/reprocessar")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void retry(@PathVariable String semester) {
        rewards.retryOwn(semester);
    }

    @PostMapping("/fundo/{semester}/encerrar")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void closeSemester(@PathVariable String semester) {
        rewards.closeOwn(semester);
    }

    @GetMapping("/beneficiarias")
    public List<Beneficiary> beneficiaries() {
        return community.beneficiaries();
    }

    @PostMapping("/cupons/{code}/doar")
    public Donation donate(@PathVariable String code, @Valid @RequestBody GamificationRequests.Donation input) {
        return community.donate(code, input);
    }

    @GetMapping("/doacoes")
    public List<Donation> donations() {
        return community.donations();
    }

    @GetMapping("/desafios")
    public List<Challenge> challenges() {
        return community.challenges();
    }

    @PostMapping("/desafios")
    public Challenge createChallenge(@Valid @RequestBody GamificationRequests.Challenge input) {
        return community.saveChallenge(null, input);
    }

    @PutMapping("/desafios/{id}")
    public Challenge editChallenge(@PathVariable String id, @Valid @RequestBody GamificationRequests.Challenge input) {
        return community.saveChallenge(id, input);
    }

    @PostMapping("/desafios/{id}/{action}")
    public Challenge challengeAction(@PathVariable String id, @PathVariable String action) {
        return community.challengeState(id, action);
    }
}
