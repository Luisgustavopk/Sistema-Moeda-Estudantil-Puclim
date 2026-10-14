package br.pucminas.puclim.support;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "puclim.mail.retry-delay-ms=3600000", "spring.mail.port=1" })
@Import(SessionTestConfiguration.class)
public abstract class AbstractDatabaseTest {
    @Autowired
    private Environment environment;
    protected TestDataFactory data;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("TEST_DB_URL"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("TEST_DB_USER", "puclim"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("TEST_DB_PASSWORD", ""));
        registry.add("puclim.images.directory", () -> System.getProperty("java.io.tmpdir") + "/puclim-test-images");
    }

    @BeforeEach
    void prepareFactory() {
        data = new TestDataFactory("http://127.0.0.1:" + environment.getProperty("local.server.port") + "/api");
    }
}
