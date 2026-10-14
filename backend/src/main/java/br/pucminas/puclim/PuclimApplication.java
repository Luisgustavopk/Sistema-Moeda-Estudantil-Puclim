package br.pucminas.puclim;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PuclimApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(PuclimApplication.class);
        // Variáveis explícitas têm precedência; o padrão segue o SO do processo Java.
        String engine = System.getProperty("os.name", "").toLowerCase(java.util.Locale.ROOT)
                .startsWith("linux") ? "mariadb" : "mysql";
        application.setDefaultProperties(java.util.Map.of("DB_ENGINE", engine));
        application.run(args);
	}

}
