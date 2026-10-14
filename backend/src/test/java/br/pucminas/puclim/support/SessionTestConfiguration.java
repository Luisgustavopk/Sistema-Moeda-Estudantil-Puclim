package br.pucminas.puclim.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;

@TestConfiguration
public class SessionTestConfiguration {
    @Bean
    TestSessionRegistry testSessions() {
        return new TestSessionRegistry();
    }

    @Bean
    ServletListenerRegistrationBean<TestSessionRegistry> sessionListener(TestSessionRegistry registry) {
        return new ServletListenerRegistrationBean<>(registry);
    }
}
