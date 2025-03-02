package kz.ai.sarbaz;

import org.springframework.ai.autoconfigure.mistralai.MistralAiAutoConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude = {MistralAiAutoConfiguration.class})
public class AiSarbazApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiSarbazApplication.class, args);
    }

}
